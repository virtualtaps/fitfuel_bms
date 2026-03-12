import { z } from 'zod';

// Auth validation schemas
export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(1, 'Name is required'),
    role: z.enum(['admin', 'manager', 'user']).optional(),
});

// Employee validation schemas
export const employeeSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    position: z.string().optional(),
    department: z.string().optional(),
    joinDate: z.string().optional(),
    status: z.enum(['active', 'inactive', 'on-leave']).default('active'),
    salary: z.string().optional(),
    manager: z.string().optional(),
    location: z.string().optional(),
    bio: z.string().optional(),
});

// Product validation schemas
export const productSchema = z.object({
    name: z.string().min(1, 'Product name is required'),
    arabicName: z.string().optional(),
    description: z.string().optional(),
    sku: z.string().optional(),
    category: z.string().optional(),
    stock: z.number().int().min(0, 'Stock cannot be negative'),
    minStock: z.number().int().min(0).optional(),
    buyingPrice: z.number().min(0, 'Buying price cannot be negative').optional(),
    sellingPrice: z.number().min(0, 'Selling price cannot be negative'),
    location: z.string().optional(),
    supplierName: z.string().optional(),
    supplierContact: z.string().optional(),
    expiryDate: z.string().or(z.date()).optional(),
});

// Invoice item schema
export const invoiceItemSchema = z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().int().refine((val) => val !== 0, {
        message: 'Quantity cannot be zero',
    }), // Allow negative for returns, but not zero
    rate: z.number().min(0, 'Rate cannot be negative'),
    productId: z.string().optional(), // Reference to product in inventory
});

// Invoice validation schemas
export const invoiceSchema = z.object({
    clientName: z.string().optional(),
    clientPhone: z.string().optional(),
    clientId: z.string().optional(),
    items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
    discountPercentage: z.number().min(0).max(100).default(0),
    issueDate: z.string().or(z.date()),
    paymentMethod: z.enum(['cash', 'card', 'bank-transfer', 'Fawran', 'Pending']).optional(),
    notes: z.string().optional(),
    status: z.enum(['Draft', 'Pending', 'Paid', 'Overdue']).default('Draft'),
});

// Quotation validation schemas
export const quotationSchema = z.object({
    clientName: z.string().min(1, 'Client name is required'),
    clientPhone: z.string().optional(),
    clientId: z.string().optional(),
    items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
    discountPercentage: z.number().min(0).max(100).default(0),
    issueDate: z.string().or(z.date()),
    validUntil: z.string().or(z.date()),
    notes: z.string().optional(),
    status: z.enum(['Draft', 'Sent', 'Accepted', 'Declined', 'Expired']).default('Draft'),
});

// Query parameter schemas
export const paginationSchema = z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

