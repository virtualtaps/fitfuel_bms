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
    Spinner,
    NativeSelect,
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
} from "react-icons/lu";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { toaster } from "@/components/ui/toaster";
import { apiClient } from "@/lib/api";
import { QuotationResponse } from "@/lib/models/Quotation";
import { ProductResponse } from "@/lib/models/Product";
import { PaginatedResponse } from "@/types/api";
import { QuotationStatus } from "@/types/models";

interface EditableItem {
    id: number;
    description: string;
    quantity: number;
    rate: number;
    productId?: string;
}

const formatDateForInput = (d: Date | string | undefined): string => {
    if (!d) return "";
    const date = typeof d === "string" ? new Date(d) : d;
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
};

export default function EditQuotationPage() {
    const params = useParams();
    const router = useRouter();
    const quotationId = params.id as string;

    // Data state
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [quotationNumber, setQuotationNumber] = useState("");

    // Form state
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [issueDate, setIssueDate] = useState("");
    const [validUntil, setValidUntil] = useState("");
    const [notes, setNotes] = useState("");
    const [status, setStatus] = useState<QuotationStatus>("Draft");
    const [items, setItems] = useState<EditableItem[]>([
        { id: Date.now(), description: "", quantity: 1, rate: 0 },
    ]);

    // Discount state
    const [discountPercentage, setDiscountPercentage] = useState<number | null>(null);
    const [isDiscountEditing, setIsDiscountEditing] = useState(false);

    // Product search state
    const [products, setProducts] = useState<ProductResponse[]>([]);
    const [productSearchQueries, setProductSearchQueries] = useState<{ [key: number]: string }>({});
    const [showProductDropdown, setShowProductDropdown] = useState<{ [key: number]: boolean }>({});
    const [isSearchingProducts, setIsSearchingProducts] = useState<{ [key: number]: boolean }>({});
    const [searchDebounceTimers, setSearchDebounceTimers] = useState<{ [key: number]: NodeJS.Timeout }>({});

    // Dialog state
    const [sendDialogOpen, setSendDialogOpen] = useState(false);
    const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // Calculated values
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const discountPct = discountPercentage !== null ? discountPercentage : 0;
    const discountAmount = subtotal * discountPct / 100;
    const total = subtotal - discountAmount;

    useEffect(() => {
        if (quotationId) fetchQuotation();
        fetchProducts("");
    }, [quotationId]);

    // Cleanup debounce timers on unmount
    useEffect(() => {
        return () => {
            Object.values(searchDebounceTimers).forEach(timer => { if (timer) clearTimeout(timer); });
        };
    }, []);

    const fetchProducts = async (searchQuery: string = "") => {
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append("search", searchQuery);
            params.append("limit", "50");
            const response = await apiClient.get<PaginatedResponse<ProductResponse>>(`/api/inventory?${params.toString()}`);
            if (response.success && response.data) {
                setProducts(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch products:", error);
        }
    };

    const debouncedProductSearch = (itemId: number, query: string) => {
        if (searchDebounceTimers[itemId]) clearTimeout(searchDebounceTimers[itemId]);
        setIsSearchingProducts(prev => ({ ...prev, [itemId]: true }));
        const timer = setTimeout(async () => {
            await fetchProducts(query);
            setIsSearchingProducts(prev => ({ ...prev, [itemId]: false }));
            setSearchDebounceTimers(prev => { const t = { ...prev }; delete t[itemId]; return t; });
        }, 300);
        setSearchDebounceTimers(prev => ({ ...prev, [itemId]: timer }));
    };

    const selectProduct = (itemId: number, product: ProductResponse) => {
        setItems(items.map(item =>
            item.id === itemId
                ? { ...item, description: product.name, rate: product.sellingPrice, productId: product.id }
                : item
        ));
        setProductSearchQueries(prev => ({ ...prev, [itemId]: product.name }));
        setShowProductDropdown(prev => ({ ...prev, [itemId]: false }));
    };

    const filteredProducts = (itemId: number) => {
        const query = productSearchQueries[itemId] || "";
        if (!query) return products.slice(0, 10);
        return products.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            (p.sku?.toLowerCase().includes(query.toLowerCase()) ?? false)
        ).slice(0, 10);
    };

    const fetchQuotation = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.get<QuotationResponse>(`/api/quotations/${quotationId}`);
            if (response.success && response.data) {
                const q = response.data;
                setQuotationNumber(q.quotationNumber);
                setClientName(q.client);
                setClientPhone(q.clientPhone || "");
                setNotes(q.notes || "");
                setStatus(q.status);
                setIssueDate(formatDateForInput(q.issueDate));
                setValidUntil(formatDateForInput(q.validUntil));
                const loadedItems = q.items.map((item, idx) => ({
                    id: idx + 1,
                    description: item.description,
                    quantity: item.quantity,
                    rate: item.rate,
                    productId: item.productId,
                }));
                setItems(loadedItems);
                // Pre-populate search queries with existing descriptions
                const queries: { [key: number]: string } = {};
                loadedItems.forEach(item => { queries[item.id] = item.description; });
                setProductSearchQueries(queries);
                setDiscountPercentage(q.discountPercentage > 0 ? q.discountPercentage : null);
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

    const buildPayload = (overrideStatus?: QuotationStatus) => ({
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || undefined,
        items: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.quantity * item.rate,
            productId: item.productId,
        })),
        discountPercentage: discountPct,
        issueDate: issueDate,
        validUntil: validUntil,
        notes: notes.trim() || undefined,
        status: overrideStatus ?? status,
    });

    const handleSave = async () => {
        if (!clientName.trim()) {
            toaster.create({ title: "Client name is required", type: "error" });
            return;
        }
        setIsSaving(true);
        toaster.create({ id: "saving", title: "Saving changes...", type: "loading" });
        try {
            const response = await apiClient.put<QuotationResponse>(
                `/api/quotations/${quotationId}`,
                buildPayload()
            );
            if (response.success) {
                toaster.dismiss("saving");
                toaster.create({ title: "Quotation updated!", type: "success" });
            } else {
                throw new Error(response.error || "Failed to save");
            }
        } catch (err: any) {
            toaster.dismiss("saving");
            toaster.create({ title: "Save failed", description: err.message, type: "error" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSend = async () => {
        if (!clientName.trim()) {
            toaster.create({ title: "Client name is required", type: "error" });
            setSendDialogOpen(false);
            return;
        }
        setIsSending(true);
        setSendDialogOpen(false);
        toaster.create({ id: "sending", title: "Saving and sending quotation...", type: "loading" });
        try {
            const response = await apiClient.put<QuotationResponse>(
                `/api/quotations/${quotationId}`,
                buildPayload("Sent")
            );
            if (response.success) {
                toaster.dismiss("sending");
                toaster.create({ title: "Quotation sent!", type: "success" });
                setTimeout(() => router.push(`/dashboard/quotations/${quotationId}`), 500);
            } else {
                throw new Error(response.error || "Failed to send");
            }
        } catch (err: any) {
            toaster.dismiss("sending");
            toaster.create({ title: "Send failed", description: err.message, type: "error" });
        } finally {
            setIsSending(false);
        }
    };

    const handleDelete = async () => {
        setDeleteDialogOpen(false);
        setIsDeleting(true);
        toaster.create({ id: "deleting", title: "Deleting quotation...", type: "loading" });
        try {
            const response = await apiClient.delete(`/api/quotations/${quotationId}`);
            if (response.success) {
                toaster.dismiss("deleting");
                toaster.create({ title: "Quotation deleted", type: "success" });
                router.push("/dashboard/quotations");
            } else {
                throw new Error(response.error || "Failed to delete");
            }
        } catch (err: any) {
            toaster.dismiss("deleting");
            toaster.create({ title: "Delete failed", description: err.message, type: "error" });
            setIsDeleting(false);
        }
    };

    const handleDiscard = () => {
        setDiscardDialogOpen(false);
        router.push(`/dashboard/quotations/${quotationId}`);
    };

    const addItem = () => {
        const newId = Date.now();
        setItems([...items, { id: newId, description: "", quantity: 1, rate: 0 }]);
        setProductSearchQueries(prev => ({ ...prev, [newId]: "" }));
    };

    const removeItem = (id: number) => {
        if (items.length > 1) setItems(items.filter((item) => item.id !== id));
    };

    const updateItem = (id: number, field: keyof EditableItem, value: string | number) => {
        setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <Flex justify="center" align="center" minH="300px">
                    <Spinner size="xl" color="purple.500" />
                </Flex>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <VStack gap={4} align="center" py={12}>
                    <Text color="red.500">{error}</Text>
                    <Button variant="outline" onClick={() => fetchQuotation()}>Retry</Button>
                </VStack>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <VStack gap={6} align="stretch">
                {/* Header */}
                <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
                    <HStack gap={4}>
                        <IconButton
                            variant="ghost"
                            size="sm"
                            aria-label="Back"
                            onClick={() => setDiscardDialogOpen(true)}
                        >
                            <LuArrowLeft />
                        </IconButton>
                        <Box>
                            <Heading size="lg" fontWeight="semibold">Edit Quotation</Heading>
                            <Text color="fg.muted" fontSize="sm">{quotationNumber}</Text>
                        </Box>
                    </HStack>
                    <HStack gap={2} flexWrap="wrap">
                        <Button
                            variant="ghost"
                            size="sm"
                            colorPalette="red"
                            onClick={() => setDeleteDialogOpen(true)}
                            loading={isDeleting}
                        >
                            <LuTrash2 /> Delete
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            loading={isSaving}
                            loadingText="Saving..."
                            onClick={handleSave}
                        >
                            <LuSave /> Save Changes
                        </Button>
                        <Button
                            colorPalette="purple"
                            size="sm"
                            loading={isSending}
                            loadingText="Sending..."
                            onClick={() => setSendDialogOpen(true)}
                        >
                            <LuSend /> Save & Send
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
                                        <Field.Root>
                                            <Field.Label fontSize="sm">Client Name</Field.Label>
                                            <Input
                                                placeholder="Enter client name"
                                                size="sm"
                                                value={clientName}
                                                onChange={(e) => setClientName(e.target.value)}
                                            />
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label fontSize="sm">Phone</Field.Label>
                                            <Input
                                                placeholder="+974 000 0000"
                                                size="sm"
                                                value={clientPhone}
                                                onChange={(e) => setClientPhone(e.target.value)}
                                            />
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
                                        <Field.Root>
                                            <Field.Label fontSize="sm">Status</Field.Label>
                                            <NativeSelect.Root size="sm">
                                                <NativeSelect.Field
                                                    value={status}
                                                    onChange={(e) => setStatus(e.target.value as QuotationStatus)}
                                                >
                                                    <option value="Draft">Draft</option>
                                                    <option value="Sent">Sent</option>
                                                    <option value="Accepted">Accepted</option>
                                                    <option value="Declined">Declined</option>
                                                    <option value="Expired">Expired</option>
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </Field.Root>
                                    </SimpleGrid>
                                </Card.Body>
                            </Card.Root>

                            {/* Line Items */}
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
                                    <VStack gap={3} align="stretch">
                                        {/* Desktop Header */}
                                        <HStack gap={3} display={{ base: "none", md: "flex" }}>
                                            <Box flex="2">
                                                <Text fontSize="xs" color="fg.muted">Description</Text>
                                            </Box>
                                            <Box w="80px">
                                                <Text fontSize="xs" color="fg.muted">Qty</Text>
                                            </Box>
                                            <Box w="100px">
                                                <Text fontSize="xs" color="fg.muted">Rate (QAR)</Text>
                                            </Box>
                                            <Box w="100px">
                                                <Text fontSize="xs" color="fg.muted">Amount</Text>
                                            </Box>
                                            <Box w="32px" />
                                        </HStack>

                                        {items.map((item) => (
                                            <Box key={item.id}>
                                                {/* Desktop Layout */}
                                                <HStack gap={3} display={{ base: "none", md: "flex" }} align="center">
                                                    <Box flex="2" position="relative">
                                                        <Input
                                                            placeholder="Search product or enter description"
                                                            size="sm"
                                                            value={productSearchQueries[item.id] !== undefined ? productSearchQueries[item.id] : item.description}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                setProductSearchQueries(prev => ({ ...prev, [item.id]: value }));
                                                                setShowProductDropdown(prev => ({ ...prev, [item.id]: true }));
                                                                updateItem(item.id, "description", value);
                                                                if (value.length > 0) debouncedProductSearch(item.id, value);
                                                                else fetchProducts("");
                                                            }}
                                                            onFocus={() => setShowProductDropdown(prev => ({ ...prev, [item.id]: true }))}
                                                            onBlur={() => setTimeout(() => setShowProductDropdown(prev => ({ ...prev, [item.id]: false })), 200)}
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
                                                                    <Box p={3} textAlign="center"><Text fontSize="sm" color="fg.muted">Searching...</Text></Box>
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
                                                                                        <HStack gap={2}>
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
                                                                    <Box p={3} textAlign="center"><Text fontSize="sm" color="fg.muted">No products found</Text></Box>
                                                                ) : null}
                                                            </Box>
                                                        )}
                                                    </Box>
                                                    <Box w="80px">
                                                        <Input
                                                            type="number"
                                                            size="sm"
                                                            value={item.quantity}
                                                            min={1}
                                                            onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                                                        />
                                                    </Box>
                                                    <Box w="100px">
                                                        <Input
                                                            type="number"
                                                            size="sm"
                                                            value={item.rate}
                                                            min={0}
                                                            step="0.01"
                                                            onChange={(e) => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                                                        />
                                                    </Box>
                                                    <Box w="100px">
                                                        <Text fontWeight="medium" py={2}>
                                                            QAR {(item.quantity * item.rate).toLocaleString()}
                                                        </Text>
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

                                                {/* Mobile Layout */}
                                                <Card.Root display={{ base: "block", md: "none" }} p={3} bg="bg.subtle" borderRadius="lg">
                                                    <VStack gap={3} align="stretch">
                                                        <Field.Root>
                                                            <Field.Label fontSize="xs">Description</Field.Label>
                                                            <Box position="relative">
                                                                <Input
                                                                    placeholder="Search product or enter description"
                                                                    size="sm"
                                                                    value={productSearchQueries[item.id] !== undefined ? productSearchQueries[item.id] : item.description}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        setProductSearchQueries(prev => ({ ...prev, [item.id]: value }));
                                                                        setShowProductDropdown(prev => ({ ...prev, [item.id]: true }));
                                                                        updateItem(item.id, "description", value);
                                                                        if (value.length > 0) debouncedProductSearch(item.id, value);
                                                                        else fetchProducts("");
                                                                    }}
                                                                    onFocus={() => setShowProductDropdown(prev => ({ ...prev, [item.id]: true }))}
                                                                    onBlur={() => setTimeout(() => setShowProductDropdown(prev => ({ ...prev, [item.id]: false })), 200)}
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
                                                                            <Box p={3} textAlign="center"><Text fontSize="sm" color="fg.muted">Searching...</Text></Box>
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
                                                                                                <HStack gap={2}>
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
                                                                            <Box p={3} textAlign="center"><Text fontSize="sm" color="fg.muted">No products found</Text></Box>
                                                                        ) : null}
                                                                    </Box>
                                                                )}
                                                            </Box>
                                                        </Field.Root>
                                                        <SimpleGrid columns={3} gap={2}>
                                                            <Field.Root>
                                                                <Field.Label fontSize="xs">Qty</Field.Label>
                                                                <Input
                                                                    type="number"
                                                                    size="sm"
                                                                    value={item.quantity}
                                                                    onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                                                                />
                                                            </Field.Root>
                                                            <Field.Root>
                                                                <Field.Label fontSize="xs">Rate</Field.Label>
                                                                <Input
                                                                    type="number"
                                                                    size="sm"
                                                                    value={item.rate}
                                                                    onChange={(e) => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                                                                />
                                                            </Field.Root>
                                                            <Field.Root>
                                                                <Field.Label fontSize="xs">Amount</Field.Label>
                                                                <Text fontWeight="medium" pt={2}>
                                                                    QAR {(item.quantity * item.rate).toLocaleString()}
                                                                </Text>
                                                            </Field.Root>
                                                        </SimpleGrid>
                                                        <Button
                                                            variant="ghost"
                                                            size="xs"
                                                            colorPalette="red"
                                                            onClick={() => removeItem(item.id)}
                                                            disabled={items.length === 1}
                                                            alignSelf="flex-end"
                                                        >
                                                            <LuTrash2 /> Remove
                                                        </Button>
                                                    </VStack>
                                                </Card.Root>
                                            </Box>
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
                                    <Field.Root>
                                        <Textarea
                                            placeholder="Add any notes for the client..."
                                            size="sm"
                                            rows={3}
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                        />
                                    </Field.Root>
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

                                    {/* Discount Row */}
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
                                                        if (e.key === "Enter") setIsDiscountEditing(false);
                                                        if (e.key === "Escape") {
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
                                        <Text fontWeight="bold" fontSize="xl" color="purple.600">
                                            QAR {total.toLocaleString()}
                                        </Text>
                                    </HStack>
                                </VStack>
                            </Card.Body>
                        </Card.Root>
                    </Box>
                </SimpleGrid>
            </VStack>

            {/* Send Confirmation Dialog */}
            <Dialog.Root open={sendDialogOpen} onOpenChange={(e) => setSendDialogOpen(e.open)}>
                <Portal>
                    <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
                    <Dialog.Positioner>
                        <Dialog.Content bg="bg.surface" borderRadius="xl" maxW="400px" mx={4}>
                            <Dialog.Header p={5} pb={0}>
                                <Dialog.Title fontWeight="semibold">Save & Send Quotation</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body p={5}>
                                <Text color="fg.muted">
                                    This will save your changes and mark the quotation as Sent.
                                </Text>
                            </Dialog.Body>
                            <Dialog.Footer p={5} pt={0} gap={3}>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="outline" size="sm">Cancel</Button>
                                </Dialog.ActionTrigger>
                                <Button colorPalette="purple" size="sm" onClick={handleSend}>
                                    <LuSend /> Save & Send
                                </Button>
                            </Dialog.Footer>
                            <Dialog.CloseTrigger asChild position="absolute" top={3} right={3}>
                                <CloseButton size="sm" />
                            </Dialog.CloseTrigger>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            {/* Discard Confirmation Dialog */}
            <Dialog.Root open={discardDialogOpen} onOpenChange={(e) => setDiscardDialogOpen(e.open)}>
                <Portal>
                    <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
                    <Dialog.Positioner>
                        <Dialog.Content bg="bg.surface" borderRadius="xl" maxW="400px" mx={4}>
                            <Dialog.Header p={5} pb={0}>
                                <Dialog.Title fontWeight="semibold">Discard Changes</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body p={5}>
                                <Text color="fg.muted">
                                    Any unsaved changes will be lost. Go back to the quotation?
                                </Text>
                            </Dialog.Body>
                            <Dialog.Footer p={5} pt={0} gap={3}>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="outline" size="sm">Keep Editing</Button>
                                </Dialog.ActionTrigger>
                                <Button colorPalette="red" size="sm" onClick={handleDiscard}>
                                    <LuX /> Discard
                                </Button>
                            </Dialog.Footer>
                            <Dialog.CloseTrigger asChild position="absolute" top={3} right={3}>
                                <CloseButton size="sm" />
                            </Dialog.CloseTrigger>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>

            {/* Delete Dialog */}
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
                                    <LuTrash2 /> Delete Quotation
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
    );
}
