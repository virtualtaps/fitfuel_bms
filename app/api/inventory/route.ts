import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import { getProductCollection, createProduct, productToResponse, ProductResponse } from '@/lib/models/Product';
import { createStockHistory } from '@/lib/models/StockHistory';
import { productSchema, paginationSchema } from '@/lib/validation';
import { handleError } from '@/lib/errors';
import { PaginatedResponse } from '@/types/api';

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

        const collection = await getProductCollection();
        const query: any = {};

        // Search filter - search by name, SKU, and category
        if (pagination.search) {
            query.$or = [
                { name: { $regex: pagination.search, $options: 'i' } },
                { sku: { $regex: pagination.search, $options: 'i' } },
                { category: { $regex: pagination.search, $options: 'i' } },
            ];
        }

        // Category filter
        const category = searchParams.get('category');
        if (category && category !== 'All') {
            query.category = category;
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

        const response: PaginatedResponse<ProductResponse> = {
            data: data.map(productToResponse),
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
        const validatedData = productSchema.parse(body);

        // Convert expiryDate string to Date if provided
        const productData = {
            ...validatedData,
            expiryDate: validatedData.expiryDate 
                ? (typeof validatedData.expiryDate === 'string' 
                    ? new Date(validatedData.expiryDate) 
                    : validatedData.expiryDate)
                : undefined,
        };

        const product = await createProduct(productData);

        // Log initial stock
        if (product.stock > 0) {
            await createStockHistory({
                productId: product._id!.toString(),
                type: 'initial',
                quantity: product.stock,
                previousStock: 0,
                newStock: product.stock,
                referenceType: 'system',
                notes: 'Initial stock on product creation',
            });
        }

        return NextResponse.json(
            {
                success: true,
                data: productToResponse(product),
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

