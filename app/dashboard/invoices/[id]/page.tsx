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
    SimpleGrid,
    Separator,
    Table,
    IconButton,
    Flex,
    Dialog,
    Portal,
    CloseButton,
} from "@chakra-ui/react";
import {
    LuArrowLeft,
    LuPencil,
    LuDownload,
    LuSend,
    LuPrinter,
    LuCopy,
    LuTrash2,
    LuCheck,
    LuX,
} from "react-icons/lu";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { toaster } from "@/components/ui/toaster";
import { apiClient } from "@/lib/api";
import { InvoiceResponse } from "@/lib/models/Invoice";
import { useArabicNumbers } from "@/hooks/useArabicNumbers";

const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case "paid": return "green";
        case "pending": return "yellow";
        case "overdue": return "red";
        case "draft": return "gray";
        default: return "gray";
    }
};

const formatDateInArabic = (date: Date, toArabic: (num: number | string) => string): string => {
    const arabicMonths = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    return `${toArabic(day)} ${arabicMonths[month]} ${toArabic(year)}`;
};

export default function InvoiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const invoiceId = params.id as string;
    const { formatCurrency, toArabic } = useArabicNumbers();

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
            }>("/api/settings/company");
            if (response.success && response.data) {
                const addressParts = [response.data.address, response.data.city];
                if (response.data.zipCode) {
                    addressParts.push(response.data.zipCode);
                }
                const fullAddress = addressParts.join(", ");
                setCompanyInfo({
                    name: response.data.name,
                    email: response.data.email,
                    phone: response.data.phone,
                    address: fullAddress,
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
                    min-height: auto;
                    max-height: 297mm;
                    margin: 0 auto;
                    background: white;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    position: relative;
                    overflow: hidden;
                }
                
                /* Red accent bar */
                .red-accent-bar {
                    background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
                }
                
                /* Table styling */
                .invoice-table thead tr {
                    background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%) !important;
                }
                .invoice-table thead th {
                    color: white !important;
                    font-weight: 600 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                    font-size: 11px !important;
                }
                .invoice-table tbody tr {
                    border-bottom: 1px solid #E5E7EB !important;
                }
                .invoice-table tbody tr:hover {
                    background: #F9FAFB !important;
                }
                
                /* Header section - fixed to top */
                .invoice-header-section {
                    position: relative;
                    z-index: 1;
                    background: white;
                }
                
                /* Footer wave */
                .footer-wave {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%);
                }
                
                /* Content area with padding for fixed header/footer */
                .invoice-content-area {
                    padding-top: 0;
                    padding-bottom: 80px;
                    position: relative;
                    z-index: 2;
                }
                
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm 8mm 10mm 8mm;
                    }
                    
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
                        height: 277mm !important;
                        background: white !important;
                        box-shadow: none !important;
                        overflow: hidden !important;
                        margin: 0 auto !important;
                    }
                    
                    .invoice-print-content:last-child {
                        page-break-after: auto;
                    }
                    
                    .invoice-print-content button,
                    .invoice-print-content .chakra-button,
                    .no-print {
                        display: none !important;
                    }
                    
                    .invoice-table thead tr {
                        background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%) !important;
                    }
                    
                    .invoice-table thead th {
                        color: white !important;
                    }
                    
                    .red-accent-bar {
                        background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%) !important;
                    }
                    
                    /* Header section - not fixed in print, just normal flow */
                    .invoice-header-section {
                        position: relative !important;
                        z-index: 1 !important;
                        background: white !important;
                        page-break-inside: avoid !important;
                    }
                    
                    /* Fixed footer to bottom */
                    .footer-wave {
                        position: fixed !important;
                        bottom: 0 !important;
                        left: 0 !important;
                        width: 210mm !important;
                        height: 50px !important;
                        z-index: 1000 !important;
                        page-break-inside: avoid !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    /* Content area padding to prevent overlap with footer only */
                    .invoice-content-area {
                        padding-top: 0 !important;
                        padding-bottom: 60px !important;
                        position: relative !important;
                        z-index: 2 !important;
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
                                <Text color="gray.500" fontSize="sm">
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
                    <Card.Root border="none" bg="white" className="invoice-print-content" overflow="hidden">
                        <Card.Body p={0}>
                            {/* Header Section - Fixed to Top */}
                            <Box className="invoice-header-section">
                                {/* Red Accent Bar at Top */}
                                <Box className="red-accent-bar" h="6px" />

                                {/* Header Section */}
                                <Box px={6} pt={0.5} pb={0.5}>
                                    {/* Logo Section - Smaller */}
                                    <Flex justify="center" align="center" mb={0.5}>
                                        <Box>
                                            <img
                                                src="/logo.png"
                                                alt="Company Logo"
                                                style={{
                                                    width: "220px",
                                                    height: "auto",
                                                    maxHeight: "90px",
                                                    objectFit: "contain"
                                                }}
                                            />
                                        </Box>
                                    </Flex>

                                    {/* Invoice Title & Number */}
                                    <Flex justify="space-between" align="flex-end" mb={0.5}>
                                        <Box>
                                            <Text
                                                fontSize="20px"
                                                fontWeight="900"
                                                color="#1F2937"
                                                letterSpacing="-1px"
                                                lineHeight="1"
                                            >
                                                INVOICE
                                            </Text>
                                        </Box>
                                        <Box textAlign="right" ml={4}>
                                            <Text fontSize="xs" color="gray.500" fontWeight="medium">Invoice No.</Text>
                                            <Text fontSize="lg" fontWeight="bold" color="#DC2626">
                                                {invoice.invoiceNumber || `INV-${invoice.id?.slice(-6)}`}
                                            </Text>
                                            <Box mt={0.5}>
                                                <Text fontSize="xs" color="gray.600" mb={0.5}>
                                                    {new Date(invoice.issueDate).toLocaleDateString('en-US', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </Text>
                                                <Text fontSize="xs" color="gray.500" dir="rtl" textAlign="right" style={{ fontFamily: 'Arial, sans-serif' }}>
                                                    {formatDateInArabic(new Date(invoice.issueDate), toArabic)}
                                                </Text>
                                            </Box>
                                        </Box>
                                    </Flex>

                                    {/* Bill To / From Section */}
                                    <SimpleGrid columns={2} gap={4} mb={0.5}>
                                        <Box
                                            p={2}
                                            bg="gray.50"
                                            borderRadius="md"
                                            borderLeft="3px solid"
                                            borderColor="#DC2626"
                                        >
                                            <Text fontSize="xs" fontWeight="bold" color="#DC2626" mb={1} textTransform="uppercase" letterSpacing="1px">
                                                Bill To
                                            </Text>
                                            {invoice.client || invoice.clientPhone ? (
                                                <>
                                                    <Text fontSize="sm" fontWeight="bold" color="gray.800">
                                                        {invoice.client || "Customer"}
                                                    </Text>
                                                    {invoice.clientPhone && (
                                                        <Text fontSize="xs" color="gray.600" mt={0.5}>{invoice.clientPhone}</Text>
                                                    )}
                                                </>
                                            ) : (
                                                <Text fontSize="xs" color="gray.400" fontStyle="italic">Walk-in Customer</Text>
                                            )}
                                        </Box>
                                        <Box
                                            p={2}
                                            bg="gray.50"
                                            borderRadius="md"
                                            borderLeft="3px solid"
                                            borderColor="gray.300"
                                        >
                                            <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1} textTransform="uppercase" letterSpacing="1px">
                                                From
                                            </Text>
                                            <Text fontSize="sm" fontWeight="bold" color="gray.800">{companyInfo.name}</Text>
                                            <Text fontSize="xs" color="gray.600" mt={0.5}>{companyInfo.address}</Text>
                                            <Text fontSize="xs" color="gray.600">{companyInfo.phone}</Text>
                                        </Box>
                                    </SimpleGrid>
                                </Box>
                            </Box>

                            {/* Content Area with padding for fixed header/footer */}
                            <Box className="invoice-content-area">
                                {/* Items Table */}
                                <Box px={6} mb={1}>
                                    <Box className="invoice-table" borderRadius="md" overflow="hidden" border="1px solid" borderColor="gray.200">
                                        <Table.Root size="sm">
                                            <Table.Header>
                                                <Table.Row>
                                                    <Table.ColumnHeader py={1.5} px={3} width="45%">
                                                        <Text fontSize="xs">Description <Text as="span" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>(الوصف)</Text></Text>
                                                    </Table.ColumnHeader>
                                                    <Table.ColumnHeader py={1.5} px={2} textAlign="center" width="15%">
                                                        <Text fontSize="xs">Qty <Text as="span" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>(الكمية)</Text></Text>
                                                    </Table.ColumnHeader>
                                                    <Table.ColumnHeader py={1.5} px={2} textAlign="right" width="20%">
                                                        <Text fontSize="xs">Unit Price <Text as="span" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>(سعر الوحدة)</Text></Text>
                                                    </Table.ColumnHeader>
                                                    <Table.ColumnHeader py={1.5} px={3} textAlign="right" width="20%">
                                                        <Text fontSize="xs">Amount <Text as="span" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>(المبلغ)</Text></Text>
                                                    </Table.ColumnHeader>
                                                </Table.Row>
                                            </Table.Header>
                                            <Table.Body>
                                                {invoice.items.map((item, index) => {
                                                    const amount = item.amount ?? (item.quantity * item.rate);
                                                    const product = item.productId ? productsMap.get(item.productId) : null;
                                                    return (
                                                        <Table.Row key={index}>
                                                            <Table.Cell py={1.5} px={3}>
                                                                <Text fontWeight="medium" color="gray.800" fontSize="xs">{item.description}</Text>
                                                                {product?.arabicName && (
                                                                    <Text fontSize="10px" color="gray.500" dir="rtl" mt={0.5}>{product.arabicName}</Text>
                                                                )}
                                                            </Table.Cell>
                                                            <Table.Cell textAlign="center" py={1.5} px={2}>
                                                                <Text fontWeight="semibold" color="gray.700" fontSize="xs">{item.quantity}</Text>
                                                                <Text fontSize="10px" color="gray.400" dir="rtl">{toArabic(item.quantity)}</Text>
                                                            </Table.Cell>
                                                            <Table.Cell textAlign="right" py={1.5} px={2}>
                                                                <Text color="gray.700" fontSize="xs">QAR {item.rate.toLocaleString()}</Text>
                                                                <Text fontSize="10px" color="gray.400" dir="rtl">{formatCurrency(item.rate)}</Text>
                                                            </Table.Cell>
                                                            <Table.Cell textAlign="right" py={1.5} px={3}>
                                                                <Text fontWeight="semibold" color="gray.800" fontSize="xs">QAR {amount.toLocaleString()}</Text>
                                                                <Text fontSize="10px" color="gray.400" dir="rtl">{formatCurrency(amount)}</Text>
                                                            </Table.Cell>
                                                        </Table.Row>
                                                    );
                                                })}
                                            </Table.Body>
                                        </Table.Root>
                                    </Box>
                                </Box>

                                {/* Totals Section */}
                                <Box px={6} mb={1}>
                                    <Flex justify="flex-end" gap={4} align="flex-start">
                                        {/* Totals Section */}
                                        <Box w="240px" bg="gray.50" borderRadius="md" p={2.5}>
                                            <VStack gap={1.5} align="stretch">
                                                <HStack justify="space-between">
                                                    <Text color="gray.600" fontSize="xs">Subtotal</Text>
                                                    <Box textAlign="right">
                                                        <Text fontWeight="medium" color="gray.800" fontSize="xs">QAR {invoice.subtotal.toLocaleString()}</Text>
                                                    </Box>
                                                </HStack>
                                                {invoice.discount > 0 && (
                                                    <HStack justify="space-between">
                                                        <Text color="green.600" fontSize="xs">Discount</Text>
                                                        <Text fontWeight="medium" color="green.600" fontSize="xs">-QAR {invoice.discount.toLocaleString()}</Text>
                                                    </HStack>
                                                )}
                                                <Separator />
                                                <HStack justify="space-between">
                                                    <Text fontWeight="bold" color="gray.800" fontSize="sm">TOTAL</Text>
                                                    <Box textAlign="right">
                                                        <Text fontWeight="black" color="#DC2626" fontSize="lg">QAR {invoice.total.toLocaleString()}</Text>
                                                        <Text fontSize="xs" color="gray.500" dir="rtl">{formatCurrency(invoice.total)}</Text>
                                                    </Box>
                                                </HStack>
                                            </VStack>
                                        </Box>
                                    </Flex>
                                </Box>

                                {/* Payment Method */}
                                {paymentMethod && (
                                    <Box px={6} mb={0.5}>
                                        <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={0.5}>PAYMENT METHOD</Text>
                                        <Text fontSize="sm" color="gray.800" fontWeight="medium">
                                            {paymentMethod === 'bank-transfer' ? 'Bank Transfer' : paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}
                                        </Text>
                                    </Box>
                                )}

                                {/* Notes */}
                                {invoice.notes && (
                                    <Box px={6} mb={0.5}>
                                        <Box p={2.5} bg="blue.50" borderRadius="md" borderLeft="3px solid" borderColor="blue.400">
                                            <Text fontSize="10px" fontWeight="bold" color="blue.600" mb={0.5}>NOTE</Text>
                                            <Text fontSize="xs" color="gray.700">{invoice.notes}</Text>
                                        </Box>
                                    </Box>
                                )}

                            </Box>

                            {/* Footer Wave - Orange Beautiful - Fixed to Bottom */}
                            <Box className="footer-wave" h="50px">
                                <svg viewBox="0 0 1200 50" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
                                    <defs>
                                        <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" style={{ stopColor: "#FB923C", stopOpacity: 1 }} />
                                            <stop offset="50%" style={{ stopColor: "#F97316", stopOpacity: 1 }} />
                                            <stop offset="100%" style={{ stopColor: "#EA580C", stopOpacity: 1 }} />
                                        </linearGradient>
                                    </defs>
                                    <path d="M0,50 L0,25 Q200,5 400,20 T800,18 T1200,20 L1200,50 Z" fill="url(#orangeGradient)" opacity="0.9" />
                                    <path d="M0,50 L0,35 Q300,20 600,30 T1200,28 L1200,50 Z" fill="#F97316" opacity="0.7" />
                                    <path d="M0,50 L0,40 Q400,30 800,35 L1200,33 L1200,50 Z" fill="#EA580C" />
                                </svg>
                            </Box>
                        </Card.Body>
                    </Card.Root>
                </VStack>

                {/* Send Invoice Dialog */}
                <Dialog.Root open={sendDialogOpen} onOpenChange={(e) => setSendDialogOpen(e.open)}>
                    <Portal>
                        <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
                        <Dialog.Positioner>
                            <Dialog.Content bg="white" borderRadius="xl" maxW="400px" mx={4}>
                                <Dialog.Header p={5} pb={0}>
                                    <Dialog.Title fontWeight="semibold">Send Invoice</Dialog.Title>
                                </Dialog.Header>
                                <Dialog.Body p={5}>
                                    <Text color="gray.600">Send invoice {invoice?.invoiceNumber}?</Text>
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
                            <Dialog.Content bg="white" borderRadius="xl" maxW="400px" mx={4}>
                                <Dialog.Header p={5} pb={0}>
                                    <Dialog.Title fontWeight="semibold">Delete Invoice</Dialog.Title>
                                </Dialog.Header>
                                <Dialog.Body p={5}>
                                    <Text color="gray.600">
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
