"use client";

import { useState, useEffect } from "react";
import { Box, VStack, SimpleGrid, Text } from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { toaster } from "@/components/ui/toaster";
import { apiClient } from "@/lib/api";
import { ProductResponse } from "@/lib/models/Product";
import { ClientResponse } from "@/lib/models/Client";
import { PaginatedResponse } from "@/types/api";
import { InvoiceResponse } from "@/lib/models/Invoice";
// import InvoiceHeader from "../../create/components/InvoiceHeader";
import { HStack, Heading, IconButton, Flex } from "@chakra-ui/react";
import { LuArrowLeft, LuSave, LuSend, LuTrash2 } from "react-icons/lu";
import Link from "next/link";
import ClientInfoForm from "../../create/components/ClientInfoForm";
import InvoiceDetailsForm from "../../create/components/InvoiceDetailsForm";
import LineItemsSection, { InvoiceItem } from "../../create/components/LineItemsSection";
import PaymentMethodSection from "../../create/components/PaymentMethodSection";
import NotesSection from "../../create/components/NotesSection";
import InvoiceSummary from "../../create/components/InvoiceSummary";
import SendInvoiceDialog from "../../create/components/SendInvoiceDialog";
import DiscardDialog from "../../create/components/DiscardDialog";
import {
    Dialog,
    Portal,
    Button,
    CloseButton,
} from "@chakra-ui/react";

export default function EditInvoicePage() {
    const params = useParams();
    const router = useRouter();
    const invoiceId = params.id as string;

    const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [clientId, setClientId] = useState<string | undefined>();
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank-transfer' | 'Fawran' | 'Pending' | undefined>(undefined);
    const [notes, setNotes] = useState("");
    const [discountPercentage, setDiscountPercentage] = useState<number | null>(null);
    const [isDiscountEditing, setIsDiscountEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
    const [sendDialogOpen, setSendDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

    // Fetch invoice data on mount
    useEffect(() => {
        fetchInvoice();
        fetchProducts("");
    }, [invoiceId]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            Object.values(searchDebounceTimers).forEach(timer => {
                if (timer) clearTimeout(timer);
            });
            if (clientSearchDebounceTimer) clearTimeout(clientSearchDebounceTimer);
        };
    }, []);

    const fetchInvoice = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get<InvoiceResponse>(`/api/invoices/${invoiceId}`);
            if (response.success && response.data) {
                const invoiceData = response.data;
                setInvoice(invoiceData);

                // Populate form with invoice data
                setClientName(invoiceData.client || "");
                setClientPhone(invoiceData.clientPhone || "");
                setClientId(invoiceData.clientId);
                setIssueDate(new Date(invoiceData.issueDate).toISOString().split('T')[0]);
                setPaymentMethod(invoiceData.paymentMethod);
                setNotes(invoiceData.notes || "");
                setDiscountPercentage(invoiceData.discountPercentage > 0 ? invoiceData.discountPercentage : null);

                // Convert invoice items to form items
                const formItems: InvoiceItem[] = invoiceData.items.map((item, index) => {
                    const isReturn = item.quantity < 0;
                    return {
                        id: Date.now() + index,
                        description: item.description,
                        quantity: Math.abs(item.quantity),
                        rate: item.rate,
                        isReturn: isReturn,
                        productId: item.productId,
                    };
                });
                setItems(formItems.length > 0 ? formItems : [{ id: Date.now(), description: "", quantity: 1, rate: 0, isReturn: false }]);
            } else {
                toaster.create({
                    title: "Failed to load invoice",
                    description: response.error || "Invoice not found",
                    type: "error",
                });
                router.push("/dashboard/invoices");
            }
        } catch (error) {
            toaster.create({
                title: "Failed to load invoice",
                description: error instanceof Error ? error.message : "Please try again",
                type: "error",
            });
            router.push("/dashboard/invoices");
        } finally {
            setLoading(false);
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

    const debouncedSearch = (itemId: number, query: string) => {
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

    const selectClient = (client: ClientResponse) => {
        setClientName(client.name);
        setClientPhone(client.phone || "");
        setClientId(client.id);
        setShowClientDropdown(false);
    };

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
                };
            }
            return item;
        }));
        setProductSearchQueries({ ...productSearchQueries, [itemId]: product.name });
        setShowProductDropdown({ ...showProductDropdown, [itemId]: false });
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

    const updateItem = (id: number, field: keyof InvoiceItem, value: string | number) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleProductSearchChange = (itemId: number, value: string) => {
        setProductSearchQueries({ ...productSearchQueries, [itemId]: value });
        if (!showProductDropdown[itemId]) {
            setShowProductDropdown({ ...showProductDropdown, [itemId]: true });
        }
        if (!products.some(p => p.name.toLowerCase() === value.toLowerCase())) {
            updateItem(itemId, 'description', value);
        }
        if (value.length > 0) {
            debouncedSearch(itemId, value);
        } else {
            fetchProducts("");
        }
    };

    const handleClientNameChange = (value: string) => {
        setClientName(value);
        if (value.length > 0) {
            setShowClientDropdown(true);
            debouncedClientSearch(value);
        } else {
            setShowClientDropdown(false);
        }
    };

    const handleClientNameFocus = () => {
        if (clientName.length > 0) {
            setShowClientDropdown(true);
            fetchClients(clientName);
        }
    };

    const handleClientNameBlur = () => {
        setTimeout(() => {
            setShowClientDropdown(false);
        }, 200);
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

    const handleSave = async () => {
        setIsSaving(true);
        toaster.create({
            id: "saving-invoice",
            title: "Saving changes...",
            type: "loading",
        });

        try {
            // Save or update client (if clientName or clientPhone is provided)
            let finalClientId = clientId;

            if (clientName?.trim() || clientPhone?.trim()) {
                if (!clientId) {
                    const clientPayload = {
                        name: clientName?.trim() || clientPhone?.trim() || "Customer",
                        phone: clientPhone?.trim() || undefined,
                    };

                    const clientResponse = await apiClient.post("/api/clients", clientPayload);

                    if (clientResponse.success && clientResponse.data) {
                        finalClientId = (clientResponse.data as any).id;
                    }
                } else {
                    // Update existing client
                    try {
                        await apiClient.put(`/api/clients/${clientId}`, {
                            name: clientName?.trim() || undefined,
                            phone: clientPhone?.trim() || undefined,
                        });
                    } catch (error) {
                        // Client update failed, but continue with invoice update
                        console.warn('Failed to update client:', error);
                    }
                }
            }

            // Validate items
            if (items.length === 0 || items.some(item => !item.description || item.quantity === 0 || item.rate < 0)) {
                toaster.create({
                    title: "Invalid items",
                    description: "Please add at least one item with description, quantity (not zero), and rate (non-negative).",
                    type: "error",
                });
                setIsSaving(false);
                return;
            }

            const invoiceItems = items.map(item => ({
                description: item.description,
                quantity: item.isReturn ? -Math.abs(item.quantity) : item.quantity,
                rate: item.rate,
                productId: item.productId,
            }));

            const response = await apiClient.put(`/api/invoices/${invoiceId}`, {
                clientName: clientName?.trim() || undefined,
                clientPhone: clientPhone?.trim() || undefined,
                clientId: finalClientId,
                items: invoiceItems,
                discountPercentage: discountPct,
                issueDate: new Date(`${issueDate}T00:00:00`).toISOString(),
                paymentMethod: paymentMethod,
                notes: notes || undefined,
            });

            if (response.success) {
                toaster.dismiss("saving-invoice");
                toaster.create({
                    title: "Invoice updated!",
                    description: "Your changes have been saved.",
                    type: "success",
                });
                router.push(`/dashboard/invoices/${invoiceId}`);
            } else {
                throw new Error(response.error || "Failed to update invoice");
            }
        } catch (error) {
            toaster.dismiss("saving-invoice");
            toaster.create({
                title: "Failed to update invoice",
                description: error instanceof Error ? error.message : "Please try again",
                type: "error",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSend = async () => {
        setSendDialogOpen(false);
        setIsSending(true);
        toaster.create({
            id: "sending-invoice",
            title: "Saving and sending invoice...",
            type: "loading",
        });

        try {
            // Validate items
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

            // Save or update client
            let finalClientId = clientId;

            if (clientName?.trim() || clientPhone?.trim()) {
                if (!clientId) {
                    const clientPayload = {
                        name: clientName?.trim() || clientPhone?.trim() || "Customer",
                        phone: clientPhone?.trim() || undefined,
                    };

                    const clientResponse = await apiClient.post("/api/clients", clientPayload);

                    if (clientResponse.success && clientResponse.data) {
                        finalClientId = (clientResponse.data as any).id;
                    }
                } else {
                    try {
                        await apiClient.put(`/api/clients/${clientId}`, {
                            name: clientName?.trim() || undefined,
                            phone: clientPhone?.trim() || undefined,
                        });
                    } catch (error) {
                        console.warn('Failed to update client:', error);
                    }
                }
            }

            const invoiceItems = items.map(item => ({
                description: item.description,
                quantity: item.isReturn ? -Math.abs(item.quantity) : item.quantity,
                rate: item.rate,
                productId: item.productId,
            }));

            // Update invoice
            const updateResponse = await apiClient.put(`/api/invoices/${invoiceId}`, {
                clientName: clientName?.trim() || undefined,
                clientPhone: clientPhone?.trim() || undefined,
                clientId: finalClientId,
                items: invoiceItems,
                discountPercentage: discountPct,
                issueDate: new Date(`${issueDate}T00:00:00`).toISOString(),
                paymentMethod: paymentMethod,
                notes: notes || undefined,
                status: "Pending",
            });

            if (updateResponse.success) {
                // Send the invoice
                try {
                    await apiClient.post(`/api/invoices/${invoiceId}/send`);
                } catch (sendError) {
                    console.warn('Failed to send invoice:', sendError);
                }

                toaster.dismiss("sending-invoice");
                toaster.create({
                    title: "Invoice updated and sent!",
                    description: `Invoice has been updated and sent successfully.`,
                    type: "success",
                });
                router.push(`/dashboard/invoices/${invoiceId}`);
            } else {
                throw new Error(updateResponse.error || "Failed to update invoice");
            }
        } catch (error) {
            toaster.dismiss("sending-invoice");
            toaster.create({
                title: "Failed to update invoice",
                description: error instanceof Error ? error.message : "Please try again",
                type: "error",
            });
        } finally {
            setIsSending(false);
        }
    };

    const handleDiscard = () => {
        setDiscardDialogOpen(false);
        router.push(`/dashboard/invoices/${invoiceId}`);
    };

    const handleDelete = async () => {
        setDeleteDialogOpen(false);
        toaster.create({
            id: "deleting-invoice",
            title: "Deleting invoice...",
            type: "loading",
        });

        try {
            const response = await apiClient.delete(`/api/invoices/${invoiceId}`);
            if (response.success) {
                toaster.dismiss("deleting-invoice");
                toaster.create({
                    title: "Invoice deleted",
                    type: "success",
                });
                router.push("/dashboard/invoices");
            } else {
                throw new Error(response.error || "Failed to delete invoice");
            }
        } catch (error) {
            toaster.dismiss("deleting-invoice");
            toaster.create({
                title: "Failed to delete invoice",
                description: error instanceof Error ? error.message : "Please try again",
                type: "error",
            });
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <VStack gap={6} align="stretch">
                    <Text>Loading invoice...</Text>
                </VStack>
            </DashboardLayout>
        );
    }

    if (!invoice) {
        return (
            <DashboardLayout>
                <VStack gap={6} align="stretch">
                    <Text>Invoice not found</Text>
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
                        <Link href={`/dashboard/invoices/${invoiceId}`}>
                            <IconButton variant="ghost" size="sm" aria-label="Back">
                                <LuArrowLeft />
                            </IconButton>
                        </Link>
                        <Box>
                            <Heading size="lg" fontWeight="semibold">Edit Invoice</Heading>
                            <Text color="fg.muted" fontSize="sm">{invoice.invoiceNumber}</Text>
                        </Box>
                    </HStack>
                    <HStack gap={2} flexWrap="wrap">
                        <Button
                            variant="ghost"
                            size="sm"
                            colorPalette="red"
                            onClick={() => setDeleteDialogOpen(true)}
                        >
                            <LuTrash2 /> Delete
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSave}
                            loading={isSaving}
                            loadingText="Saving..."
                        >
                            <LuSave /> Save Changes
                        </Button>
                        <Button
                            colorPalette="blue"
                            size="sm"
                            onClick={() => setSendDialogOpen(true)}
                            loading={isSending}
                            loadingText="Sending..."
                        >
                            <LuSend /> Save & Send
                        </Button>
                    </HStack>
                </Flex>

                <SimpleGrid columns={{ base: 1, lg: 3 }} gap={6}>
                    {/* Main Form */}
                    <Box gridColumn={{ base: "1", lg: "span 2" }}>
                        <VStack gap={6} align="stretch">
                            <ClientInfoForm
                                clientName={clientName}
                                clientPhone={clientPhone}
                                onClientNameChange={handleClientNameChange}
                                onClientPhoneChange={setClientPhone}
                                clients={clients}
                                showClientDropdown={showClientDropdown}
                                isSearchingClients={isSearchingClients}
                                onClientSelect={selectClient}
                                onClientNameFocus={handleClientNameFocus}
                                onClientNameBlur={handleClientNameBlur}
                            />

                            <InvoiceDetailsForm
                                issueDate={issueDate}
                                onIssueDateChange={setIssueDate}
                            />

                            <LineItemsSection
                                items={items}
                                onAddItem={addItem}
                                onRemoveItem={removeItem}
                                onUpdateItem={updateItem}
                                onToggleReturn={toggleReturn}
                                products={products}
                                productSearchQueries={productSearchQueries}
                                showProductDropdown={showProductDropdown}
                                isSearchingProducts={isSearchingProducts}
                                onProductSearchChange={handleProductSearchChange}
                                onProductSelect={selectProduct}
                                onProductSearchFocus={(itemId) => setShowProductDropdown({ ...showProductDropdown, [itemId]: true })}
                                onProductSearchBlur={(itemId) => {
                                    setTimeout(() => {
                                        setShowProductDropdown({ ...showProductDropdown, [itemId]: false });
                                    }, 200);
                                }}
                                filteredProducts={filteredProducts}
                            />

                            <PaymentMethodSection
                                paymentMethod={paymentMethod}
                                onPaymentMethodChange={setPaymentMethod}
                            />

                            <NotesSection
                                notes={notes}
                                onNotesChange={setNotes}
                            />
                        </VStack>
                    </Box>

                    {/* Summary Sidebar */}
                    <Box>
                        <InvoiceSummary
                            subtotal={subtotal}
                            returns={returns}
                            netSubtotal={netSubtotal}
                            discountPercentage={discountPercentage}
                            discountAmount={discountAmount}
                            total={total}
                            isDiscountEditing={isDiscountEditing}
                            onDiscountPercentageChange={setDiscountPercentage}
                            onDiscountEditToggle={() => setIsDiscountEditing(!isDiscountEditing)}
                            onDiscountReset={() => {
                                setDiscountPercentage(null);
                                setIsDiscountEditing(false);
                            }}
                        />
                    </Box>
                </SimpleGrid>
            </VStack>

            <SendInvoiceDialog
                isOpen={sendDialogOpen}
                onClose={() => setSendDialogOpen(false)}
                onConfirm={handleSend}
                clientName={clientName}
                clientPhone={clientPhone}
                total={total}
            />

            <DiscardDialog
                isOpen={discardDialogOpen}
                onClose={() => setDiscardDialogOpen(false)}
                onConfirm={handleDiscard}
            />

            {/* Delete Invoice Dialog */}
            <Dialog.Root open={deleteDialogOpen} onOpenChange={(e) => setDeleteDialogOpen(e.open)}>
                <Portal>
                    <Dialog.Backdrop bg="blackAlpha.600" />
                    <Dialog.Positioner>
                        <Dialog.Content bg="bg.surface" borderRadius="xl" mx={4}>
                            <Dialog.Header p={6} pb={4}>
                                <Dialog.Title fontWeight="semibold">Delete Invoice</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body px={6} pb={6}>
                                <Text color="fg.muted">
                                    Are you sure you want to delete this invoice? This action cannot be undone.
                                </Text>
                            </Dialog.Body>
                            <Dialog.Footer p={6} pt={4} gap={3}>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="outline">Cancel</Button>
                                </Dialog.ActionTrigger>
                                <Button
                                    colorPalette="red"
                                    onClick={handleDelete}
                                >
                                    <LuTrash2 /> Delete Invoice
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
