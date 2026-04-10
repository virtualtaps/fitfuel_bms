import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import { getInvoiceCollection, createInvoice, invoiceToResponse } from '@/lib/models/Invoice';
import { findProductById, updateProduct } from '@/lib/models/Product';
import { createStockHistory } from '@/lib/models/StockHistory';
import { createClient } from '@/lib/models/Client';
import { invoiceSchema, paginationSchema } from '@/lib/validation';
import { handleError } from '@/lib/errors';
import { PaginatedResponse } from '@/types/api';
import { InvoiceResponse } from '@/lib/models/Invoice';

async function getHandler(request: AuthenticatedRequest) {
    try {
        const { searchParams } = new URL(request.url);

        const pagination = paginationSchema.parse({
            page: searchParams.get('page') ?? undefined,
            limit: searchParams.get('limit') ?? undefined,
            search: searchParams.get('search') ?? undefined,
            sortBy: searchParams.get('sortBy') ?? undefined,
            sortOrder: searchParams.get('sortOrder') ?? undefined,
        });

        let collection;
        try {
            collection = await getInvoiceCollection();
        } catch (dbError) {
            console.error('Database connection error in GET /api/invoices:', dbError);
            throw dbError;
        }
        const query: any = {};

        // Search filter
        if (pagination.search) {
            query.$or = [
                { invoiceNumber: { $regex: pagination.search, $options: 'i' } },
                { clientName: { $regex: pagination.search, $options: 'i' } },
            ];
        }

        // Status filter
        const status = searchParams.get('status');
        if (status && status !== 'All') {
            query.status = status;
        }

        const skip = (pagination.page - 1) * pagination.limit;
        const sortField = pagination.sortBy || 'createdAt';
        const sortOrder = pagination.sortOrder === 'asc' ? 1 : -1;

        const [data, total] = await Promise.all([
            collection
                .find(query)
                .sort({ [sortField]: sortOrder })
                .skip(skip)
                .limit(pagination.limit)
                .toArray(),
            collection.countDocuments(query),
        ]);

        const response: PaginatedResponse<InvoiceResponse> = {
            data: data.map(invoiceToResponse),
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                totalPages: Math.ceil(total / pagination.limit),
            },
        };

        return NextResponse.json({
            success: true,
            data: response,
        });
    } catch (error) {
        console.error('Error in GET /api/invoices:', error);
        const { statusCode, message, errors } = handleError(error);
        return NextResponse.json(
            {
                success: false,
                error: message,
                errors,
            },
            { status: statusCode }
        );
    }
}

async function postHandler(request: AuthenticatedRequest) {
    try {
        const body = await request.json();

        // Check for client data BEFORE normalization (to preserve original values)
        const rawClientName = body.clientName;
        const rawClientPhone = body.clientPhone;
        const rawClientId = body.clientId;

        // Normalize empty strings to undefined and remove undefined values before validation
        const cleanedBody = Object.fromEntries(
            Object.entries(body)
                .map(([key, value]) => [key, value === '' ? undefined : value])
                .filter(([_, value]) => value !== undefined)
        );

        const validatedData = invoiceSchema.parse(cleanedBody);

        // Calculate amounts (preserve productId if present, look up buying price)
        const items = await Promise.all(validatedData.items.map(async item => {
            let buyingPrice = 0;
            if (item.productId) {
                const product = await findProductById(item.productId);
                buyingPrice = product?.buyingPrice ?? 0;
            }
            const itemDiscount = item.discount ?? 0;
            return {
                ...item,
                discount: itemDiscount,
                amount: item.quantity * item.rate - itemDiscount,
                productId: item.productId,
                buyingPrice,
            };
        }));
        const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
        // Calculate discount amount from percentage
        const discountPercentage = validatedData.discountPercentage !== undefined ? validatedData.discountPercentage : 0;
        const discount = subtotal > 0 ? subtotal * discountPercentage / 100 : 0;
        const total = subtotal - discount;

        const invoiceStatus = validatedData.status || 'Draft';

        // Create client if clientId is not provided but clientName or clientPhone is provided
        // Use raw values to check, as they might have been normalized to undefined
        let finalClientId = rawClientId || validatedData.clientId;
        const hasClientName = rawClientName && typeof rawClientName === 'string' && rawClientName.trim().length > 0;
        const hasClientPhone = rawClientPhone && typeof rawClientPhone === 'string' && rawClientPhone.trim().length > 0;

        // Always try to create/update client if we have name or phone, even if clientId exists
        // This ensures clients are created when manually typed (not selected from dropdown)
        if ((hasClientName || hasClientPhone)) {
            try {
                const clientName = hasClientName
                    ? rawClientName.trim()
                    : (hasClientPhone ? rawClientPhone.trim() : 'Customer');
                const clientPhone = hasClientPhone ? rawClientPhone.trim() : undefined;

                const client = await createClient({
                    name: clientName,
                    phone: clientPhone,
                });

                finalClientId = client._id!.toString();
            } catch (clientError) {
                // Continue with invoice creation even if client creation fails
            }
        }

        const invoice = await createInvoice({
            ...validatedData,
            clientId: finalClientId,
            items,
            subtotal,
            discountPercentage,
            discount,
            total,
            issueDate: typeof validatedData.issueDate === 'string' ? new Date(validatedData.issueDate) : validatedData.issueDate,
            status: invoiceStatus,
            createdByName: request.user?.username || request.user?.email,
        });

        // Update inventory stock only if invoice is not a Draft
        if (invoiceStatus !== 'Draft') {
            try {
                await updateInventoryFromInvoice(items, invoice._id!.toString());
            } catch (inventoryError) {
                // Don't fail the invoice creation if inventory update fails
            }
        }

        return NextResponse.json(
            {
                success: true,
                data: invoiceToResponse(invoice),
            },
            { status: 201 }
        );
    } catch (error) {
        const { statusCode, message, errors } = handleError(error);
        return NextResponse.json(
            {
                success: false,
                error: message,
                errors,
            },
            { status: statusCode }
        );
    }
}

// Helper function to update inventory when invoice is created
async function updateInventoryFromInvoice(items: Array<{ quantity: number; productId?: string }>, invoiceId?: string) {
    // Group items by productId to handle multiple quantities of same product
    const productUpdates: { [productId: string]: number } = {};

    for (const item of items) {
        if (item.productId) {
            // Quantity can be negative for returns (which adds stock back)
            // Positive quantity deducts stock
            if (productUpdates[item.productId]) {
                productUpdates[item.productId] += item.quantity;
            } else {
                productUpdates[item.productId] = item.quantity;
            }
        } else {
            console.log('Item missing productId:', item);
        }
    }

    // Update each product's stock
    for (const [productId, quantityChange] of Object.entries(productUpdates)) {
        try {
            const product = await findProductById(productId);
            if (product) {
                const previousStock = product.stock;
                // quantityChange is already negative for returns, positive for sales
                // So we subtract: stock - quantityChange
                // For sales (positive): stock - 5 = stock decreases
                // For returns (negative): stock - (-5) = stock + 5 = stock increases
                const newStock = previousStock - quantityChange;
                const finalStock = newStock < 0 ? 0 : newStock;

                await updateProduct(productId, { stock: finalStock });

                // Log stock history
                const historyType = quantityChange > 0 ? 'sale' : 'return';
                await createStockHistory({
                    productId,
                    type: historyType,
                    quantity: -quantityChange, // Negative for sales, positive for returns
                    previousStock,
                    newStock: finalStock,
                    reference: invoiceId,
                    referenceType: 'invoice',
                    notes: quantityChange > 0
                        ? `Sold ${Math.abs(quantityChange)} units via invoice`
                        : `Returned ${Math.abs(quantityChange)} units via invoice`,
                });
            }
        } catch (error) {
            console.error(`Error updating stock for product ${productId}:`, error);
            // Continue with other products even if one fails
        }
    }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);

