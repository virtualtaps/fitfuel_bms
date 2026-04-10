// Shared types for all models

export type UserRole = "admin" | "manager" | "user";
export type EmployeeStatus = "active" | "inactive" | "on-leave";
export type ProductStatus = "In Stock" | "Low Stock" | "Out of Stock";
export type InvoiceStatus = "Draft" | "Pending" | "Paid" | "Overdue";
export type QuotationStatus = "Draft" | "Sent" | "Accepted" | "Declined" | "Expired";

export interface InvoiceItem {
    description: string;
    quantity: number;
    rate: number;
    discount?: number; // Per-item discount amount
    amount: number;
    productId?: string; // Reference to product in inventory
    buyingPrice?: number; // Cost at time of sale for COGS tracking
}

export interface QuotationItem {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
    productId?: string; // Reference to product in inventory
    buyingPrice?: number; // Cost at time of quotation
}

