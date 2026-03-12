import { ObjectId } from 'mongodb';
import { getDatabase } from '../mongodb';
import { QuotationStatus, QuotationItem } from '@/types/models';

export interface QuotationDocument {
    _id?: ObjectId;
    quotationNumber: string;
    clientId?: string;
    clientName: string;
    clientPhone?: string;
    items: QuotationItem[];
    subtotal: number;
    discountPercentage: number;
    discount: number;
    total: number;
    // status field is tracked similarly to invoices so history and filters work correctly
    status: QuotationStatus;
    issueDate: Date;
    validUntil: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface QuotationResponse {
    id: string;
    quotationNumber: string;
    client: string;
    amount: string;
    status: QuotationStatus;
    date: string;
    validUntil: string;
    clientId?: string;
    clientPhone?: string;
    items: QuotationItem[];
    subtotal: number;
    discountPercentage: number;
    discount: number;
    total: number;
    issueDate: Date;
    notes?: string;
}

export function quotationToResponse(quotation: QuotationDocument): QuotationResponse {
    return {
        id: quotation._id!.toString(),
        quotationNumber: quotation.quotationNumber,
        client: quotation.clientName,
        amount: `QAR ${quotation.total.toLocaleString()}`,
        status: quotation.status,
        date: quotation.issueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        validUntil: quotation.validUntil.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        clientId: quotation.clientId,
        clientPhone: quotation.clientPhone,
        items: quotation.items,
        subtotal: quotation.subtotal,
        discountPercentage: quotation.discountPercentage ?? 0,
        discount: quotation.discount,
        total: quotation.total,
        issueDate: quotation.issueDate,
        notes: quotation.notes,
    };
}

export async function getQuotationCollection() {
    const db = await getDatabase();
    return db.collection<QuotationDocument>('quotations');
}

export async function findQuotationById(id: string): Promise<QuotationDocument | null> {
    const collection = await getQuotationCollection();
    return collection.findOne({ _id: new ObjectId(id) });
}

export async function generateQuotationNumber(): Promise<string> {
    const collection = await getQuotationCollection();
    const count = await collection.countDocuments();
    return `QUO-${String(count + 1).padStart(3, '0')}`;
}

export async function createQuotation(quotationData: Omit<QuotationDocument, '_id' | 'quotationNumber' | 'createdAt' | 'updatedAt'>): Promise<QuotationDocument> {
    const collection = await getQuotationCollection();
    const now = new Date();
    const quotationNumber = await generateQuotationNumber();

    const quotation: QuotationDocument = {
        ...quotationData,
        // ensure there is always a status; callers should supply one
        status: quotationData.status || 'Draft',
        quotationNumber,
        createdAt: now,
        updatedAt: now,
    };
    const result = await collection.insertOne(quotation);
    return { ...quotation, _id: result.insertedId };
}

export async function updateQuotation(id: string, updates: Partial<QuotationDocument>): Promise<QuotationDocument | null> {
    const collection = await getQuotationCollection();
    const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: 'after' }
    );
    return result || null;
}

export async function deleteQuotation(id: string): Promise<boolean> {
    const collection = await getQuotationCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
}

