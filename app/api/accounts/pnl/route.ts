import { NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/middleware';
import { getInvoiceCollection } from '@/lib/models/Invoice';
import { getSalaryPaymentCollection } from '@/lib/models/SalaryPayment';
import { handleError, AuthorizationError } from '@/lib/errors';

export type PnLPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface PeriodBucket {
    label: string;
    revenue: number;
    cogs: number;       // cost of goods sold
    expenses: number;   // salary expenses
    net: number;        // revenue - cogs - expenses
    invoiceCount: number;
}

interface PnLResponse {
    period: PnLPeriod;
    summary: {
        totalRevenue: number;
        totalCogs: number;
        totalExpenses: number;
        grossProfit: number;
        netProfit: number;
        invoiceCount: number;
        profitMargin: number; // percentage
    };
    breakdown: PeriodBucket[];
}

function startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function getMonthName(m: number) {
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m];
}

function calcCogs(invoices: any[]): number {
    return invoices.reduce((sum, inv) => {
        const itemCogs = (inv.items || []).reduce((s: number, item: any) =>
            s + (item.buyingPrice ?? 0) * Math.abs(item.quantity), 0);
        return sum + itemCogs;
    }, 0);
}

async function getHandler(request: AuthenticatedRequest) {
    try {
        if (request.user?.role !== 'admin') {
            throw new AuthorizationError('Only admins can view accounts');
        }

        const { searchParams } = new URL(request.url);
        const period = (searchParams.get('period') as PnLPeriod) || 'monthly';

        const now = new Date();
        const invoiceCol = await getInvoiceCollection();
        const salaryCol = await getSalaryPaymentCollection();

        const breakdown: PeriodBucket[] = [];

        if (period === 'daily') {
            // Last 30 days
            for (let i = 29; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(now.getDate() - i);
                const from = startOfDay(d);
                const to = endOfDay(d);

                const label = `${d.getDate()} ${getMonthName(d.getMonth())}`;

                const [invoices, salaries] = await Promise.all([
                    invoiceCol.find({ status: 'Paid', issueDate: { $gte: from, $lte: to } }).toArray(),
                    salaryCol.find({ paymentDate: { $gte: from, $lte: to } }).toArray(),
                ]);

                const revenue = invoices.reduce((s, inv) => s + inv.total, 0);
                const cogs = calcCogs(invoices);
                const expenses = salaries.reduce((s, p) => s + p.amount, 0);
                breakdown.push({ label, revenue, cogs, expenses, net: revenue - cogs - expenses, invoiceCount: invoices.length });
            }
        } else if (period === 'weekly') {
            // Last 12 weeks
            for (let i = 11; i >= 0; i--) {
                const weekEnd = new Date(now);
                weekEnd.setDate(now.getDate() - i * 7);
                const weekStart = new Date(weekEnd);
                weekStart.setDate(weekEnd.getDate() - 6);
                const from = startOfDay(weekStart);
                const to = endOfDay(weekEnd);

                const weekLabel = `${weekStart.getDate()} ${getMonthName(weekStart.getMonth())}`;

                const [invoices, salaries] = await Promise.all([
                    invoiceCol.find({ status: 'Paid', issueDate: { $gte: from, $lte: to } }).toArray(),
                    salaryCol.find({ paymentDate: { $gte: from, $lte: to } }).toArray(),
                ]);

                const revenue = invoices.reduce((s, inv) => s + inv.total, 0);
                const cogs = calcCogs(invoices);
                const expenses = salaries.reduce((s, p) => s + p.amount, 0);
                breakdown.push({ label: weekLabel, revenue, cogs, expenses, net: revenue - cogs - expenses, invoiceCount: invoices.length });
            }
        } else if (period === 'monthly') {
            // Last 12 months
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const from = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
                const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

                const label = `${getMonthName(d.getMonth())} ${d.getFullYear()}`;

                const monthNum = d.getMonth() + 1;
                const yearNum = d.getFullYear();

                const [invoices, salaries] = await Promise.all([
                    invoiceCol.find({ status: 'Paid', issueDate: { $gte: from, $lte: to } }).toArray(),
                    salaryCol.find({ month: monthNum, year: yearNum }).toArray(),
                ]);

                const revenue = invoices.reduce((s, inv) => s + inv.total, 0);
                const cogs = calcCogs(invoices);
                const expenses = salaries.reduce((s, p) => s + p.amount, 0);
                breakdown.push({ label, revenue, cogs, expenses, net: revenue - cogs - expenses, invoiceCount: invoices.length });
            }
        } else if (period === 'yearly') {
            // Last 5 years
            for (let i = 4; i >= 0; i--) {
                const year = now.getFullYear() - i;
                const from = new Date(year, 0, 1, 0, 0, 0, 0);
                const to = new Date(year, 11, 31, 23, 59, 59, 999);

                const [invoices, salaries] = await Promise.all([
                    invoiceCol.find({ status: 'Paid', issueDate: { $gte: from, $lte: to } }).toArray(),
                    salaryCol.find({ year }).toArray(),
                ]);

                const revenue = invoices.reduce((s, inv) => s + inv.total, 0);
                const cogs = calcCogs(invoices);
                const expenses = salaries.reduce((s, p) => s + p.amount, 0);
                breakdown.push({ label: `${year}`, revenue, cogs, expenses, net: revenue - cogs - expenses, invoiceCount: invoices.length });
            }
        }

        // Summary totals across all buckets
        const totalRevenue = breakdown.reduce((s, b) => s + b.revenue, 0);
        const totalCogs = breakdown.reduce((s, b) => s + b.cogs, 0);
        const totalExpenses = breakdown.reduce((s, b) => s + b.expenses, 0);
        const grossProfit = totalRevenue - totalCogs;
        const netProfit = grossProfit - totalExpenses;
        const totalInvoices = breakdown.reduce((s, b) => s + b.invoiceCount, 0);
        const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

        const response: PnLResponse = {
            period,
            summary: {
                totalRevenue,
                totalCogs,
                totalExpenses,
                grossProfit,
                netProfit,
                invoiceCount: totalInvoices,
                profitMargin,
            },
            breakdown,
        };

        return NextResponse.json({ success: true, data: response });
    } catch (error) {
        const { statusCode, message } = handleError(error);
        return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }
}

export const GET = requireAuth(getHandler);
