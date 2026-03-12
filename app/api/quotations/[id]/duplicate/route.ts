import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import { findQuotationById, createQuotation, quotationToResponse } from '@/lib/models/Quotation';
import { handleError, NotFoundError } from '@/lib/errors';

async function postHandler(request: AuthenticatedRequest, context?: { params: Promise<{ id: string }> }) {
    try {
        if (!context?.params) {
            throw new Error('Missing params');
        }
        const { id } = await context.params;
        const originalQuotation = await findQuotationById(id);
        if (!originalQuotation) {
            throw new NotFoundError('Quotation');
        }

        // Create a duplicate with Draft status
        const duplicate = await createQuotation({
            clientId: originalQuotation.clientId,
            clientName: originalQuotation.clientName,
            clientPhone: originalQuotation.clientPhone,
            items: originalQuotation.items,
            subtotal: originalQuotation.subtotal,
            discountPercentage: originalQuotation.discountPercentage ?? 0,
            discount: originalQuotation.discount,
            total: originalQuotation.total,
            status: 'Draft',
            issueDate: new Date(),
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            notes: originalQuotation.notes,
        });

        return NextResponse.json(
            {
                success: true,
                data: quotationToResponse(duplicate),
            },
            { status: 201 }
        );
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

export const POST = requireAuth(postHandler);

