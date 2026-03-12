import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import { findQuotationById, updateQuotation, deleteQuotation, quotationToResponse } from '@/lib/models/Quotation';
import { quotationSchema } from '@/lib/validation';
import { handleError, NotFoundError } from '@/lib/errors';

async function getHandler(request: AuthenticatedRequest, context?: { params: Promise<{ id: string }> }) {
    try {
        if (!context?.params) {
            throw new Error('Missing params');
        }
        const { id } = await context.params;
        const quotation = await findQuotationById(id);
        if (!quotation) {
            throw new NotFoundError('Quotation');
        }

        return NextResponse.json({
            success: true,
            data: quotationToResponse(quotation),
        });
    } catch (error) {
        const { statusCode, message } = handleError(error);
        return NextResponse.json(
            {
                success: false,
                error: message,
            },
            { status: statusCode }
        );
    }
}

async function putHandler(request: AuthenticatedRequest, context?: { params: Promise<{ id: string }> }) {
    try {
        if (!context?.params) {
            throw new Error('Missing params');
        }
        const { id } = await context.params;
        const quotation = await findQuotationById(id);
        if (!quotation) {
            throw new NotFoundError('Quotation');
        }

        const body = await request.json();
        const validatedData = quotationSchema.partial().parse(body);

        // Recalculate amounts if items are updated
        let updates: any = { ...validatedData };
        if (validatedData.items) {
            const items = validatedData.items.map((item: any) => ({
                ...item,
                amount: item.quantity * item.rate,
            }));
            const subtotal = items.reduce((sum: number, item: any) => sum + item.amount, 0);
            const discountPercentage = validatedData.discountPercentage !== undefined ? validatedData.discountPercentage : (quotation.discountPercentage ?? 0);
            const discount = subtotal > 0 ? subtotal * discountPercentage / 100 : 0;
            const total = subtotal - discount;
            updates.items = items;
            updates.subtotal = subtotal;
            updates.discountPercentage = discountPercentage;
            updates.discount = discount;
            updates.total = total;
        }

        if (validatedData.issueDate) {
            updates.issueDate = typeof validatedData.issueDate === 'string' ? new Date(validatedData.issueDate) : validatedData.issueDate;
        }
        if (validatedData.validUntil) {
            updates.validUntil = typeof validatedData.validUntil === 'string' ? new Date(validatedData.validUntil) : validatedData.validUntil;
        }

        const updated = await updateQuotation(id, updates);
        if (!updated) {
            throw new NotFoundError('Quotation');
        }

        return NextResponse.json({
            success: true,
            data: quotationToResponse(updated),
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

async function deleteHandler(request: AuthenticatedRequest, context?: { params: Promise<{ id: string }> }) {
    try {
        if (!context?.params) {
            throw new Error('Missing params');
        }
        const { id } = await context.params;
        const quotation = await findQuotationById(id);
        if (!quotation) {
            throw new NotFoundError('Quotation');
        }

        const deleted = await deleteQuotation(id);
        if (!deleted) {
            throw new NotFoundError('Quotation');
        }

        return NextResponse.json({
            success: true,
            message: 'Quotation deleted successfully',
        });
    } catch (error) {
        const { statusCode, message } = handleError(error);
        return NextResponse.json(
            {
                success: false,
                error: message,
            },
            { status: statusCode }
        );
    }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAuth(putHandler);
export const DELETE = requireAuth(deleteHandler);

