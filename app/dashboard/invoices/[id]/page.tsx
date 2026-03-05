"use client";

import { useState, useEffect } from "react";
import {
    Box,
    Card,
    HStack,
    VStack,
    Text,
    Heading,
    Button,
    Badge,
    IconButton,
    Flex,
    Dialog,
    Portal,
    CloseButton,
} from "@chakra-ui/react";
import {
    LuArrowLeft,
    LuPencil,
    LuSend,
    LuPrinter,
    LuCopy,
    LuTrash2,
} from "react-icons/lu";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { LightMode } from "@/components/ui/color-mode";
import { useAuth } from "@/context/AuthContext";
import { toaster } from "@/components/ui/toaster";
import { apiClient } from "@/lib/api";
import { InvoiceResponse } from "@/lib/models/Invoice";

const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case "paid": return "green";
        case "pending": return "yellow";
        case "overdue": return "red";
        case "draft": return "gray";
        default: return "gray";
    }
};

export default function InvoiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const invoiceId = params.id as string;
    const { user: currentUser } = useAuth();

    // Data state
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

    // UI state
    const [isSending, setIsSending] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [sendDialogOpen, setSendDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank-transfer' | 'Fawran' | 'Pending' | undefined>(undefined);

    useEffect(() => {
        if (invoiceId) {
            fetchInvoice();
        }
        fetchCompanyInfo();
    }, [invoiceId]);

    const fetchCompanyInfo = async () => {
        try {
            const response = await apiClient.get<{
                name: string;
                email: string;
                phone: string;
                address: string;
                city: string;
                zipCode?: string;
                bankName?: string;
                bankAccount?: string;
                bankIBAN?: string;
                bankBranch?: string;
            }>("/api/settings/company");
            if (response.success && response.data) {
                const addressParts = [response.data.address, response.data.city];
                if (response.data.zipCode) {
                    addressParts.push(response.data.zipCode);
                }
                const fullAddress = addressParts.filter(Boolean).join(", ");
                setCompanyInfo({
                    name: response.data.name,
                    email: response.data.email,
                    phone: response.data.phone,
                    address: fullAddress,
                    bankName: response.data.bankName || "",
                    bankAccount: response.data.bankAccount || "",
                    bankIBAN: response.data.bankIBAN || "",
                    bankBranch: response.data.bankBranch || "",
                });
            }
        } catch (error) {
            console.error("Failed to fetch company info:", error);
        }
    };

    const fetchInvoice = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.get<InvoiceResponse>(`/api/invoices/${invoiceId}`);
            if (response.success && response.data) {
                setInvoice(response.data);
                setPaymentMethod(response.data.paymentMethod);

                const productIds = response.data.items
                    .map(item => item.productId)
                    .filter((id): id is string => !!id);

                if (productIds.length > 0) {
                    const productsMap = new Map<string, { arabicName?: string }>();
                    await Promise.all(
                        productIds.map(async (productId) => {
                            try {
                                const productResponse = await apiClient.get<{ arabicName?: string }>(`/api/inventory/${productId}`);
                                if (productResponse.success && productResponse.data) {
                                    productsMap.set(productId, { arabicName: productResponse.data.arabicName });
                                }
                            } catch (error) {
                                console.error(`Failed to fetch product ${productId}:`, error);
                            }
                        })
                    );
                    setProductsMap(productsMap);
                }
            } else {
                throw new Error(response.error || "Failed to load invoice");
            }
        } catch (err: any) {
            setError(err.message || "Failed to load invoice");
            toaster.create({
                title: "Error",
                description: err.message || "Failed to load invoice",
                type: "error",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 100);
    };



    const handleDuplicate = async () => {
        if (!invoice) return;

        toaster.create({
            id: "duplicating",
            title: "Creating duplicate...",
            type: "loading",
        });

        try {
            const response = await apiClient.post<InvoiceResponse>(`/api/invoices/${invoiceId}/duplicate`);
            const newInvoice = response.data;
            if (response.success && newInvoice) {
                toaster.dismiss("duplicating");
                toaster.create({
                    title: "Invoice duplicated",
                    description: `Redirecting to new invoice...`,
                    type: "success",
                });
                setTimeout(() => router.push(`/dashboard/invoices/${newInvoice.id}`), 500);
            } else {
                throw new Error(response.error || "Failed to duplicate invoice");
            }
        } catch (err: any) {
            toaster.dismiss("duplicating");
            toaster.create({
                title: "Failed to duplicate invoice",
                description: err.message || "Please try again",
                type: "error",
            });
        }
    };

    const handleSend = async () => {
        if (!invoice) return;

        setIsSending(true);
        setSendDialogOpen(false);
        toaster.create({
            id: "sending",
            title: "Sending invoice...",
            type: "loading",
        });

        try {
            const response = await apiClient.post(`/api/invoices/${invoiceId}/send`);
            if (response.success) {
                await fetchInvoice();
                toaster.dismiss("sending");
                toaster.create({
                    title: "Invoice sent!",
                    description: `Invoice has been sent successfully.`,
                    type: "success",
                });
            } else {
                throw new Error(response.error || "Failed to send invoice");
            }
        } catch (err: any) {
            toaster.dismiss("sending");
            toaster.create({
                title: "Failed to send invoice",
                description: err.message || "Please try again",
                type: "error",
            });
        } finally {
            setIsSending(false);
        }
    };


    const handleDelete = async () => {
        if (!invoice) return;

        setDeleteDialogOpen(false);
        toaster.create({
            id: "deleting",
            title: "Deleting invoice...",
            type: "loading",
        });

        try {
            const response = await apiClient.delete(`/api/invoices/${invoiceId}`);
            if (response.success) {
                toaster.dismiss("deleting");
                toaster.create({
                    title: "Invoice deleted",
                    type: "success",
                });
                router.push("/dashboard/invoices");
            } else {
                throw new Error(response.error || "Failed to delete invoice");
            }
        } catch (err: any) {
            toaster.dismiss("deleting");
            toaster.create({
                title: "Failed to delete invoice",
                description: err.message || "Please try again",
                type: "error",
            });
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
                        <Button variant="outline" size="sm">
                            <LuArrowLeft /> Back to Invoices
                        </Button>
                    </Link>
                </VStack>
            </DashboardLayout>
        );
    }


    return (
        <>
            <style jsx global>{`
                /* A4 Page Container */
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
                    @page {
                        size: A4 portrait;
                        margin: 10mm 8mm 10mm 8mm;
                    }
                    
                    @page :first { margin-top: 0; }
                    @page :left { margin-left: 0; }
                    @page :right { margin-right: 0; }
                    
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        width: 210mm !important;
                        height: 297mm !important;
                    }
                    
                    body * {
                        visibility: hidden;
                    }
                    
                    .invoice-print-content,
                    .invoice-print-content * {
                        visibility: visible !important;
                    }
                    
                    .invoice-print-content {
                        position: relative !important;
                        width: 194mm !important;
                        /* allow content to size to its intrinsic height instead of forcing full page height
                           this removes extra white space when the invoice is shorter than the A4 page */
                        min-height: 277mm !important;
                        height: auto !important;
                        background: white !important;
                        box-shadow: none !important;
                        overflow: hidden !important;
                        margin: 0 auto !important;
                    }
                    
                    .invoice-print-content button,
                    .invoice-print-content .chakra-button,
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
            <DashboardLayout>
                <VStack gap={6} align="stretch">
                    {/* Header Actions */}
                    <Flex justify="space-between" align="center" flexWrap="wrap" gap={4} className="no-print">
                        <HStack gap={4}>
                            <Link href="/dashboard/invoices">
                                <IconButton variant="ghost" size="sm" aria-label="Back">
                                    <LuArrowLeft />
                                </IconButton>
                            </Link>
                            <Box>
                                <HStack gap={3}>
                                    <Heading size="lg" fontWeight="semibold">{invoice.invoiceNumber}</Heading>
                                    <Badge
                                        colorPalette={getStatusColor(invoice.status)}
                                        variant="subtle"
                                        fontSize="xs"
                                        px={3}
                                        py={1}
                                        borderRadius="full"
                                        textTransform="capitalize"
                                    >
                                        {invoice.status}
                                    </Badge>
                                </HStack>
                                <Text color="fg.muted" fontSize="sm">
                                    Created on {new Date(invoice.issueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </Text>
                            </Box>
                        </HStack>
                        <HStack gap={2} flexWrap="wrap">
                            <Button variant="outline" size="sm" loading={isPrinting} onClick={handlePrint}>
                                <LuPrinter /> Print
                            </Button>

                            <Button variant="outline" size="sm" onClick={handleDuplicate}>
                                <LuCopy /> Duplicate
                            </Button>
                            <Link href={`/dashboard/invoices/${invoiceId}/edit`}>
                                <Button variant="outline" size="sm">
                                    <LuPencil /> Edit
                                </Button>
                            </Link>
                            <Button colorPalette="blue" size="sm" loading={isSending} loadingText="Sending..." onClick={() => setSendDialogOpen(true)}>
                                <LuSend /> Send Invoice
                            </Button>
                        </HStack>
                    </Flex>

                    {/* Invoice Document - A4 */}
                    <LightMode>
                        <Card.Root border="none" bg="white" className="invoice-print-content" position="relative">
                            <Card.Body p={0}>
                                {/* All hardcoded colors so LightMode is irrelevant — safe for print */}
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

                                    {/* ── DIVIDER ── */}
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

                                    {/* ── DIVIDER ── */}
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

                                    {/* ── DIVIDER ── */}
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
                                                        padding: "18px 0",
                                                    }}>
                                                        {/* Qty */}
                                                        <span style={{
                                                            fontWeight: 700, fontSize: "14px", color: "#111",
                                                            minWidth: "28px", flexShrink: 0, paddingTop: "1px",
                                                        }}>
                                                            {item.quantity}
                                                        </span>
                                                        {/* Name + Arabic */}
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
                                                        </div>
                                                        {/* Price */}
                                                        <span style={{
                                                            fontWeight: 700, fontSize: "14px", color: "#111",
                                                            whiteSpace: "nowrap", flexShrink: 0,
                                                        }}>
                                                            QAR {amount.toLocaleString()}
                                                        </span>
                                                    </div>
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
                                                    <span style={{ fontSize: "14px", color: "#555" }}>Discount</span>
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

                                    {/* ── DIVIDER ── */}
                                    <div style={{ borderTop: "2px dashed #bbb", margin: "20px 0 24px 0" }} />

                                    {/* ── FOOTER ── */}
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontWeight: 800, fontSize: "17px", color: "#111", marginBottom: "4px" }}>Thank you !</div>
                                        <div style={{ fontWeight: 800, fontSize: "17px", color: "#111", marginBottom: "8px" }}>! شكراً</div>
                                        {invoice.paymentMethod && (
                                            <div style={{ fontWeight: 600, fontSize: "14px", color: "#444" }}>Payment Method: {invoice.paymentMethod}</div>
                                        )}
                                    </div>

                                </Box>
                            </Card.Body>
                        </Card.Root>
                    </LightMode>

                </VStack>

                {/* Send Invoice Dialog */}
                <Dialog.Root open={sendDialogOpen} onOpenChange={(e) => setSendDialogOpen(e.open)}>
                    <Portal>
                        <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
                        <Dialog.Positioner>
                            <Dialog.Content bg="bg.surface" borderRadius="xl" maxW="400px" mx={4}>
                                <Dialog.Header p={5} pb={0}>
                                    <Dialog.Title fontWeight="semibold">Send Invoice</Dialog.Title>
                                </Dialog.Header>
                                <Dialog.Body p={5}>
                                    <Text color="fg.muted">Send invoice {invoice?.invoiceNumber}?</Text>
                                </Dialog.Body>
                                <Dialog.Footer p={5} pt={0} gap={3}>
                                    <Dialog.ActionTrigger asChild>
                                        <Button variant="outline" size="sm">Cancel</Button>
                                    </Dialog.ActionTrigger>
                                    <Button colorPalette="blue" size="sm" onClick={handleSend}>
                                        <LuSend /> Send
                                    </Button>
                                </Dialog.Footer>
                                <Dialog.CloseTrigger asChild position="absolute" top={3} right={3}>
                                    <CloseButton size="sm" />
                                </Dialog.CloseTrigger>
                            </Dialog.Content>
                        </Dialog.Positioner>
                    </Portal>
                </Dialog.Root>

                {/* Delete Invoice Dialog */}
                <Dialog.Root open={deleteDialogOpen} onOpenChange={(e) => setDeleteDialogOpen(e.open)}>
                    <Portal>
                        <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
                        <Dialog.Positioner>
                            <Dialog.Content bg="bg.surface" borderRadius="xl" maxW="400px" mx={4}>
                                <Dialog.Header p={5} pb={0}>
                                    <Dialog.Title fontWeight="semibold">Delete Invoice</Dialog.Title>
                                </Dialog.Header>
                                <Dialog.Body p={5}>
                                    <Text color="fg.muted">
                                        Are you sure you want to delete this invoice? This action cannot be undone.
                                    </Text>
                                </Dialog.Body>
                                <Dialog.Footer p={5} pt={0} gap={3}>
                                    <Dialog.ActionTrigger asChild>
                                        <Button variant="outline" size="sm">Cancel</Button>
                                    </Dialog.ActionTrigger>
                                    <Button colorPalette="red" size="sm" onClick={handleDelete}>
                                        <LuTrash2 /> Delete
                                    </Button>
                                </Dialog.Footer>
                                <Dialog.CloseTrigger asChild position="absolute" top={3} right={3}>
                                    <CloseButton size="sm" />
                                </Dialog.CloseTrigger>
                            </Dialog.Content>
                        </Dialog.Positioner>
                    </Portal>
                </Dialog.Root>
            </DashboardLayout>
        </>
    );
}
