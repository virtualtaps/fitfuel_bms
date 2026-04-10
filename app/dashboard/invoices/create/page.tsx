"use client";

import { useState, useEffect } from "react";
import { Box, VStack, SimpleGrid } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { toaster } from "@/components/ui/toaster";
import { apiClient } from "@/lib/api";
import { ProductResponse } from "@/lib/models/Product";
import { ClientResponse } from "@/lib/models/Client";
import { PaginatedResponse } from "@/types/api";
import InvoiceHeader from "./components/InvoiceHeader";
import ClientInfoForm from "./components/ClientInfoForm";
import InvoiceDetailsForm from "./components/InvoiceDetailsForm";
import LineItemsSection, { InvoiceItem } from "./components/LineItemsSection";
import PaymentMethodSection from "./components/PaymentMethodSection";
import NotesSection from "./components/NotesSection";
import InvoiceSummary from "./components/InvoiceSummary";
import SendInvoiceDialog from "./components/SendInvoiceDialog";
import DiscardDialog from "./components/DiscardDialog";
import { PhysicalScannerInput } from "@/components/scanner/PhysicalScannerInput";

export default function CreateInvoicePage() {
    const router = useRouter();
    const [items, setItems] = useState<InvoiceItem[]>([
        { id: 1, description: "", quantity: 1, rate: 0, isReturn: false },
    ]);
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
    const [focusTargetId, setFocusTargetId] = useState<number | null>(null);

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

    // Focus the description input of the target item after a scan
    useEffect(() => {
        if (focusTargetId === null) return;
        const el = document.querySelector<HTMLInputElement>(`input[data-item-id="${focusTargetId}"]`);
        if (el) el.focus();
        setFocusTargetId(null);
    }, [focusTargetId]);

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

    // Debounced search function
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

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            Object.values(searchDebounceTimers).forEach(timer => {
                if (timer) clearTimeout(timer);
            });
            if (clientSearchDebounceTimer) clearTimeout(clientSearchDebounceTimer);
        };
    }, []);

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
                    productStock: product.stock, // Store stock for validation
                };
            }
            return item;
        }));
        setProductSearchQueries({ ...productSearchQueries, [itemId]: product.name });
        setShowProductDropdown({ ...showProductDropdown, [itemId]: false });
    };

    const handleGlobalScan = async (barcode: string) => {
        try {
            const response = await apiClient.get<ProductResponse>(`/api/inventory/search-by-sku?sku=${encodeURIComponent(barcode)}`);

            if (response.success && response.data) {
                const product = response.data;

                const existingItem = items.find(item => item.productId === product.id);

                if (existingItem) {
                    // Increment quantity of existing line item
                    setItems(prev => prev.map(item =>
                        item.id === existingItem.id
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                    ));
                    toaster.create({
                        title: "Quantity updated",
                        description: `${product.name} ×${existingItem.quantity + 1}`,
                        type: "success",
                    });
                    // Focus a new empty row or the existing item row
                    const emptyAfter = items.find(item => !item.description && !item.productId);
                    if (emptyAfter) {
                        setFocusTargetId(emptyAfter.id);
                    }
                } else {
                    // Find an empty slot or add new item
                    const emptyItem = items.find(item => !item.description && !item.productId);

                    if (emptyItem) {
                        setItems(prev => prev.map(item =>
                            item.id === emptyItem.id
                                ? { ...item, description: product.name, rate: product.sellingPrice, productId: product.id, productStock: product.stock }
                                : item
                        ));
                        setProductSearchQueries(prev => ({ ...prev, [emptyItem.id]: product.name }));
                        // Add a new row and focus it
                        const newId = Date.now();
                        setItems(prev => [...prev, { id: newId, description: "", quantity: 1, rate: 0, isReturn: false }]);
                        setFocusTargetId(newId);
                    } else {
                        const newId = Date.now();
                        setItems(prev => [...prev, {
                            id: newId,
                            description: product.name,
                            quantity: 1,
                            rate: product.sellingPrice,
                            isReturn: false,
                            productId: product.id,
                            productStock: product.stock,
                        }]);
                        setProductSearchQueries(prev => ({ ...prev, [newId]: product.name }));
                        // Add another empty row and focus it
                        const nextId = Date.now() + 1;
                        setItems(prev => [...prev, { id: nextId, description: "", quantity: 1, rate: 0, isReturn: false }]);
                        setFocusTargetId(nextId);
                    }

                    toaster.create({
                        title: "Product added",
                        description: product.name,
                        type: "success",
                    });
                }
            } else {
                toaster.create({
                    title: "Product not found",
                    description: `No product found with SKU: ${barcode}`,
                    type: "error",
                });
            }
        } catch (error) {
            toaster.create({
                title: "Scan failed",
                description: error instanceof Error ? error.message : "Failed to search for product",
                type: "error",
            });
        }
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

    // Check if there are unsaved changes
    const hasUnsavedChanges = items.some(item =>
        item.description || item.quantity > 0 || item.rate > 0
    ) || clientName || clientPhone || notes || discountPercentage !== null || paymentMethod;

    // Validate stock quantities before saving/sending
    const validateStockQuantities = (): { valid: boolean; error?: string } => {
        for (const item of items) {
            // Only validate non-return items that have a productId
            if (!item.isReturn && item.productId && item.productStock !== undefined) {
                if (item.quantity > item.productStock) {
                    return {
                        valid: false,
                        error: `Quantity (${item.quantity}) exceeds available stock (${item.productStock}) for "${item.description}"`
                    };
                }
            }
        }
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

            let finalClientId = clientId;

            if (!clientId && (clientName?.trim() || clientPhone?.trim())) {
                const clientPayload = {
                    name: clientName?.trim() || clientPhone?.trim() || "Customer",
                    phone: clientPhone?.trim() || undefined,
                };

                const clientResponse = await apiClient.post("/api/clients", clientPayload);

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

            const invoiceItems = items.map(item => ({
                description: item.description,
                quantity: item.isReturn ? -Math.abs(item.quantity) : item.quantity,
                rate: item.rate,
                productId: item.productId,
            }));

            const response = await apiClient.post("/api/invoices", {
                clientName: clientName?.trim() || undefined,
                clientPhone: clientPhone?.trim() || undefined,
                clientId: finalClientId,
                items: invoiceItems,
                discountPercentage: discountPct,
                issueDate: new Date().toISOString(),
                paymentMethod: paymentMethod,
                notes: notes || undefined,
                status: "Draft",
            });

            if (response.success) {
                toaster.dismiss("saving-draft");
                toaster.create({
                    title: "Draft saved",
                    description: "Your invoice has been saved as a draft.",
                    type: "success",
                });
                router.push("/dashboard/invoices");
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
        setSendDialogOpen(false);
        setIsSending(true);
        toaster.create({
            id: "sending-invoice",
            title: "Creating and sending invoice...",
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

            const invoiceItems = items.map(item => ({
                description: item.description,
                quantity: item.isReturn ? -Math.abs(item.quantity) : item.quantity,
                rate: item.rate,
                productId: item.productId,
            }));

            let finalClientId = clientId;

            if (!clientId && (clientName?.trim() || clientPhone?.trim())) {
                const clientPayload = {
                    name: clientName?.trim() || clientPhone?.trim() || "Customer",
                    phone: clientPhone?.trim() || undefined,
                };

                const clientResponse = await apiClient.post("/api/clients", clientPayload);

                if (clientResponse.success && clientResponse.data) {
                    finalClientId = (clientResponse.data as any).id;
                }
            }

            const response = await apiClient.post("/api/invoices", {
                clientName: clientName?.trim() || undefined,
                clientPhone: clientPhone?.trim() || undefined,
                clientId: finalClientId,
                items: invoiceItems,
                discountPercentage: discountPct,
                issueDate: new Date().toISOString(),
                paymentMethod: paymentMethod,
                notes: notes || undefined,
                status: "Pending",
            });

            if (response.success && response.data) {
                const invoiceData = response.data as any;
                const invoiceId = invoiceData.id || invoiceData._id;

                if (invoiceId) {
                    try {
                        await apiClient.post(`/api/invoices/${invoiceId}/send`);
                    } catch (sendError) {
                        console.warn('Failed to send invoice:', sendError);
                    }
                }

                toaster.dismiss("sending-invoice");
                toaster.create({
                    title: "Invoice created and sent!",
                    description: `Invoice has been created successfully.`,
                    type: "success",
                });
                router.push("/dashboard/invoices");
            } else {
                throw new Error(response.error || "Failed to create invoice");
            }
        } catch (error) {
            toaster.dismiss("sending-invoice");
            toaster.create({
                title: "Failed to create invoice",
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
        router.push("/dashboard/invoices");
    };

    return (
        <DashboardLayout>
            <VStack gap={6} align="stretch">
                <InvoiceHeader
                    onSaveDraft={handleSaveDraft}
                    onSend={() => setSendDialogOpen(true)}
                    isSaving={isSaving}
                    isSending={isSending}
                />

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

            <PhysicalScannerInput
                onScan={handleGlobalScan}
                enabled={true}
                showIndicator={true}
            />
        </DashboardLayout>
    );
}
