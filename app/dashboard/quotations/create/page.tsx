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
    Input,
    Textarea,
    SimpleGrid,
    Separator,
    IconButton,
    Flex,
    Field,
    Dialog,
    Portal,
    CloseButton,
    List,
    Icon,
} from "@chakra-ui/react";
import {
    LuArrowLeft,
    LuPlus,
    LuTrash2,
    LuSave,
    LuSend,
    LuX,
    LuRotateCcw,
    LuPackage,
    LuUser,
} from "react-icons/lu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { toaster } from "@/components/ui/toaster";
import { apiClient } from "@/lib/api";
import { ProductResponse } from "@/lib/models/Product";
import { ClientResponse } from "@/lib/models/Client";
import { PaginatedResponse } from "@/types/api";

interface QuotationItem {
    id: number;
    description: string;
    quantity: number;
    rate: number;
    isReturn?: boolean;
    productId?: string;
    productStock?: number; // Store product stock for validation
}

export default function CreateQuotationPage() {
    const router = useRouter();
    const [items, setItems] = useState<QuotationItem[]>([
        { id: 1, description: "", quantity: 1, rate: 0, isReturn: false },
    ]);
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [clientId, setClientId] = useState<string | undefined>();
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [validUntil, setValidUntil] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [notes, setNotes] = useState("");
    const [discountPercentage, setDiscountPercentage] = useState<number | null>(null);
    const [isDiscountEditing, setIsDiscountEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
    const [sendDialogOpen, setSendDialogOpen] = useState(false);

    // Product selection state
    const [products, setProducts] = useState<ProductResponse[]>([]);
    const [productSearchQueries, setProductSearchQueries] = useState<{ [key: number]: string }>({});
    const [showProductDropdown, setShowProductDropdown] = useState<{ [key: number]: boolean }>({});
    const [isSearchingProducts, setIsSearchingProducts] = useState<{ [key: number]: boolean }>({});
    const [searchDebounceTimers, setSearchDebounceTimers] = useState<{ [key: number]: NodeJS.Timeout }>({});

    // Client autocomplete state
    const [clients, setClients] = useState<ClientResponse[]>([]);
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [isSearchingClients, setIsSearchingClients] = useState(false);
    const [clientSearchDebounceTimer, setClientSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);

    // Fetch initial products on mount
    useEffect(() => {
        fetchProducts("");
    }, []);

    const fetchProducts = async (searchQuery: string = "") => {
        try {
            const params = new URLSearchParams();
            if (searchQuery) {
                params.append('search', searchQuery);
            }
            params.append('limit', '50');

            const response = await apiClient.get<PaginatedResponse<ProductResponse>>(`/api/inventory?${params.toString()}`);
            if (response.success && response.data) {
                setProducts(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch products:", error);
        }
    };

    const fetchClients = async (searchQuery: string = "") => {
        try {
            const params = new URLSearchParams();
            if (searchQuery) {
                params.append('search', searchQuery);
            }
            params.append('limit', '20');

            const response = await apiClient.get<ClientResponse[]>(`/api/clients?${params.toString()}`);
            if (response.success && response.data) {
                setClients(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch clients:", error);
        }
    };

    // Debounced product search
    const debouncedProductSearch = (itemId: number, query: string) => {
        if (searchDebounceTimers[itemId]) {
            clearTimeout(searchDebounceTimers[itemId]);
        }

        setIsSearchingProducts({ ...isSearchingProducts, [itemId]: true });

        const timer = setTimeout(async () => {
            await fetchProducts(query);
            setIsSearchingProducts({ ...isSearchingProducts, [itemId]: false });
            const newTimers = { ...searchDebounceTimers };
            delete newTimers[itemId];
            setSearchDebounceTimers(newTimers);
        }, 300);

        setSearchDebounceTimers({ ...searchDebounceTimers, [itemId]: timer });
    };

    // Debounced client search
    const debouncedClientSearch = (query: string) => {
        if (clientSearchDebounceTimer) {
            clearTimeout(clientSearchDebounceTimer);
        }

        setIsSearchingClients(true);

        const timer = setTimeout(async () => {
            await fetchClients(query);
            setIsSearchingClients(false);
            setClientSearchDebounceTimer(null);
        }, 300);

        setClientSearchDebounceTimer(timer);
    };

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            Object.values(searchDebounceTimers).forEach(timer => {
                if (timer) clearTimeout(timer);
            });
            if (clientSearchDebounceTimer) clearTimeout(clientSearchDebounceTimer);
        };
    }, []);

    const addItem = () => {
        const newId = Date.now();
        setItems([...items, { id: newId, description: "", quantity: 1, rate: 0, isReturn: false }]);
        setProductSearchQueries({ ...productSearchQueries, [newId]: "" });
    };

    const selectProduct = (itemId: number, product: ProductResponse) => {
        setItems(items.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    description: product.name,
                    rate: product.sellingPrice,
                    productId: product.id,
                    productStock: product.stock, // Store stock for validation
                };
            }
            return item;
        }));
        setProductSearchQueries({ ...productSearchQueries, [itemId]: product.name });
        setShowProductDropdown({ ...showProductDropdown, [itemId]: false });
    };

    const selectClient = (client: ClientResponse) => {
        setClientName(client.name);
        setClientPhone(client.phone || "");
        setClientId(client.id);
        setShowClientDropdown(false);
    };

    const filteredProducts = (itemId: number) => {
        const query = productSearchQueries[itemId] || "";
        if (!query) return products.slice(0, 10);
        return products.filter(product =>
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.sku?.toLowerCase().includes(query.toLowerCase()) || false
        ).slice(0, 10);
    };

    const toggleReturn = (id: number) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, isReturn: !item.isReturn } : item
        ));
    };

    const removeItem = (id: number) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const updateItem = (id: number, field: keyof QuotationItem, value: string | number) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    // Calculate subtotal (regular items) and returns separately
    const subtotal = items
        .filter(item => !item.isReturn)
        .reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const returns = items
        .filter(item => item.isReturn)
        .reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const netSubtotal = subtotal - returns;
    const discountPct = discountPercentage !== null ? discountPercentage : 0;
    const discountAmount = netSubtotal * discountPct / 100;
    const total = netSubtotal - discountAmount;

    // Check if there are unsaved changes
    const hasUnsavedChanges = items.some(item =>
        item.description || item.quantity > 0 || item.rate > 0
    ) || clientName || clientPhone || notes || discountPercentage !== null;

    // No stock validation for quotations - quotations don't affect inventory
    const validateStockQuantities = (): { valid: boolean; error?: string } => {
        // Quotations don't affect inventory, so no validation needed
        return { valid: true };
    };

    // Add beforeunload warning for unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges && !isSaving && !isSending) {
                e.preventDefault();
                e.returnValue = ''; // Chrome requires returnValue to be set
                return ''; // For older browsers
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges, isSaving, isSending]);

    const handleSaveDraft = async () => {
        if (!clientName) {
            toaster.create({
                title: "Missing information",
                description: "Please fill in client name.",
                type: "error",
            });
            return;
        }

        setIsSaving(true);
        toaster.create({
            id: "saving-draft",
            title: "Saving draft...",
            type: "loading",
        });

        try {
            // Validate stock quantities
            const stockValidation = validateStockQuantities();
            if (!stockValidation.valid) {
                toaster.create({
                    title: "Stock validation failed",
                    description: stockValidation.error,
                    type: "error",
                });
                setIsSaving(false);
                return;
            }

            // Save or update client
            let finalClientId = clientId;
            if (!clientId && clientName) {
                const clientResponse = await apiClient.post("/api/clients", {
                    name: clientName,
                    phone: clientPhone || undefined,
                });
                if (clientResponse.success && clientResponse.data) {
                    finalClientId = (clientResponse.data as any).id;
                }
            }

            if (items.length === 0 || items.some(item => !item.description || item.quantity === 0 || item.rate < 0)) {
                toaster.create({
                    title: "Invalid items",
                    description: "Please add at least one item with description, quantity (not zero), and rate (non-negative).",
                    type: "error",
                });
                setIsSaving(false);
                return;
            }

            const quotationItems = items.map(item => ({
                description: item.description,
                quantity: item.isReturn ? -Math.abs(item.quantity) : item.quantity,
                rate: item.rate,
                productId: item.productId,
            }));

            const response = await apiClient.post("/api/quotations", {
                clientName,
                clientPhone: clientPhone || undefined,
                clientId: finalClientId,
                items: quotationItems,
                discountPercentage: discountPct,
                issueDate: issueDate,
                validUntil: validUntil,
                notes: notes || undefined,
                status: "Draft",
            });

            if (response.success) {
                toaster.dismiss("saving-draft");
                toaster.create({
                    title: "Draft saved",
                    description: "Your quotation has been saved as a draft.",
                    type: "success",
                });
                router.push("/dashboard/quotations");
            } else {
                throw new Error(response.error || "Failed to save draft");
            }
        } catch (error) {
            toaster.dismiss("saving-draft");
            toaster.create({
                title: "Failed to save draft",
                description: error instanceof Error ? error.message : "Please try again",
                type: "error",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSend = async () => {
        if (!clientName) {
            toaster.create({
                title: "Missing information",
                description: "Please fill in client name.",
                type: "error",
            });
            return;
        }

        setSendDialogOpen(false);
        setIsSending(true);
        toaster.create({
            id: "sending-quotation",
            title: "Creating and sending quotation...",
            type: "loading",
        });

        try {
            // Validate stock quantities
            const stockValidation = validateStockQuantities();
            if (!stockValidation.valid) {
                toaster.create({
                    title: "Stock validation failed",
                    description: stockValidation.error,
                    type: "error",
                });
                setIsSending(false);
                return;
            }

            // Save or update client
            let finalClientId = clientId;
            if (!clientId && clientName) {
                const clientResponse = await apiClient.post("/api/clients", {
                    name: clientName,
                    phone: clientPhone || undefined,
                });
                if (clientResponse.success && clientResponse.data) {
                    finalClientId = (clientResponse.data as any).id;
                }
            }

            if (items.length === 0 || items.some(item => !item.description || item.quantity === 0 || item.rate < 0)) {
                toaster.create({
                    title: "Invalid items",
                    description: "Please add at least one item with description, quantity (not zero), and rate (non-negative).",
                    type: "error",
                });
                setIsSending(false);
                return;
            }

            const hasRegularItem = items.some(item => !item.isReturn);
            if (!hasRegularItem) {
                toaster.create({
                    title: "Invalid items",
                    description: "Please add at least one regular item (not a return).",
                    type: "error",
                });
                setIsSending(false);
                return;
            }

            const quotationItems = items.map(item => ({
                description: item.description,
                quantity: item.isReturn ? -Math.abs(item.quantity) : item.quantity,
                rate: item.rate,
                productId: item.productId,
            }));

            const response = await apiClient.post("/api/quotations", {
                clientName,
                clientPhone: clientPhone || undefined,
                clientId: finalClientId,
                items: quotationItems,
                discountPercentage: discountPct,
                issueDate: issueDate,
                validUntil: validUntil,
                notes: notes || undefined,
                status: "Sent",
            });

            if (response.success && response.data) {
                const quotationData = response.data as any;
                const quotationId = quotationData.id || quotationData._id;

                if (quotationId) {
                    try {
                        await apiClient.post(`/api/quotations/${quotationId}/send`);
                    } catch (sendError) {
                        console.warn('Failed to send quotation:', sendError);
                    }
                }

                toaster.dismiss("sending-quotation");
                toaster.create({
                    title: "Quotation created and sent!",
                    description: `Quotation has been created successfully.`,
                    type: "success",
                });
                router.push("/dashboard/quotations");
            } else {
                throw new Error(response.error || "Failed to create quotation");
            }
        } catch (error) {
            toaster.dismiss("sending-quotation");
            toaster.create({
                title: "Failed to create quotation",
                description: error instanceof Error ? error.message : "Please try again",
                type: "error",
            });
        } finally {
            setIsSending(false);
        }
    };

    const handleDiscard = () => {
        setDiscardDialogOpen(false);
        toaster.create({
            title: "Draft discarded",
            type: "info",
        });
        router.push("/dashboard/quotations");
    };

    return (
        <DashboardLayout>
            <VStack gap={6} align="stretch">
                {/* Header */}
                <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
                    <HStack gap={4}>
                        <Link href="/dashboard/quotations">
                            <IconButton variant="ghost" size="sm" aria-label="Back">
                                <LuArrowLeft />
                            </IconButton>
                        </Link>
                        <Box>
                            <Heading size="lg" fontWeight="semibold">Create Quotation</Heading>
                            <Text color="fg.muted" fontSize="sm">Fill in the details to create a new quotation</Text>
                        </Box>
                    </HStack>
                    <HStack gap={2} flexWrap="wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSaveDraft}
                            loading={isSaving}
                            loadingText="Saving..."
                        >
                            <LuSave /> <Text display={{ base: "none", sm: "inline" }}>Save Draft</Text>
                        </Button>
                        <Button
                            colorPalette="purple"
                            size="sm"
                            onClick={() => setSendDialogOpen(true)}
                            loading={isSending}
                            loadingText="Sending..."
                        >
                            <LuSend /> <Text display={{ base: "none", sm: "inline" }}>Create & Send</Text>
                        </Button>
                    </HStack>
                </Flex>

                <SimpleGrid columns={{ base: 1, lg: 3 }} gap={6}>
                    {/* Main Form */}
                    <Box gridColumn={{ base: "1", lg: "span 2" }}>
                        <VStack gap={6} align="stretch">
                            {/* Client Info */}
                            <Card.Root border="1px solid" borderColor="border.default" bg="bg.surface">
                                <Card.Header p={5} pb={0}>
                                    <Heading size="sm" fontWeight="semibold">Client Information</Heading>
                                </Card.Header>
                                <Card.Body p={5}>
                                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                                        <Field.Root flex={1}>
                                            <Field.Label fontSize="sm">Client Name</Field.Label>
                                            <Box position="relative" w="100%">
                                                <Input
                                                    placeholder="Search or enter client name"
                                                    size="sm"
                                                    w="100%"
                                                    value={clientName}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setClientName(value);
                                                        if (value.length > 0) {
                                                            setShowClientDropdown(true);
                                                            debouncedClientSearch(value);
                                                        } else {
                                                            setShowClientDropdown(false);
                                                        }
                                                    }}
                                                    onFocus={() => {
                                                        if (clientName.length > 0) {
                                                            setShowClientDropdown(true);
                                                            fetchClients(clientName);
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        setTimeout(() => {
                                                            setShowClientDropdown(false);
                                                        }, 200);
                                                    }}
                                                />
                                                {showClientDropdown && clients.length > 0 && (
                                                    <Box
                                                        position="absolute"
                                                        top="100%"
                                                        left={0}
                                                        right={0}
                                                        zIndex={1000}
                                                        bg="bg.surface"
                                                        borderWidth="1px"
                                                        borderColor="border.default"
                                                        borderRadius="md"
                                                        shadow="lg"
                                                        mt={1}
                                                        maxH="200px"
                                                        overflowY="auto"
                                                    >
                                                        <List.Root>
                                                            {clients.map((client) => (
                                                                <List.Item
                                                                    key={client.id}
                                                                    cursor="pointer"
                                                                    _hover={{ bg: "purple.500/10" }}
                                                                    onClick={() => selectClient(client)}
                                                                    p={2}
                                                                    borderBottomWidth="1px"
                                                                    borderColor="border.default"
                                                                >
                                                                    <HStack gap={2}>
                                                                        <Icon color="purple.500"><LuUser /></Icon>
                                                                        <VStack align="start" gap={0} flex={1}>
                                                                            <Text fontSize="sm" fontWeight="medium">{client.name}</Text>
                                                                            <Text fontSize="xs" color="fg.muted">{client.phone}</Text>
                                                                        </VStack>
                                                                    </HStack>
                                                                </List.Item>
                                                            ))}
                                                        </List.Root>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Field.Root>
                                        <Field.Root flex={1}>
                                            <Field.Label fontSize="sm">Phone</Field.Label>
                                            <Input
                                                placeholder="+1 (555) 000-0000"
                                                size="sm"
                                                w="100%"
                                                value={clientPhone}
                                                onChange={(e) => setClientPhone(e.target.value)}
                                            />
                                        </Field.Root>
                                    </SimpleGrid>
                                </Card.Body>
                            </Card.Root>

                            {/* Quotation Details */}
                            <Card.Root border="1px solid" borderColor="border.default" bg="bg.surface">
                                <Card.Header p={5} pb={0}>
                                    <Heading size="sm" fontWeight="semibold">Quotation Details</Heading>
                                </Card.Header>
                                <Card.Body p={5}>
                                    <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                                        <Field.Root>
                                            <Field.Label fontSize="sm">Quotation Number</Field.Label>
                                            <Input value="Auto-generated" readOnly size="sm" bg="bg.subtle" />
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label fontSize="sm">Issue Date</Field.Label>
                                            <Input
                                                type="date"
                                                size="sm"
                                                value={issueDate}
                                                onChange={(e) => setIssueDate(e.target.value)}
                                            />
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label fontSize="sm">Valid Until</Field.Label>
                                            <Input
                                                type="date"
                                                size="sm"
                                                value={validUntil}
                                                onChange={(e) => setValidUntil(e.target.value)}
                                            />
                                        </Field.Root>
                                    </SimpleGrid>
                                </Card.Body>
                            </Card.Root>

                            {/* Line Items - Same as invoice */}
                            <Card.Root border="1px solid" borderColor="border.default" bg="bg.surface">
                                <Card.Header p={5} pb={0}>
                                    <Flex justify="space-between" align="center">
                                        <Heading size="sm" fontWeight="semibold">Line Items</Heading>
                                        <Button variant="ghost" size="xs" onClick={addItem}>
                                            <LuPlus /> Add Item
                                        </Button>
                                    </Flex>
                                </Card.Header>
                                <Card.Body p={5}>
                                    {/* Desktop view */}
                                    <Box display={{ base: "none", md: "block" }}>
                                        <VStack gap={3} align="stretch">
                                            {items.map((item, index) => (
                                                <HStack key={item.id} gap={{ base: 2, md: 3 }} align="flex-end" flexWrap={{ base: "wrap", md: "nowrap" }}>
                                                    <Box flex={{ base: 1, md: 3, lg: 4 }} minW={{ base: "100%", md: "200px", lg: "250px" }} position="relative">
                                                        {index === 0 && <Text fontSize="xs" color="fg.muted" mb={1}>Description</Text>}
                                                        <Box position="relative">
                                                            <Input
                                                                placeholder="Search product or enter description"
                                                                size={{ base: "md", md: "sm" }}
                                                                value={productSearchQueries[item.id] !== undefined && productSearchQueries[item.id] !== "" ? productSearchQueries[item.id] : item.description}
                                                                onChange={(e) => {
                                                                    const value = e.target.value;
                                                                    setProductSearchQueries({ ...productSearchQueries, [item.id]: value });
                                                                    if (!showProductDropdown[item.id]) {
                                                                        setShowProductDropdown({ ...showProductDropdown, [item.id]: true });
                                                                    }
                                                                    if (!products.some(p => p.name.toLowerCase() === value.toLowerCase())) {
                                                                        updateItem(item.id, 'description', value);
                                                                    }
                                                                    if (value.length > 0) {
                                                                        debouncedProductSearch(item.id, value);
                                                                    } else {
                                                                        fetchProducts("");
                                                                    }
                                                                }}
                                                                onFocus={() => setShowProductDropdown({ ...showProductDropdown, [item.id]: true })}
                                                                onBlur={() => {
                                                                    setTimeout(() => {
                                                                        setShowProductDropdown({ ...showProductDropdown, [item.id]: false });
                                                                    }, 200);
                                                                }}
                                                                borderColor={item.isReturn ? "red.500/30" : undefined}
                                                                bg={item.isReturn ? "red.500/10" : undefined}
                                                            />
                                                            {showProductDropdown[item.id] && (
                                                                <Box
                                                                    position="absolute"
                                                                    top="100%"
                                                                    left={0}
                                                                    right={0}
                                                                    zIndex={1000}
                                                                    bg="bg.surface"
                                                                    borderWidth="1px"
                                                                    borderColor="border.default"
                                                                    borderRadius="md"
                                                                    shadow="lg"
                                                                    mt={1}
                                                                    maxH="200px"
                                                                    overflowY="auto"
                                                                >
                                                                    {isSearchingProducts[item.id] ? (
                                                                        <Box p={3} textAlign="center">
                                                                            <Text fontSize="sm" color="fg.muted">Searching...</Text>
                                                                        </Box>
                                                                    ) : filteredProducts(item.id).length > 0 ? (
                                                                        <List.Root>
                                                                            {filteredProducts(item.id).map((product) => (
                                                                                <List.Item
                                                                                    key={product.id}
                                                                                    cursor="pointer"
                                                                                    _hover={{ bg: "purple.500/10" }}
                                                                                    onClick={() => selectProduct(item.id, product)}
                                                                                    p={2}
                                                                                    borderBottomWidth="1px"
                                                                                    borderColor="border.default"
                                                                                >
                                                                                    <HStack gap={2}>
                                                                                        <Icon color="purple.500"><LuPackage /></Icon>
                                                                                        <VStack align="start" gap={0} flex={1}>
                                                                                            <Text fontSize="sm" fontWeight="medium">{product.name}</Text>
                                                                                            {product.arabicName && (
                                                                                                <Text fontSize="xs" color="fg.muted" dir="rtl">{product.arabicName}</Text>
                                                                                            )}
                                                                                            <HStack gap={2} flexWrap="wrap">
                                                                                                <Text fontSize="xs" color="fg.muted">SKU: {product.sku}</Text>
                                                                                                <Text fontSize="xs" color="fg.muted">•</Text>
                                                                                                <Text fontSize="xs" color="purple.600" fontWeight="medium">QAR {product.sellingPrice.toLocaleString()}</Text>
                                                                                            </HStack>
                                                                                        </VStack>
                                                                                    </HStack>
                                                                                </List.Item>
                                                                            ))}
                                                                        </List.Root>
                                                                    ) : productSearchQueries[item.id] ? (
                                                                        <Box p={3} textAlign="center">
                                                                            <Text fontSize="sm" color="fg.muted">No products found</Text>
                                                                        </Box>
                                                                    ) : null}
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                    <Box w={{ base: "80px", md: "80px" }} flexShrink={0}>
                                                        {index === 0 && <Text fontSize="xs" color="fg.muted" mb={1}>Qty</Text>}
                                                        <VStack align="stretch" gap={0}>
                                                            <Input
                                                                type="number"
                                                                size={{ base: "md", md: "sm" }}
                                                                value={item.quantity === 0 ? '' : item.quantity}
                                                                onChange={(e) => {
                                                                    const value = e.target.value;
                                                                    if (value === '') {
                                                                        updateItem(item.id, 'quantity', 0);
                                                                    } else {
                                                                        const numValue = parseInt(value);
                                                                        if (!isNaN(numValue)) {
                                                                            updateItem(item.id, 'quantity', numValue);
                                                                        }
                                                                    }
                                                                }}
                                                                borderColor={
                                                                    item.quantity === 0
                                                                        ? "red.500"
                                                                        : !item.isReturn && item.productStock !== undefined && item.quantity > item.productStock
                                                                            ? "red.500"
                                                                            : item.isReturn
                                                                                ? "red.500/30"
                                                                                : undefined
                                                                }
                                                                bg={
                                                                    item.quantity === 0
                                                                        ? "red.500/10"
                                                                        : !item.isReturn && item.productStock !== undefined && item.quantity > item.productStock
                                                                            ? "red.500/10"
                                                                            : item.isReturn
                                                                                ? "red.50"
                                                                                : undefined
                                                                }
                                                            />
                                                            {item.quantity === 0 && (
                                                                <Text fontSize="xs" color="red.500" mt={0.5}>
                                                                    Quantity cannot be zero
                                                                </Text>
                                                            )}
                                                        </VStack>
                                                    </Box>
                                                    <Box w={{ base: "100px", md: "100px" }} flexShrink={0}>
                                                        {index === 0 && <Text fontSize="xs" color="fg.muted" mb={1}>Rate</Text>}
                                                        <Input
                                                            type="number"
                                                            size={{ base: "md", md: "sm" }}
                                                            value={item.rate === 0 ? '' : item.rate}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                if (value === '') {
                                                                    updateItem(item.id, 'rate', 0);
                                                                } else {
                                                                    const numValue = parseFloat(value);
                                                                    if (!isNaN(numValue)) {
                                                                        updateItem(item.id, 'rate', numValue);
                                                                    }
                                                                }
                                                            }}
                                                            borderColor={item.isReturn ? "red.500/30" : undefined}
                                                            bg={item.isReturn ? "red.500/10" : undefined}
                                                        />
                                                    </Box>
                                                    <Box w={{ base: "100px", md: "100px" }} flexShrink={0}>
                                                        {index === 0 && <Text fontSize="xs" color="fg.muted" mb={1}>Amount</Text>}
                                                        <Text
                                                            fontWeight="medium"
                                                            py={2}
                                                            color={item.isReturn ? "red.600" : undefined}
                                                        >
                                                            {item.isReturn ? "-" : ""}QAR {(item.quantity * item.rate).toLocaleString()}
                                                        </Text>
                                                    </Box>
                                                    <Box w={{ base: "80px", md: "80px" }} flexShrink={0}>
                                                        {index === 0 && <Text fontSize="xs" color="fg.muted" mb={1}>Type</Text>}
                                                        <Button
                                                            size="xs"
                                                            variant={item.isReturn ? "solid" : "outline"}
                                                            colorPalette={item.isReturn ? "red" : "gray"}
                                                            onClick={() => toggleReturn(item.id)}
                                                            title={item.isReturn ? "Mark as sale" : "Mark as return"}
                                                        >
                                                            {item.isReturn ? "Return" : "Sale"}
                                                        </Button>
                                                    </Box>
                                                    <IconButton
                                                        variant="ghost"
                                                        size="xs"
                                                        colorPalette="red"
                                                        aria-label="Remove"
                                                        onClick={() => removeItem(item.id)}
                                                        disabled={items.length === 1}
                                                    >
                                                        <LuTrash2 />
                                                    </IconButton>
                                                </HStack>
                                            ))}
                                        </VStack>
                                    </Box>
                                    {/* Mobile view - similar structure as invoice */}
                                    <VStack gap={4} align="stretch" display={{ base: "flex", md: "none" }}>
                                        {items.map((item) => (
                                            <Card.Root
                                                key={item.id}
                                                variant="outline"
                                                bg={item.isReturn ? "red.500/10" : "bg.subtle"}
                                                borderColor={item.isReturn ? "red.500/30" : undefined}
                                            >
                                                <Card.Body p={4}>
                                                    <VStack gap={3} align="stretch">
                                                        <Field.Root>
                                                            <Field.Label fontSize="xs">Description</Field.Label>
                                                            <Box position="relative">
                                                                <Input
                                                                    placeholder="Search product or enter description"
                                                                    size="md"
                                                                    value={productSearchQueries[item.id] !== undefined && productSearchQueries[item.id] !== "" ? productSearchQueries[item.id] : item.description}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        setProductSearchQueries({ ...productSearchQueries, [item.id]: value });
                                                                        if (!showProductDropdown[item.id]) {
                                                                            setShowProductDropdown({ ...showProductDropdown, [item.id]: true });
                                                                        }
                                                                        if (!products.some(p => p.name.toLowerCase() === value.toLowerCase())) {
                                                                            updateItem(item.id, 'description', value);
                                                                        }
                                                                    }}
                                                                    onFocus={() => setShowProductDropdown({ ...showProductDropdown, [item.id]: true })}
                                                                    onBlur={() => {
                                                                        setTimeout(() => {
                                                                            setShowProductDropdown({ ...showProductDropdown, [item.id]: false });
                                                                        }, 200);
                                                                    }}
                                                                    borderColor={item.isReturn ? "red.500/30" : undefined}
                                                                />
                                                                {showProductDropdown[item.id] && filteredProducts(item.id).length > 0 && (
                                                                    <Box
                                                                        position="absolute"
                                                                        top="100%"
                                                                        left={0}
                                                                        right={0}
                                                                        zIndex={1000}
                                                                        bg="bg.surface"
                                                                        borderWidth="1px"
                                                                        borderColor="border.default"
                                                                        borderRadius="md"
                                                                        shadow="lg"
                                                                        mt={1}
                                                                        maxH="200px"
                                                                        overflowY="auto"
                                                                    >
                                                                        <List.Root>
                                                                            {filteredProducts(item.id).map((product) => (
                                                                                <List.Item
                                                                                    key={product.id}
                                                                                    cursor="pointer"
                                                                                    _hover={{ bg: "purple.500/10" }}
                                                                                    onClick={() => selectProduct(item.id, product)}
                                                                                    p={2}
                                                                                    borderBottomWidth="1px"
                                                                                    borderColor="border.default"
                                                                                >
                                                                                    <HStack gap={2}>
                                                                                        <Icon color="purple.500"><LuPackage /></Icon>
                                                                                        <VStack align="start" gap={0} flex={1}>
                                                                                            <Text fontSize="sm" fontWeight="medium">{product.name}</Text>
                                                                                            {product.arabicName && (
                                                                                                <Text fontSize="xs" color="fg.muted" dir="rtl">{product.arabicName}</Text>
                                                                                            )}
                                                                                            <HStack gap={2} flexWrap="wrap">
                                                                                                <Text fontSize="xs" color="fg.muted">SKU: {product.sku}</Text>
                                                                                                <Text fontSize="xs" color="fg.muted">•</Text>
                                                                                                <Text fontSize="xs" color="purple.600" fontWeight="medium">QAR {product.sellingPrice.toLocaleString()}</Text>
                                                                                            </HStack>
                                                                                        </VStack>
                                                                                    </HStack>
                                                                                </List.Item>
                                                                            ))}
                                                                        </List.Root>
                                                                    </Box>
                                                                )}
                                                            </Box>
                                                        </Field.Root>
                                                        <SimpleGrid columns={2} gap={3}>
                                                            <Field.Root>
                                                                <Field.Label fontSize="xs">Quantity</Field.Label>
                                                                <VStack align="stretch" gap={0}>
                                                                    <Input
                                                                        type="number"
                                                                        size="sm"
                                                                        value={item.quantity === 0 ? '' : item.quantity}
                                                                        onChange={(e) => {
                                                                            const value = e.target.value;
                                                                            if (value === '') {
                                                                                updateItem(item.id, 'quantity', 0);
                                                                            } else {
                                                                                const numValue = parseInt(value);
                                                                                if (!isNaN(numValue)) {
                                                                                    updateItem(item.id, 'quantity', numValue);
                                                                                }
                                                                            }
                                                                        }}
                                                                        borderColor={
                                                                            item.quantity === 0
                                                                                ? "red.500"
                                                                                : !item.isReturn && item.productStock !== undefined && item.quantity > item.productStock
                                                                                    ? "red.500"
                                                                                    : item.isReturn
                                                                                        ? "red.500/30"
                                                                                        : undefined
                                                                        }
                                                                        bg={
                                                                            item.quantity === 0
                                                                                ? "red.500/10"
                                                                                : !item.isReturn && item.productStock !== undefined && item.quantity > item.productStock
                                                                                    ? "red.500/10"
                                                                                    : undefined
                                                                        }
                                                                    />
                                                                    {item.quantity === 0 && (
                                                                        <Text fontSize="xs" color="red.500" mt={0.5}>
                                                                            Quantity cannot be zero
                                                                        </Text>
                                                                    )}
                                                                </VStack>
                                                            </Field.Root>
                                                            <Field.Root>
                                                                <Field.Label fontSize="xs">Rate (QAR)</Field.Label>
                                                                <Input
                                                                    type="number"
                                                                    size="sm"
                                                                    value={item.rate === 0 ? '' : item.rate}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        if (value === '') {
                                                                            updateItem(item.id, 'rate', 0);
                                                                        } else {
                                                                            const numValue = parseFloat(value);
                                                                            if (!isNaN(numValue)) {
                                                                                updateItem(item.id, 'rate', numValue);
                                                                            }
                                                                        }
                                                                    }}
                                                                    borderColor={item.isReturn ? "red.500/30" : undefined}
                                                                />
                                                            </Field.Root>
                                                        </SimpleGrid>
                                                        <Flex justify="space-between" align="center" gap={2}>
                                                            <Button
                                                                size="xs"
                                                                variant={item.isReturn ? "solid" : "outline"}
                                                                colorPalette={item.isReturn ? "red" : "gray"}
                                                                onClick={() => toggleReturn(item.id)}
                                                                title={item.isReturn ? "Mark as regular item" : "Mark as return"}
                                                            >
                                                                {item.isReturn ? "Return" : "Item"}
                                                            </Button>
                                                            <HStack gap={2} flex={1} justify="flex-end">
                                                                <Text fontSize="sm" color="fg.muted">
                                                                    Amount: <Text as="span" fontWeight="semibold" color={item.isReturn ? "red.600" : "gray.800"}>
                                                                        {item.isReturn ? "-" : ""}QAR {(item.quantity * item.rate).toLocaleString()}
                                                                    </Text>
                                                                </Text>
                                                                <IconButton
                                                                    variant="ghost"
                                                                    size="xs"
                                                                    colorPalette="red"
                                                                    aria-label="Remove item"
                                                                    onClick={() => removeItem(item.id)}
                                                                    disabled={items.length === 1}
                                                                >
                                                                    <LuTrash2 />
                                                                </IconButton>
                                                            </HStack>
                                                        </Flex>
                                                    </VStack>
                                                </Card.Body>
                                            </Card.Root>
                                        ))}
                                    </VStack>
                                </Card.Body>
                            </Card.Root>

                            {/* Notes */}
                            <Card.Root border="1px solid" borderColor="border.default" bg="bg.surface">
                                <Card.Header p={5} pb={0}>
                                    <Heading size="sm" fontWeight="semibold">Notes</Heading>
                                </Card.Header>
                                <Card.Body p={5}>
                                    <Textarea
                                        placeholder="Add any notes or terms..."
                                        size="sm"
                                        rows={3}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </Card.Body>
                            </Card.Root>
                        </VStack>
                    </Box>

                    {/* Summary Sidebar */}
                    <Box>
                        <Card.Root border="1px solid" borderColor="border.default" bg="bg.surface" position="sticky" top="80px">
                            <Card.Header p={5} pb={0}>
                                <Heading size="sm" fontWeight="semibold">Summary</Heading>
                            </Card.Header>
                            <Card.Body p={5}>
                                <VStack gap={3} align="stretch">
                                    <HStack justify="space-between">
                                        <Text color="fg.muted" fontSize="sm">Subtotal</Text>
                                        <Text fontWeight="medium">QAR {subtotal.toLocaleString()}</Text>
                                    </HStack>
                                    {returns > 0 && (
                                        <HStack justify="space-between">
                                            <Text color="red.600" fontSize="sm">Returns</Text>
                                            <Text fontWeight="medium" color="red.600">-QAR {returns.toLocaleString()}</Text>
                                        </HStack>
                                    )}
                                    {returns > 0 && (
                                        <HStack justify="space-between">
                                            <Text color="fg.muted" fontSize="sm">Net Subtotal</Text>
                                            <Text fontWeight="medium">QAR {netSubtotal.toLocaleString()}</Text>
                                        </HStack>
                                    )}
                                    <HStack justify="space-between" align="center">
                                        <HStack gap={2} align="center">
                                            <Text color="fg.muted" fontSize="sm">Discount</Text>
                                            {discountPercentage !== null && discountPercentage > 0 && (
                                                <IconButton
                                                    variant="ghost"
                                                    size="xs"
                                                    aria-label="Reset discount"
                                                    onClick={() => {
                                                        setDiscountPercentage(null);
                                                        setIsDiscountEditing(false);
                                                    }}
                                                    title="Remove discount"
                                                >
                                                    <LuRotateCcw />
                                                </IconButton>
                                            )}
                                        </HStack>
                                        {isDiscountEditing ? (
                                            <HStack gap={1} align="center">
                                                <Input
                                                    type="number"
                                                    size="xs"
                                                    w="70px"
                                                    value={discountPercentage !== null ? discountPercentage : ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value === '') {
                                                            setDiscountPercentage(null);
                                                        } else {
                                                            const num = parseFloat(value);
                                                            if (!isNaN(num)) setDiscountPercentage(Math.min(100, Math.max(0, num)));
                                                        }
                                                    }}
                                                    onBlur={() => setIsDiscountEditing(false)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') setIsDiscountEditing(false);
                                                        if (e.key === 'Escape') {
                                                            setDiscountPercentage(null);
                                                            setIsDiscountEditing(false);
                                                        }
                                                    }}
                                                    autoFocus
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                />
                                                <Text fontSize="xs" color="fg.muted">%</Text>
                                            </HStack>
                                        ) : (
                                            <Box textAlign="right">
                                                <Text
                                                    fontWeight="medium"
                                                    color={discountAmount > 0 ? "purple.600" : undefined}
                                                    cursor="pointer"
                                                    _hover={{ color: "purple.500", textDecoration: "underline" }}
                                                    onClick={() => setIsDiscountEditing(true)}
                                                    title="Click to edit discount percentage"
                                                >
                                                    {discountPct > 0 ? "-" : ""}{discountPct}%
                                                </Text>
                                                {discountAmount > 0 && (
                                                    <Text fontSize="xs" color="fg.muted">QAR {discountAmount.toLocaleString()}</Text>
                                                )}
                                            </Box>
                                        )}
                                    </HStack>
                                    <Separator />
                                    <HStack justify="space-between">
                                        <Text fontWeight="semibold">Total</Text>
                                        <Text fontWeight="bold" fontSize="xl" color="purple.600">QAR {total.toLocaleString()}</Text>
                                    </HStack>
                                </VStack>
                            </Card.Body>
                        </Card.Root>
                    </Box>
                </SimpleGrid>
            </VStack>

            {/* Send Confirmation Dialog */}
            <Dialog.Root
                open={sendDialogOpen}
                onOpenChange={(e) => setSendDialogOpen(e.open)}
            >
                <Portal>
                    <Dialog.Backdrop bg="blackAlpha.600" />
                    <Dialog.Positioner>
                        <Dialog.Content bg="bg.surface" borderRadius="xl" mx={4}>
                            <Dialog.Header p={6} pb={4}>
                                <Dialog.Title fontWeight="semibold">Send Quotation</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body px={6} pb={6}>
                                <VStack align="stretch" gap={4}>
                                    <Text color="fg.muted">
                                        Ready to send this quotation?
                                    </Text>
                                    <Box bg="purple.500/10" p={4} borderRadius="lg">
                                        <HStack justify="space-between" mb={2}>
                                            <Text fontSize="sm" color="fg.muted">Client</Text>
                                            <Text fontSize="sm" fontWeight="medium">{clientName || "Not specified"}</Text>
                                        </HStack>
                                        {clientPhone && (
                                            <HStack justify="space-between" mb={2}>
                                                <Text fontSize="sm" color="fg.muted">Phone</Text>
                                                <Text fontSize="sm" fontWeight="medium">{clientPhone}</Text>
                                            </HStack>
                                        )}
                                        <HStack justify="space-between">
                                            <Text fontSize="sm" color="fg.muted">Total</Text>
                                            <Text fontSize="sm" fontWeight="bold" color="purple.600">QAR {total.toLocaleString()}</Text>
                                        </HStack>
                                    </Box>
                                </VStack>
                            </Dialog.Body>
                            <Dialog.Footer p={6} pt={4} gap={3}>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="outline">
                                        Cancel
                                    </Button>
                                </Dialog.ActionTrigger>
                                <Button
                                    colorPalette="purple"
                                    onClick={handleSend}
                                >
                                    <LuSend /> Send Quotation
                                </Button>
                            </Dialog.Footer>
                            <Dialog.CloseTrigger asChild position="absolute" top={4} right={4}>
                                <CloseButton size="sm" />
                            </Dialog.CloseTrigger>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            {/* Discard Confirmation Dialog */}
            <Dialog.Root
                open={discardDialogOpen}
                onOpenChange={(e) => setDiscardDialogOpen(e.open)}
                role="alertdialog"
            >
                <Portal>
                    <Dialog.Backdrop bg="blackAlpha.600" />
                    <Dialog.Positioner>
                        <Dialog.Content bg="bg.surface" borderRadius="xl" mx={4}>
                            <Dialog.Header p={6} pb={4}>
                                <Dialog.Title fontWeight="semibold">Discard Changes</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body px={6} pb={6}>
                                <Text color="fg.muted">
                                    Are you sure you want to discard this quotation? All unsaved changes will be lost.
                                </Text>
                            </Dialog.Body>
                            <Dialog.Footer p={6} pt={4} gap={3}>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="outline">
                                        Keep Editing
                                    </Button>
                                </Dialog.ActionTrigger>
                                <Button
                                    colorPalette="red"
                                    onClick={handleDiscard}
                                >
                                    <LuX /> Discard
                                </Button>
                            </Dialog.Footer>
                            <Dialog.CloseTrigger asChild position="absolute" top={4} right={4}>
                                <CloseButton size="sm" />
                            </Dialog.CloseTrigger>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </DashboardLayout>
    );
}
