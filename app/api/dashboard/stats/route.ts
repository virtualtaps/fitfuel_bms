import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import { getInvoiceCollection } from '@/lib/models/Invoice';
import { getQuotationCollection } from '@/lib/models/Quotation';
import { getProductCollection } from '@/lib/models/Product';
import { handleError } from '@/lib/errors';
import { DashboardStats } from '@/types/api';

async function getHandler(request: AuthenticatedRequest) {
    try {
        const invoiceCollection = await getInvoiceCollection();
        const quotationCollection = await getQuotationCollection();
        const productCollection = await getProductCollection();

        // Get all invoices
        const invoices = await invoiceCollection.find({}).toArray();
        const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
        const pendingInvoices = invoices.filter(inv => inv.status === 'Pending');
        const overdueInvoices = invoices.filter(inv => inv.status === 'Overdue');

        // Calculate totals
        const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const paidAmount = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.total, 0);

        // Get quotations count
        const totalQuotations = await quotationCollection.countDocuments({});
        const acceptedQuotations = await quotationCollection.countDocuments({ status: 'Accepted' });

        // Get inventory stats
        const products = await productCollection.find({}).toArray();
        const lowStockProducts = products.filter(p => p.status === 'Low Stock' || p.status === 'Out of Stock');

        const stats: DashboardStats = {
            totalRevenue: `QAR ${totalRevenue.toLocaleString()}`,
            totalInvoices: invoices.length,
            totalQuotations: totalQuotations,
            totalInventoryItems: products.length,
            paidAmount: `QAR ${paidAmount.toLocaleString()}`,
            pendingAmount: `QAR ${pendingAmount.toLocaleString()}`,
            overdueAmount: `QAR ${overdueAmount.toLocaleString()}`,
            lowStockCount: lowStockProducts.length,
        };

        return NextResponse.json({
            success: true,
            data: stats,
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

