import { ObjectId } from 'mongodb';
import { getDatabase } from '../mongodb';
import { ProductStatus } from '@/types/models';

export interface ProductDocument {
    _id?: ObjectId;
    name: string;
    arabicName?: string;
    description?: string;
    sku?: string;
    category?: string;
    stock: number;
    minStock?: number;
    sellingPrice: number;
    location?: string;
    supplierName?: string;
    supplierContact?: string;
    expiryDate?: Date;
    status: ProductStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductResponse {
    id: string;
    name: string;
    arabicName?: string;
    description?: string;
    sku?: string;
    category: string;
    stock: number;
    minStock?: number;
    sellingPrice: number;
    location?: string;
    supplierName?: string;
    supplierContact?: string;
    expiryDate?: Date;
    status: ProductStatus;
    price: string; // formatted for display
}

function calculateStatus(stock: number, minStock: number = 15): ProductStatus {
    if (stock === 0) return "Out of Stock";
    if (stock < minStock) return "Low Stock";
    return "In Stock";
}

export function productToResponse(product: ProductDocument): ProductResponse {
    return {
        id: product._id!.toString(),
        name: product.name,
        arabicName: product.arabicName,
        description: product.description,
        sku: product.sku,
        category: product.category || '',
        stock: product.stock,
        minStock: product.minStock,
        sellingPrice: product.sellingPrice,
        location: product.location,
        supplierName: product.supplierName,
        supplierContact: product.supplierContact,
        expiryDate: product.expiryDate,
        status: product.status || calculateStatus(product.stock, product.minStock),
        price: `QAR ${product.sellingPrice.toFixed(2)}`,
    };
}

export async function getProductCollection() {
    const db = await getDatabase();
    return db.collection<ProductDocument>('products');
}

export async function findProductById(id: string): Promise<ProductDocument | null> {
    const collection = await getProductCollection();
    return collection.findOne({ _id: new ObjectId(id) });
}

export async function createProduct(productData: Omit<ProductDocument, '_id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<ProductDocument> {
    const collection = await getProductCollection();
    const now = new Date();
    const minStock = productData.minStock || 15;
    const product: ProductDocument = {
        ...productData,
        status: calculateStatus(productData.stock, minStock),
        createdAt: now,
        updatedAt: now,
    };
    const result = await collection.insertOne(product);
    return { ...product, _id: result.insertedId };
}

export async function updateProduct(id: string, updates: Partial<ProductDocument>): Promise<ProductDocument | null> {
    const collection = await getProductCollection();

    // Recalculate status if stock is being updated
    if (updates.stock !== undefined) {
        const existing = await findProductById(id);
        if (existing) {
            const minStock = updates.minStock ?? existing.minStock ?? 15;
            updates.status = calculateStatus(updates.stock, minStock);
        }
    }

    const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: 'after' }
    );
    return result || null;
}

export async function deleteProduct(id: string): Promise<boolean> {
    const collection = await getProductCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
}

