import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import { findInvoiceById, createInvoice, invoiceToResponse } from '@/lib/models/Invoice';
import { handleError, NotFoundError } from '@/lib/errors';

async function postHandler(request: AuthenticatedRequest, context?: { params: Promise<{ id: string }> }) {
    try {
        if (!context?.params) {
            throw new Error('Missing params');
        }
        const { id } = await context.params;
        const originalInvoice = await findInvoiceById(id);
        if (!originalInvoice) {
            throw new NotFoundError('Invoice');
        }

        // Create a duplicate with Draft status
        const duplicate = await createInvoice({
            clientId: originalInvoice.clientId,
            clientName: originalInvoice.clientName,
            clientPhone: originalInvoice.clientPhone,
            items: originalInvoice.items,
            subtotal: originalInvoice.subtotal,
            discountPercentage: originalInvoice.discountPercentage ?? 0,
            discount: originalInvoice.discount,
            total: originalInvoice.total,
            status: 'Draft',
            issueDate: new Date(),
            notes: originalInvoice.notes,
        });

        return NextResponse.json(
            {
                success: true,
                data: invoiceToResponse(duplicate),
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

