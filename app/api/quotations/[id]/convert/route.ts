import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import { findQuotationById } from '@/lib/models/Quotation';
import { createInvoice, invoiceToResponse } from '@/lib/models/Invoice';
import { handleError, NotFoundError } from '@/lib/errors';

async function postHandler(request: AuthenticatedRequest, context?: { params: Promise<{ id: string }> }) {
    try {
        if (!context?.params) {
            throw new Error('Missing params');
        }
        const { id } = await context.params;
        const quotation = await findQuotationById(id);
        if (!quotation) {
            throw new NotFoundError('Quotation');
        }

        // Convert quotation to invoice
        const discountPercentage = quotation.discountPercentage ?? 0;
        const discount = quotation.subtotal > 0 ? quotation.subtotal * discountPercentage / 100 : 0;
        const total = quotation.subtotal - discount;

        const invoice = await createInvoice({
            clientId: quotation.clientId,
            clientName: quotation.clientName,
            clientPhone: quotation.clientPhone,
            items: quotation.items,
            subtotal: quotation.subtotal,
            discountPercentage,
            discount,
            total,
            status: 'Draft',
            issueDate: new Date(),
            notes: quotation.notes,
        });

        return NextResponse.json(
            {
                success: true,
                data: invoiceToResponse(invoice),
                message: 'Invoice created from quotation',
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

