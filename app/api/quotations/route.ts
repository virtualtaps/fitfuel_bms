import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import { getQuotationCollection, createQuotation, quotationToResponse } from '@/lib/models/Quotation';
import { quotationSchema, paginationSchema } from '@/lib/validation';
import { handleError } from '@/lib/errors';
import { PaginatedResponse, QuotationResponse } from '@/types/api';

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

        const collection = await getQuotationCollection();
        const query: any = {};

        // Search filter
        if (pagination.search) {
            query.$or = [
                { quotationNumber: { $regex: pagination.search, $options: 'i' } },
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

        const response: PaginatedResponse<QuotationResponse> = {
            data: data.map(quotationToResponse),
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
        const validatedData = quotationSchema.parse(body);

        // Calculate amounts (handle negative quantities for returns)
        const items = validatedData.items.map(item => ({
            ...item,
            amount: Math.abs(item.quantity) * item.rate,
        }));
        const subtotal = items
            .filter(item => item.quantity >= 0)
            .reduce((sum, item) => sum + item.amount, 0);
        const returns = items
            .filter(item => item.quantity < 0)
            .reduce((sum, item) => sum + item.amount, 0);
        const netSubtotal = subtotal - returns;
        const discountPercentage = validatedData.discountPercentage || 0;
        const discount = netSubtotal > 0 ? netSubtotal * discountPercentage / 100 : 0;
        const total = netSubtotal - discount;

        const quotation = await createQuotation({
            ...validatedData,
            items: items, // Use items with calculated amounts but preserve quantity signs
            subtotal: netSubtotal,
            discountPercentage,
            discount,
            total,
            issueDate: typeof validatedData.issueDate === 'string' ? new Date(validatedData.issueDate) : validatedData.issueDate,
            validUntil: typeof validatedData.validUntil === 'string' ? new Date(validatedData.validUntil) : validatedData.validUntil,
        });

        return NextResponse.json(
            {
                success: true,
                data: quotationToResponse(quotation),
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

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);

