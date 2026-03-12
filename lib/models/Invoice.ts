import { ObjectId } from 'mongodb';
import { getDatabase } from '../mongodb';
import { InvoiceStatus, InvoiceItem } from '@/types/models';

export interface InvoiceDocument {
    _id?: ObjectId;
    invoiceNumber: string;
    clientId?: string;
    clientName?: string;
    clientPhone?: string;
    items: InvoiceItem[];
    subtotal: number;
    discountPercentage: number;
    discount: number;
    total: number;
    status: InvoiceStatus;
    issueDate: Date;
    notes?: string;
    paymentMethod?: 'cash' | 'card' | 'bank-transfer' | 'Fawran' | 'Pending';
    createdByName?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface InvoiceResponse {
    id: string;
    invoiceNumber: string;
    client: string;
    amount: string;
    status: InvoiceStatus;
    date: string;
    clientId?: string;
    clientPhone?: string;
    items: InvoiceItem[];
    subtotal: number;
    discountPercentage: number;
    discount: number;
    total: number;
    issueDate: Date;
    notes?: string;
    paymentMethod?: 'cash' | 'card' | 'bank-transfer' | 'Fawran' | 'Pending';
    createdByName?: string;
}

export function invoiceToResponse(invoice: InvoiceDocument): InvoiceResponse {
    return {
        id: invoice._id!.toString(),
        invoiceNumber: invoice.invoiceNumber,
        client: invoice.clientName || '',
        amount: `QAR ${invoice.total.toLocaleString()}`,
        status: invoice.status,
        date: invoice.issueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        clientId: invoice.clientId,
        clientPhone: invoice.clientPhone,
        items: invoice.items,
        subtotal: invoice.subtotal,
        discountPercentage: invoice.discountPercentage ?? 0,
        discount: invoice.discount,
        total: invoice.total,
        issueDate: invoice.issueDate,
        notes: invoice.notes,
        paymentMethod: invoice.paymentMethod,
        createdByName: invoice.createdByName,
    };
}

export async function getInvoiceCollection() {
    const db = await getDatabase();
    return db.collection<InvoiceDocument>('invoices');
}

export async function findInvoiceById(id: string): Promise<InvoiceDocument | null> {
    const collection = await getInvoiceCollection();
    return collection.findOne({ _id: new ObjectId(id) });
}

export async function generateInvoiceNumber(): Promise<string> {
    const collection = await getInvoiceCollection();
    const count = await collection.countDocuments();
    return `INV-${String(count + 1).padStart(3, '0')}`;
}

export async function createInvoice(invoiceData: Omit<InvoiceDocument, '_id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>): Promise<InvoiceDocument> {
    const collection = await getInvoiceCollection();
    const now = new Date();
    const invoiceNumber = await generateInvoiceNumber();

    const invoice: InvoiceDocument = {
        ...invoiceData,
        invoiceNumber,
        createdAt: now,
        updatedAt: now,
    };
    const result = await collection.insertOne(invoice);
    return { ...invoice, _id: result.insertedId };
}

export async function updateInvoice(id: string, updates: Partial<InvoiceDocument>): Promise<InvoiceDocument | null> {
    const collection = await getInvoiceCollection();
    const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: 'after' }
    );
    return result || null;
}

export async function deleteInvoice(id: string): Promise<boolean> {
    const collection = await getInvoiceCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
}

