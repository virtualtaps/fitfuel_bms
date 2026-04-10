"use client";

import { Card, Box } from "@chakra-ui/react";
import { LightMode } from "@/components/ui/color-mode";
import { InvoiceResponse } from "@/lib/models/Invoice";

interface CompanyInfo {
    name: string;
    email: string;
    address: string;
    phone: string;
    bankName: string;
    bankAccount: string;
    bankIBAN: string;
    bankBranch: string;
}

interface InvoiceDocumentProps {
    invoice: InvoiceResponse;
    companyInfo: CompanyInfo;
    productsMap: Map<string, { arabicName?: string }>;
}

export default function InvoiceDocument({ invoice, companyInfo, productsMap }: InvoiceDocumentProps) {
    return (
        <LightMode>
            <Card.Root border="none" bg="white" className="invoice-print-content" position="relative">
                <Card.Body p={0}>
                    <Box
                        style={{
                            padding: "40px 52px 48px 52px",
                            color: "#111",
                            background: "white",
                        }}
                    >
                        {/* ── HEADER ── */}
                        <div style={{ textAlign: "center", marginBottom: "28px" }}>
                            <img
                                src="/logo.png"
                                alt="logo"
                                style={{
                                    height: "60px",
                                    width: "60px",
                                    objectFit: "cover",
                                    borderRadius: "50%",
                                    marginBottom: "10px",
                                    display: "inline-block",
                                }}
                            />
                            <div style={{ fontWeight: 900, fontSize: "22px", letterSpacing: "0.5px", color: "#111" }}>
                                {companyInfo.name}
                            </div>
                            {companyInfo.address && (
                                <div style={{ fontSize: "13px", color: "#666", marginTop: "3px" }}>
                                    {companyInfo.address}
                                </div>
                            )}
                            <div style={{ fontSize: "13px", color: "#666", marginTop: "3px" }}>
                                {new Date(invoice.issueDate).toLocaleString("en-GB", {
                                    day: "2-digit", month: "2-digit", year: "numeric",
                                    hour: "2-digit", minute: "2-digit",
                                })}
                            </div>
                        </div>

                        <div style={{ borderTop: "2px dashed #bbb", margin: "0 0 24px 0" }} />

                        {/* ── INVOICE NUMBER ── */}
                        <div style={{ textAlign: "center", marginBottom: "24px" }}>
                            <div style={{ fontWeight: 700, fontSize: "14px", color: "#111" }}>Invoice Number</div>
                            <div style={{ fontSize: "12px", color: "#888", direction: "rtl" }}>رقم الفاتورة</div>
                            <div style={{
                                fontWeight: 900, fontSize: "32px", letterSpacing: "4px",
                                fontFamily: "monospace", color: "#111", marginTop: "6px",
                            }}>
                                {invoice.invoiceNumber || `INV-${invoice.id?.slice(-6)}`}
                            </div>
                        </div>

                        <div style={{ borderTop: "2px dashed #bbb", margin: "0 0 22px 0" }} />

                        {/* ── CUSTOMER ── */}
                        <div style={{ marginBottom: "22px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                                <span style={{ fontWeight: 700, fontSize: "14px", color: "#111" }}>Customer:</span>
                                <span style={{ fontSize: "14px", color: "#111" }}>{invoice.client || "Walk-in Customer"}</span>
                            </div>
                            <div style={{ fontSize: "12px", color: "#888", direction: "rtl", textAlign: "right" }}>العميل</div>

                            {invoice.clientPhone && (
                                <>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", marginBottom: "2px" }}>
                                        <span style={{ fontWeight: 700, fontSize: "14px", color: "#111" }}>Customer Phone:</span>
                                        <span style={{ fontSize: "14px", color: "#111" }}>{invoice.clientPhone}</span>
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#888", direction: "rtl", textAlign: "right" }}>هاتف العميل</div>
                                </>
                            )}
                        </div>

                        <div style={{ borderTop: "2px dashed #bbb", margin: "0 0 0 0" }} />

                        {/* ── ITEMS ── */}
                        <div>
                            {invoice.items.map((item, index) => {
                                const amount = item.amount ?? (item.quantity * item.rate);
                                const arabicName = item.productId ? productsMap.get(item.productId)?.arabicName : undefined;
                                return (
                                    <div key={index}>
                                        <div style={{
                                            display: "flex", alignItems: "flex-start",
                                            justifyContent: "space-between", gap: "16px",
                                            padding: "18px 0 4px 0",
                                        }}>
                                            <span style={{
                                                fontWeight: 700, fontSize: "14px", color: "#111",
                                                minWidth: "28px", flexShrink: 0, paddingTop: "1px",
                                            }}>
                                                {item.quantity}
                                            </span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: "14px", color: "#111", lineHeight: "1.45" }}>
                                                    {item.description}
                                                </div>
                                                {arabicName && (
                                                    <div style={{
                                                        fontSize: "12px", color: "#888",
                                                        direction: "rtl", marginTop: "4px", lineHeight: "1.4",
                                                    }}>
                                                        {arabicName}
                                                    </div>
                                                )}
                                                <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
                                                    {item.quantity} × QAR {item.rate.toLocaleString()}
                                                    {(item.discount ?? 0) > 0 && (
                                                        <span style={{ color: "#c0392b", marginLeft: "6px" }}>
                                                            − disc. QAR {(item.discount!).toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span style={{
                                                fontWeight: 700, fontSize: "14px", color: "#111",
                                                whiteSpace: "nowrap", flexShrink: 0,
                                            }}>
                                                QAR {amount.toLocaleString()}
                                            </span>
                                        </div>
                                        <div style={{ paddingBottom: "14px" }} />
                                        <div style={{ borderTop: "2px dashed #bbb" }} />
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── TOTALS ── */}
                        <div style={{ padding: "18px 0 4px 0" }}>
                            {invoice.discount > 0 && (
                                <>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                                        <span style={{ fontSize: "14px", color: "#555" }}>
                                            Discount{invoice.discountPercentage > 0 ? ` (${invoice.discountPercentage}%)` : ""}
                                        </span>
                                        <span style={{ fontWeight: 700, fontSize: "14px", color: "#c0392b" }}>
                                            - QAR {invoice.discount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#888", direction: "rtl", textAlign: "right", marginBottom: "12px" }}>خصم</div>
                                </>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                <div>
                                    <span style={{ fontWeight: 700, fontSize: "15px", color: "#111" }}>
                                        Total ({invoice.items.reduce((s, i) => s + i.quantity, 0)} items)
                                    </span>
                                    <div style={{ fontSize: "12px", color: "#888", direction: "rtl" }}>
                                        المجموع ({invoice.items.reduce((s, i) => s + i.quantity, 0)} عناصر)
                                    </div>
                                </div>
                                <span style={{ fontWeight: 900, fontSize: "22px", color: "#111" }}>
                                    QAR {invoice.total.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {invoice.notes && (
                            <>
                                <div style={{ borderTop: "2px dashed #bbb", margin: "16px 0" }} />
                                <div style={{ fontSize: "13px", color: "#666", fontStyle: "italic" }}>{invoice.notes}</div>
                            </>
                        )}

                        <div style={{ borderTop: "2px dashed #bbb", margin: "20px 0 24px 0" }} />

                        {/* ── FOOTER ── */}
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontWeight: 800, fontSize: "17px", color: "#111", marginBottom: "4px" }}>Thank you !</div>
                            <div style={{ fontWeight: 800, fontSize: "17px", color: "#111", marginBottom: "8px" }}>! شكراً</div>
                            {invoice.paymentMethod && (
                                <div style={{ fontWeight: 600, fontSize: "14px", color: "#444" }}>
                                    Payment Method: {invoice.paymentMethod}
                                </div>
                            )}
                        </div>
                    </Box>
                </Card.Body>
            </Card.Root>
        </LightMode>
    );
}
