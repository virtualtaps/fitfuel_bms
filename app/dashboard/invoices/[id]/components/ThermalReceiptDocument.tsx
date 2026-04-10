"use client";

import { CSSProperties } from "react";
import { LightMode } from "@/components/ui/color-mode";
import { InvoiceResponse } from "@/lib/models/Invoice";

interface CompanyInfo {
    name: string;
    email: string;
    address: string;
    phone: string;
}

interface ThermalReceiptDocumentProps {
    invoice: InvoiceResponse;
    companyInfo: CompanyInfo;
    productsMap: Map<string, { arabicName?: string }>;
}

const S: Record<string, CSSProperties> = {
    root: {
        width: "80mm",
        margin: "0 auto",
        background: "white",
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "12px",
        color: "#000",
        padding: "6mm 4mm 10mm 4mm",
        boxSizing: "border-box",
    },
    center: { textAlign: "center" },
    row: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
    bold: { fontWeight: 700 },
    divDash: { borderTop: "1px dashed #555", margin: "6px 0" },
    divSolid: { borderTop: "1px solid #000", margin: "6px 0" },
    small: { fontSize: "10px", color: "#555" },
    rtl: { direction: "rtl" as const, fontSize: "10px", color: "#555" },
    totalLabel: { fontWeight: 700, fontSize: "13px" },
    totalAmount: { fontWeight: 900, fontSize: "16px" },
    discountAmt: { fontWeight: 700, color: "#c0392b" },
};

export default function ThermalReceiptDocument({
    invoice,
    companyInfo,
    productsMap,
}: ThermalReceiptDocumentProps) {
    const totalItems = invoice.items.reduce((s, i) => s + i.quantity, 0);

    return (
        <LightMode>
            {/* Hidden on screen via CSS class; revealed only when body.print-thermal */}
            <div className="thermal-print-content">
                <div style={S.root}>

                    {/* ── HEADER ── */}
                    <div style={S.center}>
                        <img
                            src="/logo.png"
                            alt="logo"
                            style={{ height: "44px", width: "44px", objectFit: "cover", borderRadius: "50%", marginBottom: "6px" }}
                        />
                        <div style={{ ...S.bold, fontSize: "15px", letterSpacing: "0.5px" }}>{companyInfo.name}</div>
                        {companyInfo.address && (
                            <div style={{ ...S.small, marginTop: "2px" }}>{companyInfo.address}</div>
                        )}
                        {companyInfo.phone && (
                            <div style={{ ...S.small, marginTop: "1px" }}>{companyInfo.phone}</div>
                        )}
                        <div style={{ ...S.small, marginTop: "2px" }}>
                            {new Date(invoice.issueDate).toLocaleString("en-GB", {
                                day: "2-digit", month: "2-digit", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                            })}
                        </div>
                    </div>

                    <div style={S.divDash} />

                    {/* ── INVOICE NUMBER ── */}
                    <div style={S.center}>
                        <div style={S.small}>Invoice No. / رقم الفاتورة</div>
                        <div style={{ ...S.bold, fontSize: "18px", letterSpacing: "3px", marginTop: "2px" }}>
                            {invoice.invoiceNumber || `INV-${invoice.id?.slice(-6)}`}
                        </div>
                    </div>

                    <div style={S.divDash} />

                    {/* ── CUSTOMER ── */}
                    <div>
                        <div style={S.row}>
                            <span style={S.bold}>Customer:</span>
                            <span style={{ textAlign: "right", maxWidth: "55%" }}>{invoice.client || "Walk-in"}</span>
                        </div>
                        <div style={{ ...S.rtl, textAlign: "right" }}>العميل</div>
                        {invoice.clientPhone && (
                            <>
                                <div style={{ ...S.row, marginTop: "4px" }}>
                                    <span style={S.bold}>Phone:</span>
                                    <span>{invoice.clientPhone}</span>
                                </div>
                                <div style={{ ...S.rtl, textAlign: "right" }}>هاتف العميل</div>
                            </>
                        )}
                    </div>

                    <div style={S.divDash} />

                    {/* ── ITEMS HEADER ── */}
                    <div style={{ ...S.row, ...S.bold, fontSize: "11px", marginBottom: "4px" }}>
                        <span style={{ width: "16px" }}>QTY</span>
                        <span style={{ flex: 1, paddingLeft: "6px" }}>ITEM</span>
                        <span>AMOUNT</span>
                    </div>
                    <div style={S.divSolid} />

                    {/* ── ITEMS ── */}
                    {invoice.items.map((item, index) => {
                        const amount = item.amount ?? item.quantity * item.rate;
                        const arabicName = item.productId ? productsMap.get(item.productId)?.arabicName : undefined;
                        return (
                            <div key={index} style={{ marginBottom: "6px" }}>
                                <div style={S.row}>
                                    <span style={{ ...S.bold, width: "16px", flexShrink: 0 }}>{item.quantity}</span>
                                    <div style={{ flex: 1, paddingLeft: "6px" }}>
                                        <div style={{ lineHeight: "1.3" }}>{item.description}</div>
                                        {arabicName && (
                                            <div style={{ ...S.rtl, lineHeight: "1.3", marginTop: "2px" }}>{arabicName}</div>
                                        )}
                                        <div style={S.small}>
                                            {item.quantity} × QAR {item.rate.toLocaleString()}
                                            {(item.discount ?? 0) > 0 && (
                                                <span style={{ color: "#c0392b", marginLeft: "4px" }}>
                                                    − disc. {(item.discount!).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span style={{ ...S.bold, flexShrink: 0, paddingLeft: "6px" }}>
                                        {amount.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    <div style={S.divDash} />

                    {/* ── TOTALS ── */}
                    <div>
                        {invoice.discount > 0 && (
                            <>
                                <div style={S.row}>
                                    <span>Discount{invoice.discountPercentage > 0 ? ` (${invoice.discountPercentage}%)` : ""} / خصم</span>
                                    <span style={S.discountAmt}>- QAR {invoice.discount.toLocaleString()}</span>
                                </div>
                            </>
                        )}
                        <div style={{ ...S.divSolid, margin: "6px 0 4px 0" }} />
                        <div style={S.row}>
                            <div>
                                <span style={S.totalLabel}>TOTAL ({totalItems} items)</span>
                                <div style={S.rtl}>المجموع ({totalItems} عناصر)</div>
                            </div>
                            <span style={S.totalAmount}>QAR {invoice.total.toLocaleString()}</span>
                        </div>
                    </div>

                    {invoice.paymentMethod && (
                        <>
                            <div style={S.divDash} />
                            <div style={S.row}>
                                <span style={S.bold}>Payment:</span>
                                <span>{invoice.paymentMethod}</span>
                            </div>
                            <div style={{ ...S.rtl, textAlign: "right" }}>طريقة الدفع</div>
                        </>
                    )}

                    {invoice.notes && (
                        <>
                            <div style={S.divDash} />
                            <div style={{ ...S.small, fontStyle: "italic" }}>{invoice.notes}</div>
                        </>
                    )}

                    <div style={S.divDash} />

                    {/* ── FOOTER ── */}
                    <div style={{ ...S.center, marginTop: "4px" }}>
                        <div style={{ ...S.bold, fontSize: "14px" }}>Thank you! / شكراً!</div>
                        <div style={{ ...S.small, marginTop: "4px" }}>{companyInfo.email}</div>
                    </div>

                </div>
            </div>
        </LightMode>
    );
}
