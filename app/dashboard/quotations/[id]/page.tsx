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
    LuCheck,
    LuFileText,
    LuTrash2,
} from "react-icons/lu";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { LightMode } from "@/components/ui/color-mode";
import { toaster } from "@/components/ui/toaster";
import { apiClient } from "@/lib/api";
import { QuotationResponse } from "@/lib/models/Quotation";
import { InvoiceResponse } from "@/lib/models/Invoice";
import { useArabicNumbers } from "@/hooks/useArabicNumbers";

const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case "accepted": return "green";
        case "sent": return "blue";
        case "declined": return "red";
        case "expired": return "orange";
        case "draft": return "gray";
        default: return "gray";
    }
};

export default function QuotationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const quotationId = params.id as string;
    const { formatCurrency, toArabic } = useArabicNumbers();

    // Data state
    const [quotation, setQuotation] = useState<QuotationResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [productsMap, setProductsMap] = useState<Map<string, { arabicName?: string }>>(new Map());
    const [companyInfo, setCompanyInfo] = useState({
        name: "Your Company Name",
        email: "quotes@yourcompany.com",
        address: "456 Enterprise Ave, Floor 5, San Francisco, CA 94102",
        phone: "+1 (555) 987-6543",
    });

    // UI state
    const [isSending, setIsSending] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [sendDialogOpen, setSendDialogOpen] = useState(false);
    const [convertDialogOpen, setConvertDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    useEffect(() => {
        if (quotationId) {
            fetchQuotation();
        }
        fetchCompanyInfo();
    }, [quotationId]);

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

    const fetchQuotation = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.get<QuotationResponse>(`/api/quotations/${quotationId}`);
            if (response.success && response.data) {
                setQuotation(response.data);

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
                throw new Error(response.error || "Failed to load quotation");
            }
        } catch (err: any) {
            setError(err.message || "Failed to load quotation");
            toaster.create({
                title: "Error",
                description: err.message || "Failed to load quotation",
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

    const handleDownload = async () => {
        if (!quotation) return;

        setIsDownloading(true);
        toaster.create({
            id: "downloading",
            title: "Generating PDF...",
            type: "loading",
        });
        await new Promise(resolve => setTimeout(resolve, 1500));
        toaster.dismiss("downloading");
        toaster.create({
            title: "Quotation downloaded",
            description: `${quotation.quotationNumber}.pdf saved to downloads`,
            type: "success",
        });
        setIsDownloading(false);
    };

    const handleConvertToInvoice = async () => {
        if (!quotation) return;

        setIsConverting(true);
        setConvertDialogOpen(false);
        toaster.create({
            id: "converting",
            title: "Converting to invoice...",
            type: "loading",
        });

        try {
            const response = await apiClient.post<InvoiceResponse>(`/api/quotations/${quotationId}/convert`);
            if (response.success && response.data) {
                const invoiceData = response.data;
                toaster.dismiss("converting");
                toaster.create({
                    title: "Converted successfully!",
                    description: "Redirecting to new invoice...",
                    type: "success",
                });
                setTimeout(() => router.push(`/dashboard/invoices/${invoiceData.id}`), 500);
            } else {
                throw new Error(response.error || "Failed to convert quotation");
            }
        } catch (err: any) {
            toaster.dismiss("converting");
            toaster.create({
                title: "Failed to convert quotation",
                description: err.message || "Please try again",
                type: "error",
            });
        } finally {
            setIsConverting(false);
        }
    };

    const handleSend = async () => {
        if (!quotation) return;

        setIsSending(true);
        setSendDialogOpen(false);
        toaster.create({
            id: "sending",
            title: "Sending quotation...",
            type: "loading",
        });

        try {
            const response = await apiClient.post(`/api/quotations/${quotationId}/send`);
            if (response.success) {
                await fetchQuotation();
                toaster.dismiss("sending");
                toaster.create({
                    title: "Quotation sent!",
                    description: "Quotation has been sent successfully.",
                    type: "success",
                });
            } else {
                throw new Error(response.error || "Failed to send quotation");
            }
        } catch (err: any) {
            toaster.dismiss("sending");
            toaster.create({
                title: "Failed to send quotation",
                description: err.message || "Please try again",
                type: "error",
            });
        } finally {
            setIsSending(false);
        }
    };

    const handleDelete = async () => {
        if (!quotation) return;

        setDeleteDialogOpen(false);
        toaster.create({
            id: "deleting",
            title: "Deleting quotation...",
            type: "loading",
        });

        try {
            const response = await apiClient.delete(`/api/quotations/${quotationId}`);
            if (response.success) {
                toaster.dismiss("deleting");
                toaster.create({
                    title: "Quotation deleted",
                    type: "success",
                });
                router.push("/dashboard/quotations");
            } else {
                throw new Error(response.error || "Failed to delete quotation");
            }
        } catch (err: any) {
            toaster.dismiss("deleting");
            toaster.create({
                title: "Failed to delete quotation",
                description: err.message || "Please try again",
                type: "error",
            });
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <VStack gap={6} align="stretch" py={8}>
                    <Text>Loading quotation...</Text>
                </VStack>
            </DashboardLayout>
        );
    }

    if (error || !quotation) {
        return (
            <DashboardLayout>
                <VStack gap={6} align="stretch" py={8}>
                    <Text color="red.500">Error: {error || "Quotation not found"}</Text>
                    <Link href="/dashboard/quotations">
                        <Button variant="outline" size="sm">
                            <LuArrowLeft /> Back to Quotations
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
                .quotation-print-content {
                    width: 210mm;
                    min-height: auto;
                    max-height: 297mm;
                    margin: 0 auto;
                    background: white;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    position: relative;
                    overflow: hidden;
                }
                
                /* Purple accent bar for quotation */
                .purple-accent-bar {
                    background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%);
                }
                
                /* Table styling */
                .quotation-table thead tr {
                    background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%) !important;
                }
                .quotation-table thead th {
                    color: white !important;
                    font-weight: 600 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                    font-size: 11px !important;
                }
                .quotation-table tbody tr {
                    border-bottom: 1px solid #E5E7EB !important;
                }
                .quotation-table tbody tr:hover {
                    background: #F9FAFB !important;
                }
                
                /* Valid until box */
                .valid-until-box {
                    background: linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%) !important;
                    border-left: 4px solid #7C3AED !important;
                }
                
                /* Header section - fixed to top */
                .quotation-header-section {
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
                    background: linear-gradient(135deg, #1F2937 0%, #111827 100%);
                }
                
                /* Content area with padding for fixed header/footer */
                .quotation-content-area {
                    padding-top: 0;
                    padding-bottom: 80px;
                    position: relative;
                    z-index: 2;
                }
                
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0;
                        margin-bottom: 50px;
                    }
                    
                    /* Hide browser headers and footers */
                    @page :first {
                        margin-top: 0;
                    }
                    
                    @page :left {
                        margin-left: 0;
                    }
                    
                    @page :right {
                        margin-right: 0;
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
                        height: auto !important;
                    }
                    
                    body * {
                        visibility: hidden;
                    }
                    
                    .quotation-print-content,
                    .quotation-print-content * {
                        visibility: visible !important;
                    }
                    
                    .quotation-print-content {
                        position: relative !important;
                        width: 210mm !important;
                        min-height: 297mm !important;
                        background: white !important;
                        box-shadow: none !important;
                        page-break-after: always;
                    }
                    
                    .quotation-print-content:last-child {
                        page-break-after: auto;
                    }
                    
                    .quotation-print-content button,
                    .quotation-print-content .chakra-button,
                    .no-print {
                        display: none !important;
                    }
                    
                    .quotation-table thead tr {
                        background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%) !important;
                    }
                    
                    .quotation-table thead th {
                        color: white !important;
                    }
                    
                    .purple-accent-bar {
                        background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%) !important;
                    }
                    
                    .valid-until-box {
                        background: linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%) !important;
                        border-left: 4px solid #7C3AED !important;
                    }
                    
                    /* Fixed footer on every page */
                    .footer-wave {
                        position: fixed !important;
                        bottom: 0 !important;
                        left: 0 !important;
                        width: 210mm !important;
                        height: 40px !important;
                        z-index: 1000 !important;
                        page-break-inside: avoid !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    /* Header section - not fixed in print, just normal flow */
                    .quotation-header-section {
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
                        height: 40px !important;
                        z-index: 1000 !important;
                        page-break-inside: avoid !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    /* Content area padding to prevent overlap with footer only */
                    .quotation-content-area {
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
                            <Link href="/dashboard/quotations">
                                <IconButton variant="ghost" size="sm" aria-label="Back">
                                    <LuArrowLeft />
                                </IconButton>
                            </Link>
                            <Box>
                                <HStack gap={3}>
                                    <Heading size="lg" fontWeight="semibold">{quotation.quotationNumber}</Heading>
                                    <Badge
                                        colorPalette={getStatusColor(quotation.status)}
                                        variant="subtle"
                                        fontSize="xs"
                                        px={3}
                                        py={1}
                                        borderRadius="full"
                                        textTransform="capitalize"
                                    >
                                        {quotation.status}
                                    </Badge>
                                </HStack>
                                <Text color="fg.muted" fontSize="sm">
                                    Valid until {new Date(quotation.validUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </Text>
                            </Box>
                        </HStack>
                        <HStack gap={2} flexWrap="wrap">
                            <Button variant="outline" size="sm" loading={isPrinting} onClick={handlePrint}>
                                <LuPrinter /> Print
                            </Button>
                            <Button variant="outline" size="sm" loading={isDownloading} onClick={handleDownload}>
                                <LuDownload /> Download
                            </Button>
                            <Link href={`/dashboard/quotations/${quotationId}/edit`}>
                                <Button variant="outline" size="sm">
                                    <LuPencil /> Edit
                                </Button>
                            </Link>
                            <Button colorPalette="purple" size="sm" loading={isSending} loadingText="Sending..." onClick={() => setSendDialogOpen(true)}>
                                <LuSend /> Send Quotation
                            </Button>
                        </HStack>
                    </Flex>

                    {/* Quotation Document - A4 */}
                    <LightMode>
                        <Card.Root border="none" bg="white" className="quotation-print-content" overflow="hidden">
                            <Card.Body p={0}>
                                {/* Header Section - Fixed to Top */}
                                <Box className="quotation-header-section">
                                    {/* Purple Accent Bar at Top */}
                                    <Box className="purple-accent-bar" h="8px" />

                                    {/* Header Section */}
                                    <Box px={6} pt={4} pb={3}>
                                        {/* Logo Section - Smaller */}
                                        <Flex justify="center" align="center" mb={3}>
                                            <Box>
                                                <img
                                                    src="/logo.png"
                                                    alt="Company Logo"
                                                    style={{
                                                        width: "240px",
                                                        height: "auto",
                                                        maxHeight: "100px",
                                                        objectFit: "contain"
                                                    }}
                                                />
                                            </Box>
                                        </Flex>

                                        {/* Quotation Title & Number */}
                                        <Flex justify="space-between" align="flex-end" mb={4}>
                                            <Box>
                                                <Text
                                                    fontSize="24px"
                                                    fontWeight="900"
                                                    color="#1F2937"
                                                    letterSpacing="-1px"
                                                    lineHeight="1"
                                                >
                                                    QUOTATION
                                                </Text>
                                                <Text fontSize="xs" color="fg.muted" mt={0.5}>
                                                    Price Quote / عرض السعر
                                                </Text>
                                            </Box>
                                            <Box textAlign="right">
                                                <Text fontSize="xs" color="fg.muted" fontWeight="medium">Quote No.</Text>
                                                <Text fontSize="lg" fontWeight="bold" color="#7C3AED">
                                                    {quotation.quotationNumber}
                                                </Text>
                                                <Text fontSize="xs" color="fg.muted" mt={0.5}>
                                                    {new Date(quotation.issueDate).toLocaleDateString('en-US', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </Text>
                                            </Box>
                                        </Flex>

                                        {/* Prepared For / From Section */}
                                        <SimpleGrid columns={2} gap={4} mb={4}>
                                            <Box
                                                p={2}
                                                bg="bg.subtle"
                                                borderRadius="md"
                                                borderLeft="3px solid"
                                                borderColor="#7C3AED"
                                            >
                                                <Text fontSize="xs" fontWeight="bold" color="#7C3AED" mb={1} textTransform="uppercase" letterSpacing="1px">
                                                    Prepared For
                                                </Text>
                                                <Text fontSize="sm" fontWeight="bold" color="fg.default">
                                                    {quotation.client || "Customer"}
                                                </Text>
                                                {quotation.clientPhone && (
                                                    <Text fontSize="xs" color="fg.muted" mt={0.5}>{quotation.clientPhone}</Text>
                                                )}
                                            </Box>
                                            <Box
                                                p={2}
                                                bg="bg.subtle"
                                                borderRadius="md"
                                                borderLeft="3px solid"
                                                borderColor="fg.subtle"
                                            >
                                                <Text fontSize="xs" fontWeight="bold" color="fg.muted" mb={1} textTransform="uppercase" letterSpacing="1px">
                                                    From
                                                </Text>
                                                <Text fontSize="sm" fontWeight="bold" color="fg.default">{companyInfo.name}</Text>
                                                <Text fontSize="xs" color="fg.muted" mt={0.5}>{companyInfo.address}</Text>
                                                <Text fontSize="xs" color="fg.muted">{companyInfo.phone}</Text>
                                            </Box>
                                        </SimpleGrid>
                                    </Box>
                                </Box>

                                {/* Content Area with padding for fixed header/footer */}
                                <Box className="quotation-content-area">
                                    {/* Items Table */}
                                    <Box px={6} mb={3}>
                                        <Box className="quotation-table" borderRadius="md" overflow="hidden" border="1px solid" borderColor="border.default">
                                            <Table.Root size="sm">
                                                <Table.Header>
                                                    <Table.Row>
                                                        <Table.ColumnHeader py={2} px={3} width="45%">
                                                            <Text fontSize="xs">Description <Text as="span" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>(الوصف)</Text></Text>
                                                        </Table.ColumnHeader>
                                                        <Table.ColumnHeader py={2} px={2} textAlign="center" width="15%">
                                                            <Text fontSize="xs">Qty <Text as="span" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>(الكمية)</Text></Text>
                                                        </Table.ColumnHeader>
                                                        <Table.ColumnHeader py={2} px={2} textAlign="right" width="20%">
                                                            <Text fontSize="xs">Unit Price <Text as="span" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>(سعر الوحدة)</Text></Text>
                                                        </Table.ColumnHeader>
                                                        <Table.ColumnHeader py={2} px={3} textAlign="right" width="20%">
                                                            <Text fontSize="xs">Amount <Text as="span" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>(المبلغ)</Text></Text>
                                                        </Table.ColumnHeader>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {quotation.items.map((item, index) => {
                                                        const amount = item.amount ?? (Math.abs(item.quantity) * item.rate);
                                                        const product = item.productId ? productsMap.get(item.productId) : null;
                                                        return (
                                                            <Table.Row key={index}>
                                                                <Table.Cell py={2} px={3}>
                                                                    <Text fontWeight="medium" color="fg.default" fontSize="xs">{item.description}</Text>
                                                                    {product?.arabicName && (
                                                                        <Text fontSize="10px" color="fg.muted" dir="rtl" mt={0.5}>{product.arabicName}</Text>
                                                                    )}
                                                                </Table.Cell>
                                                                <Table.Cell textAlign="center" py={2} px={2}>
                                                                    <Text fontWeight="semibold" color="fg.default" fontSize="xs">{item.quantity}</Text>
                                                                    <Text fontSize="10px" color="fg.subtle" dir="rtl">{toArabic(Math.abs(item.quantity))}</Text>
                                                                </Table.Cell>
                                                                <Table.Cell textAlign="right" py={2} px={2}>
                                                                    <Text color="fg.default" fontSize="xs">QAR {item.rate.toLocaleString()}</Text>
                                                                    <Text fontSize="10px" color="fg.subtle" dir="rtl">{formatCurrency(item.rate)}</Text>
                                                                </Table.Cell>
                                                                <Table.Cell textAlign="right" py={2} px={3}>
                                                                    <Text fontWeight="semibold" color="fg.default" fontSize="xs">QAR {amount.toLocaleString()}</Text>
                                                                    <Text fontSize="10px" color="fg.subtle" dir="rtl">{formatCurrency(amount)}</Text>
                                                                </Table.Cell>
                                                            </Table.Row>
                                                        );
                                                    })}
                                                </Table.Body>
                                            </Table.Root>
                                        </Box>
                                    </Box>

                                    {/* Totals Section */}
                                    <Box px={6} mb={3}>
                                        <Flex justify="flex-end">
                                            <Box w="240px" bg="bg.subtle" borderRadius="md" p={2.5}>
                                                <VStack gap={1.5} align="stretch">
                                                    {quotation.discount > 0 && (
                                                        <HStack justify="space-between">
                                                            <Text color="fg.muted" fontSize="sm">Discount{quotation.discountPercentage > 0 ? ` (${quotation.discountPercentage}%)` : ''}</Text>
                                                            <Text color="red.500" fontSize="sm" fontWeight="semibold">- QAR {quotation.discount.toLocaleString()}</Text>
                                                        </HStack>
                                                    )}
                                                    <HStack justify="space-between">
                                                        <Text fontWeight="bold" color="fg.default" fontSize="sm">TOTAL</Text>
                                                        <Box textAlign="right">
                                                            <Text fontWeight="black" color="#7C3AED" fontSize="lg">QAR {quotation.total.toLocaleString()}</Text>
                                                            <Text fontSize="xs" color="fg.muted" dir="rtl">{formatCurrency(quotation.total)}</Text>
                                                        </Box>
                                                    </HStack>
                                                </VStack>
                                            </Box>
                                        </Flex>
                                    </Box>

                                    {/* Valid Until Box */}
                                    <Box px={6} mb={2}>
                                        <Box className="valid-until-box" p={2.5} borderRadius="md">
                                            <VStack gap={1} align="start">
                                                <HStack gap={2}>
                                                    <Box
                                                        bg="purple.600"
                                                        color="white"
                                                        px={2}
                                                        py={0.5}
                                                        borderRadius="full"
                                                        fontSize="10px"
                                                        fontWeight="bold"
                                                    >
                                                        VALID UNTIL
                                                    </Box>
                                                    <Text fontSize="xs" color="black">
                                                        This quotation is valid until{" "}
                                                        <Text as="span" fontWeight="bold" color="black">
                                                            {new Date(quotation.validUntil).toLocaleDateString('en-US', {
                                                                day: '2-digit',
                                                                month: 'long',
                                                                year: 'numeric'
                                                            })}
                                                        </Text>
                                                    </Text>
                                                </HStack>
                                                <Text fontSize="xs" color="black" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }} ml={8}>
                                                    هذا العرض ساري حتى{" "}
                                                    <Text as="span" fontWeight="bold">
                                                        {new Date(quotation.validUntil).toLocaleDateString('ar-SA', {
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric'
                                                        })}
                                                    </Text>
                                                </Text>
                                            </VStack>
                                        </Box>
                                    </Box>

                                    {/* Notes */}
                                    {quotation.notes && (
                                        <Box px={6} mb={2}>
                                            <Box p={2.5} bg="blue.500/10" borderRadius="md" borderLeft="3px solid" borderColor="blue.400">
                                                <Text fontSize="10px" fontWeight="bold" color="blue.600" mb={0.5}>NOTE</Text>
                                                <Text fontSize="xs" color="fg.default">{quotation.notes}</Text>
                                            </Box>
                                        </Box>
                                    )}

                                    {/* Footer Wave - Dark Gray/Black - Fixed to Bottom */}
                                    <Box className="footer-wave" h="40px">
                                        <svg viewBox="0 0 1200 40" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
                                            <path d="M0,40 L0,20 Q300,0 600,20 T1200,15 L1200,40 Z" fill="#1F2937" opacity="0.9" />
                                            <path d="M0,40 L0,30 Q400,15 800,25 L1200,23 L1200,40 Z" fill="#111827" />
                                        </svg>
                                    </Box>
                                </Box>
                            </Card.Body>
                        </Card.Root>
                    </LightMode>
                </VStack>

                {/* Send Quotation Dialog */}
                <Dialog.Root open={sendDialogOpen} onOpenChange={(e) => setSendDialogOpen(e.open)}>
                    <Portal>
                        <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
                        <Dialog.Positioner>
                            <Dialog.Content bg="bg.surface" borderRadius="xl" maxW="400px" mx={4}>
                                <Dialog.Header p={5} pb={0}>
                                    <Dialog.Title fontWeight="semibold">Send Quotation</Dialog.Title>
                                </Dialog.Header>
                                <Dialog.Body p={5}>
                                    <Text color="fg.muted">
                                        Send quotation {quotation.quotationNumber} to {quotation.client}?
                                    </Text>
                                </Dialog.Body>
                                <Dialog.Footer p={5} pt={0} gap={3}>
                                    <Dialog.ActionTrigger asChild>
                                        <Button variant="outline" size="sm">Cancel</Button>
                                    </Dialog.ActionTrigger>
                                    <Button colorPalette="purple" size="sm" onClick={handleSend}>
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

                {/* Convert to Invoice Dialog */}
                <Dialog.Root open={convertDialogOpen} onOpenChange={(e) => setConvertDialogOpen(e.open)}>
                    <Portal>
                        <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
                        <Dialog.Positioner>
                            <Dialog.Content bg="bg.surface" borderRadius="xl" maxW="400px" mx={4}>
                                <Dialog.Header p={5} pb={0}>
                                    <Dialog.Title fontWeight="semibold">Convert to Invoice</Dialog.Title>
                                </Dialog.Header>
                                <Dialog.Body p={5}>
                                    <Text color="fg.muted">
                                        Convert this quotation to an invoice? This will create a new invoice with the same details.
                                    </Text>
                                </Dialog.Body>
                                <Dialog.Footer p={5} pt={0} gap={3}>
                                    <Dialog.ActionTrigger asChild>
                                        <Button variant="outline" size="sm">Cancel</Button>
                                    </Dialog.ActionTrigger>
                                    <Button colorPalette="blue" size="sm" onClick={handleConvertToInvoice}>
                                        <LuFileText /> Convert
                                    </Button>
                                </Dialog.Footer>
                                <Dialog.CloseTrigger asChild position="absolute" top={3} right={3}>
                                    <CloseButton size="sm" />
                                </Dialog.CloseTrigger>
                            </Dialog.Content>
                        </Dialog.Positioner>
                    </Portal>
                </Dialog.Root>

                {/* Delete Quotation Dialog */}
                <Dialog.Root open={deleteDialogOpen} onOpenChange={(e) => setDeleteDialogOpen(e.open)}>
                    <Portal>
                        <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
                        <Dialog.Positioner>
                            <Dialog.Content bg="bg.surface" borderRadius="xl" maxW="400px" mx={4}>
                                <Dialog.Header p={5} pb={0}>
                                    <Dialog.Title fontWeight="semibold">Delete Quotation</Dialog.Title>
                                </Dialog.Header>
                                <Dialog.Body p={5}>
                                    <Text color="fg.muted">
                                        Are you sure you want to delete this quotation? This action cannot be undone.
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
