"use client";

import { useState, useEffect } from "react";
import { VStack, Text, Button } from "@chakra-ui/react";
import Link from "next/link";
import { LuArrowLeft } from "react-icons/lu";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { toaster } from "@/components/ui/toaster";
import { apiClient } from "@/lib/api";
import { InvoiceResponse } from "@/lib/models/Invoice";
import InvoicePageHeader from "./components/InvoicePageHeader";
import InvoiceDocument from "./components/InvoiceDocument";
import SendInvoiceDialog from "./components/SendInvoiceDialog";
import DeleteInvoiceDialog from "./components/DeleteInvoiceDialog";

const PRINT_STYLES = `
    .invoice-print-content {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        background: white;
        box-shadow: 0 4px 32px rgba(0,0,0,0.13);
        position: relative;
        font-family: 'Segoe UI', Arial, sans-serif;
    }
    @media print {
        @page { size: A4 portrait; margin: 10mm 8mm 10mm 8mm; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
        body * { visibility: hidden; }
        .invoice-print-content, .invoice-print-content * { visibility: visible !important; }
        .invoice-print-content {
            position: relative !important;
            width: 194mm !important;
            min-height: 277mm !important;
            height: auto !important;
            background: white !important;
            box-shadow: none !important;
            overflow: hidden !important;
            margin: 0 auto !important;
        }
        .no-print { display: none !important; }
    }
`;

export default function InvoiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const invoiceId = params.id as string;

    const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [productsMap, setProductsMap] = useState<Map<string, { arabicName?: string }>>(new Map());
    const [companyInfo, setCompanyInfo] = useState({
        name: "Your Company Name",
        email: "invoices@yourcompany.com",
        address: "456 Enterprise Ave, Floor 5, San Francisco, CA 94102",
        phone: "+1 (555) 987-6543",
        bankName: "",
        bankAccount: "",
        bankIBAN: "",
        bankBranch: "",
    });

    const [isSending, setIsSending] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [sendDialogOpen, setSendDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    useEffect(() => {
        if (invoiceId) fetchInvoice();
        fetchCompanyInfo();
    }, [invoiceId]);

    const fetchCompanyInfo = async () => {
        try {
            const response = await apiClient.get<{
                name: string; email: string; phone: string; address: string;
                city: string; zipCode?: string; bankName?: string;
                bankAccount?: string; bankIBAN?: string; bankBranch?: string;
            }>("/api/settings/company");
            if (response.success && response.data) {
                const addressParts = [response.data.address, response.data.city];
                if (response.data.zipCode) addressParts.push(response.data.zipCode);
                setCompanyInfo({
                    name: response.data.name,
                    email: response.data.email,
                    phone: response.data.phone,
                    address: addressParts.filter(Boolean).join(", "),
                    bankName: response.data.bankName || "",
                    bankAccount: response.data.bankAccount || "",
                    bankIBAN: response.data.bankIBAN || "",
                    bankBranch: response.data.bankBranch || "",
                });
            }
        } catch (err) {
            console.error("Failed to fetch company info:", err);
        }
    };

    const fetchInvoice = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.get<InvoiceResponse>(`/api/invoices/${invoiceId}`);
            if (response.success && response.data) {
                setInvoice(response.data);

                const productIds = response.data.items
                    .map((item) => item.productId)
                    .filter((id): id is string => !!id);

                if (productIds.length > 0) {
                    const map = new Map<string, { arabicName?: string }>();
                    await Promise.all(
                        productIds.map(async (productId) => {
                            try {
                                const res = await apiClient.get<{ arabicName?: string }>(`/api/inventory/${productId}`);
                                if (res.success && res.data) map.set(productId, { arabicName: res.data.arabicName });
                            } catch {
                                // ignore individual product fetch failures
                            }
                        })
                    );
                    setProductsMap(map);
                }
            } else {
                throw new Error(response.error || "Failed to load invoice");
            }
        } catch (err: any) {
            setError(err.message || "Failed to load invoice");
            toaster.create({ title: "Error", description: err.message || "Failed to load invoice", type: "error" });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        setIsPrinting(true);
        setTimeout(() => { window.print(); setIsPrinting(false); }, 100);
    };

    const handlePrintReceipt = () => {
        if (!invoice) return;

        const totalItems = invoice.items.reduce((s, i) => s + i.quantity, 0);

        const itemsHtml = invoice.items.map((item) => {
            const amount = item.amount ?? item.quantity * item.rate;
            const arabicName = item.productId ? productsMap.get(item.productId)?.arabicName : undefined;
            return `
                <div style="margin-bottom:6px;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                        <span style="font-weight:700;width:18px;flex-shrink:0;">${item.quantity}</span>
                        <div style="flex:1;padding-left:6px;">
                            <div style="line-height:1.3;">${item.description}</div>
                            ${arabicName ? `<div style="font-size:10px;color:#555;direction:rtl;margin-top:2px;">${arabicName}</div>` : ""}
                            <div style="font-size:10px;color:#555;">${item.quantity} × QAR ${item.rate.toLocaleString()}</div>
                        </div>
                        <span style="font-weight:700;flex-shrink:0;padding-left:6px;">QAR ${amount.toLocaleString()}</span>
                    </div>
                </div>`;
        }).join("");

        const discountHtml = invoice.discount > 0 ? `
            <div style="display:flex;justify-content:space-between;">
                <span>Discount${invoice.discountPercentage > 0 ? ` (${invoice.discountPercentage}%)` : ""} / خصم</span>
                <span style="font-weight:700;color:#c0392b;">- QAR ${invoice.discount.toLocaleString()}</span>
            </div>` : "";

        const paymentHtml = invoice.paymentMethod ? `
            <div style="border-top:1px dashed #555;margin:6px 0;"></div>
            <div style="display:flex;justify-content:space-between;">
                <span style="font-weight:700;">Payment:</span>
                <span>${invoice.paymentMethod}</span>
            </div>
            <div style="font-size:10px;color:#555;direction:rtl;text-align:right;">طريقة الدفع</div>` : "";

        const notesHtml = invoice.notes ? `
            <div style="border-top:1px dashed #555;margin:6px 0;"></div>
            <div style="font-size:10px;color:#555;font-style:italic;">${invoice.notes}</div>` : "";

        const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Receipt ${invoice.invoiceNumber}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; padding: 6mm 4mm 10mm 4mm; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; width: 80mm; background: white; }
  img { display: block; margin: 0 auto 6px auto; height: 44px; width: 44px; object-fit: cover; border-radius: 50%; }
</style>
</head>
<body>
  <div style="text-align:center;">
    <img src="${window.location.origin}/logo.png" alt="logo"/>
    <div style="font-weight:900;font-size:15px;">${companyInfo.name}</div>
    ${companyInfo.address ? `<div style="font-size:10px;color:#555;margin-top:2px;">${companyInfo.address}</div>` : ""}
    ${companyInfo.phone ? `<div style="font-size:10px;color:#555;margin-top:1px;">${companyInfo.phone}</div>` : ""}
    <div style="font-size:10px;color:#555;margin-top:2px;">${new Date(invoice.issueDate).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
  </div>

  <div style="border-top:1px dashed #555;margin:6px 0;"></div>

  <div style="text-align:center;">
    <div style="font-size:10px;color:#555;">Invoice No. / رقم الفاتورة</div>
    <div style="font-weight:900;font-size:18px;letter-spacing:3px;margin-top:2px;">${invoice.invoiceNumber || `INV-${invoice.id?.slice(-6)}`}</div>
  </div>

  <div style="border-top:1px dashed #555;margin:6px 0;"></div>

  <div>
    <div style="display:flex;justify-content:space-between;">
      <span style="font-weight:700;">Customer:</span>
      <span style="text-align:right;max-width:55%;">${invoice.client || "Walk-in"}</span>
    </div>
    <div style="font-size:10px;color:#555;direction:rtl;text-align:right;">العميل</div>
    ${invoice.clientPhone ? `
    <div style="display:flex;justify-content:space-between;margin-top:4px;">
      <span style="font-weight:700;">Phone:</span>
      <span>${invoice.clientPhone}</span>
    </div>
    <div style="font-size:10px;color:#555;direction:rtl;text-align:right;">هاتف العميل</div>` : ""}
  </div>

  <div style="border-top:1px dashed #555;margin:6px 0;"></div>

  <div style="display:flex;justify-content:space-between;font-weight:700;font-size:11px;margin-bottom:4px;">
    <span style="width:18px;">QTY</span>
    <span style="flex:1;padding-left:6px;">ITEM</span>
    <span>AMOUNT</span>
  </div>
  <div style="border-top:1px solid #000;margin-bottom:4px;"></div>

  ${itemsHtml}

  <div style="border-top:1px dashed #555;margin:6px 0;"></div>

  ${discountHtml}
  <div style="border-top:1px solid #000;margin:6px 0 4px 0;"></div>
  <div style="display:flex;justify-content:space-between;align-items:baseline;">
    <div>
      <span style="font-weight:700;font-size:13px;">TOTAL (${totalItems} items)</span>
      <div style="font-size:10px;color:#555;direction:rtl;">المجموع (${totalItems} عناصر)</div>
    </div>
    <span style="font-weight:900;font-size:16px;">QAR ${invoice.total.toLocaleString()}</span>
  </div>

  ${paymentHtml}
  ${notesHtml}

  <div style="border-top:1px dashed #555;margin:8px 0 4px 0;"></div>
  <div style="text-align:center;">
    <div style="font-weight:800;font-size:14px;">Thank you! / شكراً!</div>
    ${companyInfo.email ? `<div style="font-size:10px;color:#555;margin-top:4px;">${companyInfo.email}</div>` : ""}
  </div>
</body>
</html>`;

        const win = window.open("", "_blank", "width=320,height=600");
        if (!win) return;
        win.document.write(html);
        win.document.close();
        win.onload = () => { win.print(); win.close(); };
    };

    const handleDuplicate = async () => {
        if (!invoice) return;
        toaster.create({ id: "duplicating", title: "Creating duplicate...", type: "loading" });
        try {
            const response = await apiClient.post<InvoiceResponse>(`/api/invoices/${invoiceId}/duplicate`);
            const newInvoice = response.data;
            if (response.success && newInvoice) {
                toaster.dismiss("duplicating");
                toaster.create({ title: "Invoice duplicated", description: "Redirecting to new invoice...", type: "success" });
                setTimeout(() => router.push(`/dashboard/invoices/${newInvoice.id}`), 500);
            } else {
                throw new Error(response.error || "Failed to duplicate invoice");
            }
        } catch (err: any) {
            toaster.dismiss("duplicating");
            toaster.create({ title: "Failed to duplicate invoice", description: err.message || "Please try again", type: "error" });
        }
    };

    const handleSend = async () => {
        if (!invoice) return;
        setIsSending(true);
        setSendDialogOpen(false);
        toaster.create({ id: "sending", title: "Sending invoice...", type: "loading" });
        try {
            const response = await apiClient.post(`/api/invoices/${invoiceId}/send`);
            if (response.success) {
                await fetchInvoice();
                toaster.dismiss("sending");
                toaster.create({ title: "Invoice sent!", description: "Invoice has been sent successfully.", type: "success" });
            } else {
                throw new Error(response.error || "Failed to send invoice");
            }
        } catch (err: any) {
            toaster.dismiss("sending");
            toaster.create({ title: "Failed to send invoice", description: err.message || "Please try again", type: "error" });
        } finally {
            setIsSending(false);
        }
    };

    const handleDelete = async () => {
        if (!invoice) return;
        setDeleteDialogOpen(false);
        toaster.create({ id: "deleting", title: "Deleting invoice...", type: "loading" });
        try {
            const response = await apiClient.delete(`/api/invoices/${invoiceId}`);
            if (response.success) {
                toaster.dismiss("deleting");
                toaster.create({ title: "Invoice deleted", type: "success" });
                router.push("/dashboard/invoices");
            } else {
                throw new Error(response.error || "Failed to delete invoice");
            }
        } catch (err: any) {
            toaster.dismiss("deleting");
            toaster.create({ title: "Failed to delete invoice", description: err.message || "Please try again", type: "error" });
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <VStack gap={6} align="stretch" py={8}>
                    <Text>Loading invoice...</Text>
                </VStack>
            </DashboardLayout>
        );
    }

    if (error || !invoice) {
        return (
            <DashboardLayout>
                <VStack gap={6} align="stretch" py={8}>
                    <Text color="red.500">Error: {error || "Invoice not found"}</Text>
                    <Link href="/dashboard/invoices">
                        <Button variant="outline" size="sm"><LuArrowLeft /> Back to Invoices</Button>
                    </Link>
                </VStack>
            </DashboardLayout>
        );
    }

    return (
        <>
            <style jsx global>{PRINT_STYLES}</style>
            <DashboardLayout>
                <VStack gap={6} align="stretch">
                    <InvoicePageHeader
                        invoice={invoice}
                        invoiceId={invoiceId}
                        isPrinting={isPrinting}
                        isSending={isSending}
                        onPrint={handlePrint}
                        onPrintReceipt={handlePrintReceipt}
                        onDuplicate={handleDuplicate}
                        onSendClick={() => setSendDialogOpen(true)}
                        onDeleteClick={() => setDeleteDialogOpen(true)}
                    />

                    <InvoiceDocument
                        invoice={invoice}
                        companyInfo={companyInfo}
                        productsMap={productsMap}
                    />

                </VStack>

                <SendInvoiceDialog
                    open={sendDialogOpen}
                    onOpenChange={setSendDialogOpen}
                    invoice={invoice}
                    onSend={handleSend}
                />

                <DeleteInvoiceDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    onDelete={handleDelete}
                />
            </DashboardLayout>
        </>
    );
}
