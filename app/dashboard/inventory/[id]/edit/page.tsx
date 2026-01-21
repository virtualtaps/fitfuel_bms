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
    IconButton,
    Flex,
    Field,
    Dialog,
    Portal,
    CloseButton,
} from "@chakra-ui/react";
import {
    LuArrowLeft,
    LuSave,
    LuPackage,
    LuX,
    LuCheck,
    LuTrash2,
} from "react-icons/lu";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { toaster } from "@/components/ui/toaster";
import { apiClient } from "@/lib/api";
import { ProductResponse } from "@/lib/models/Product";

interface CategoryResponse {
    id: string;
    name: string;
}

export default function EditProductPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;

    // Form state
    const [productName, setProductName] = useState("");
    const [arabicName, setArabicName] = useState("");
    const [description, setDescription] = useState("");
    const [sku, setSku] = useState("");
    const [category, setCategory] = useState("");

    // Categories state
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [filteredCategories, setFilteredCategories] = useState<CategoryResponse[]>([]);
    const [sellingPrice, setSellingPrice] = useState("");
    const [initialStock, setInitialStock] = useState("");
    const [minStock, setMinStock] = useState("");
    const [location, setLocation] = useState("");
    const [supplierName, setSupplierName] = useState("");
    const [supplierContact, setSupplierContact] = useState("");
    const [expiryDate, setExpiryDate] = useState("");

    // Loading state
    const [isLoading, setIsLoading] = useState(true);
    const [originalProduct, setOriginalProduct] = useState<ProductResponse | null>(null);

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // Fetch product data and categories
    useEffect(() => {
        fetchProduct();
        fetchCategories();
    }, [productId]);

    const fetchCategories = async () => {
        try {
            const response = await apiClient.get<CategoryResponse[]>("/api/categories");
            if (response.success && response.data) {
                setCategories(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch categories:", error);
        }
    };

    const handleCategoryChange = (value: string) => {
        setCategory(value);
        if (value.length > 0) {
            const filtered = categories.filter(cat =>
                cat.name.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredCategories(filtered);
            setShowCategoryDropdown(true);
        } else {
            setShowCategoryDropdown(false);
        }
    };

    const selectCategory = (categoryName: string) => {
        setCategory(categoryName);
        setShowCategoryDropdown(false);
    };

    const fetchProduct = async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get<ProductResponse>(`/api/inventory/${productId}`);
            if (response.success && response.data) {
                const product = response.data;
                setOriginalProduct(product);
                setProductName(product.name);
                setArabicName(product.arabicName || "");
                setDescription(product.description || "");
                setSku(product.sku || "");
                setCategory(product.category || "");
                setSellingPrice(product.sellingPrice.toString());
                setInitialStock(product.stock.toString());
                setMinStock(product.minStock?.toString() || "");
                setLocation(product.location || "");
                setSupplierName(product.supplierName || "");
                setSupplierContact(product.supplierContact || "");
                setExpiryDate(product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : "");
            } else {
                throw new Error(response.error || "Failed to load product");
            }
        } catch (error) {
            toaster.create({
                title: "Failed to load product",
                description: error instanceof Error ? error.message : "Please try again",
                type: "error",
            });
            router.push("/dashboard/inventory");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProduct = async () => {
        if (!productName.trim()) {
            toaster.create({
                title: "Please enter a product name",
                type: "error",
            });
            return;
        }

        setIsSaving(true);
        setSaveDialogOpen(false);
        toaster.create({
            id: "saving-product",
            title: "Saving changes...",
            type: "loading",
        });

        try {
            // If category is provided and doesn't exist, create it first
            let finalCategory = category?.trim() || undefined;
            if (finalCategory) {
                const categoryExists = categories.some(
                    cat => cat.name.toLowerCase() === finalCategory!.toLowerCase()
                );
                if (!categoryExists) {
                    try {
                        const categoryResponse = await apiClient.post<CategoryResponse>("/api/categories", {
                            name: finalCategory,
                        });
                        if (categoryResponse.success && categoryResponse.data) {
                            // Refresh categories list
                            await fetchCategories();
                        }
                    } catch (error) {
                        console.error("Failed to create category:", error);
                        // Continue with product update even if category creation fails
                    }
                }
            }

            const response = await apiClient.put(`/api/inventory/${productId}`, {
                name: productName,
                arabicName: arabicName || undefined,
                description: description || undefined,
                sku: sku || undefined,
                category: finalCategory,
                stock: parseInt(initialStock) || 0,
                minStock: parseInt(minStock) || undefined,
                sellingPrice: parseFloat(sellingPrice) || 0,
                location: location || undefined,
                supplierName: supplierName || undefined,
                supplierContact: supplierContact || undefined,
                expiryDate: expiryDate || undefined,
            });

            if (response.success) {
                toaster.dismiss("saving-product");
                toaster.create({
                    title: "Product updated successfully!",
                    description: `${productName} has been updated`,
                    type: "success",
                });
                router.push(`/dashboard/inventory/${productId}`);
            } else {
                throw new Error(response.error || "Failed to update product");
            }
        } catch (error) {
            toaster.dismiss("saving-product");
            toaster.create({
                title: "Failed to update product",
                description: error instanceof Error ? error.message : "Please try again",
                type: "error",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscard = () => {
        setDiscardDialogOpen(false);
        toaster.create({
            title: "Changes discarded",
            type: "info",
        });
        router.push(`/dashboard/inventory/${productId}`);
    };

    const handleDelete = async () => {
        setDeleteDialogOpen(false);
        toaster.create({
            id: "deleting-product",
            title: "Deleting product...",
            type: "loading",
        });

        try {
            const response = await apiClient.delete(`/api/inventory/${productId}`);
            if (response.success) {
                toaster.dismiss("deleting-product");
                toaster.create({
                    title: "Product deleted",
                    description: `${productName} has been removed from inventory`,
                    type: "success",
                });
                router.push("/dashboard/inventory");
            } else {
                throw new Error(response.error || "Failed to delete product");
            }
        } catch (error) {
            toaster.dismiss("deleting-product");
            toaster.create({
                title: "Failed to delete product",
                description: error instanceof Error ? error.message : "Please try again",
                type: "error",
            });
        }
    };

    const hasChanges = originalProduct ? (
        productName !== originalProduct.name ||
        arabicName !== (originalProduct.arabicName || "") ||
        description !== (originalProduct.description || "") ||
        sku !== originalProduct.sku ||
        category !== (originalProduct.category || "") ||
        sellingPrice !== originalProduct.sellingPrice.toString() ||
        initialStock !== originalProduct.stock.toString() ||
        minStock !== (originalProduct.minStock?.toString() || "") ||
        location !== (originalProduct.location || "") ||
        supplierName !== (originalProduct.supplierName || "") ||
        supplierContact !== (originalProduct.supplierContact || "") ||
        expiryDate !== (originalProduct.expiryDate ? new Date(originalProduct.expiryDate).toISOString().split('T')[0] : "")
    ) : false;

    if (isLoading) {
        return (
            <DashboardLayout>
                <VStack gap={6} align="stretch" py={8}>
                    <Text>Loading product...</Text>
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
                            onClick={() => hasChanges ? setDiscardDialogOpen(true) : router.push(`/dashboard/inventory/${productId}`)}
                        >
                            <LuArrowLeft />
                        </IconButton>
                        <Box>
                            <Heading size="lg" fontWeight="semibold">Edit Product</Heading>
                            <Text color="gray.500" fontSize="sm">Update product information</Text>
                        </Box>
                    </HStack>
                    <HStack gap={2}>
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
                            onClick={() => hasChanges ? setDiscardDialogOpen(true) : router.push(`/dashboard/inventory/${productId}`)}
                        >
                            Cancel
                        </Button>
                        <Button
                            colorPalette="orange"
                            size="sm"
                            loading={isSaving}
                            loadingText="Saving..."
                            onClick={() => setSaveDialogOpen(true)}
                        >
                            <LuSave /> Save Changes
                        </Button>
                    </HStack>
                </Flex>

                <SimpleGrid columns={{ base: 1, lg: 3 }} gap={6}>
                    {/* Main Form */}
                    <Box gridColumn={{ base: "1", lg: "span 2" }}>
                        <VStack gap={6} align="stretch">
                            {/* Basic Info */}
                            <Card.Root border="1px solid" borderColor="gray.100" bg="white">
                                <Card.Header p={5} pb={0}>
                                    <Heading size="sm" fontWeight="semibold">Basic Information</Heading>
                                </Card.Header>
                                <Card.Body p={5}>
                                    <VStack gap={4} align="stretch">
                                        <Field.Root>
                                            <Field.Label fontSize="sm">Product Name</Field.Label>
                                            <Input
                                                placeholder="Enter product name"
                                                size="sm"
                                                value={productName}
                                                onChange={(e) => setProductName(e.target.value)}
                                            />
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label fontSize="sm">Arabic Name</Field.Label>
                                            <Input
                                                placeholder="Enter Arabic product name"
                                                size="sm"
                                                value={arabicName}
                                                onChange={(e) => setArabicName(e.target.value)}
                                                dir="rtl"
                                            />
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label fontSize="sm">Description</Field.Label>
                                            <Textarea
                                                placeholder="Enter product description..."
                                                size="sm"
                                                rows={3}
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                            />
                                        </Field.Root>
                                        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                                            <Field.Root>
                                                <Field.Label fontSize="sm">SKU</Field.Label>
                                                <Input
                                                    placeholder="SKU-XXX"
                                                    size="sm"
                                                    value={sku}
                                                    onChange={(e) => setSku(e.target.value)}
                                                />
                                            </Field.Root>
                                            <Field.Root>
                                                <Field.Label fontSize="sm">Category</Field.Label>
                                                <Box position="relative">
                                                    <Input
                                                        placeholder="Type or select category"
                                                        size="sm"
                                                        value={category}
                                                        onChange={(e) => handleCategoryChange(e.target.value)}
                                                        onFocus={() => {
                                                            if (category.length > 0) {
                                                                handleCategoryChange(category);
                                                            }
                                                        }}
                                                        onBlur={() => {
                                                            setTimeout(() => {
                                                                setShowCategoryDropdown(false);
                                                            }, 200);
                                                        }}
                                                    />
                                                    {showCategoryDropdown && (filteredCategories.length > 0 || category.trim().length > 0) && (
                                                        <Box
                                                            position="absolute"
                                                            top="100%"
                                                            left={0}
                                                            right={0}
                                                            zIndex={1000}
                                                            bg="white"
                                                            borderWidth="1px"
                                                            borderColor="gray.200"
                                                            borderRadius="md"
                                                            shadow="lg"
                                                            mt={1}
                                                            maxH="200px"
                                                            overflowY="auto"
                                                        >
                                                            {filteredCategories.length > 0 ? (
                                                                filteredCategories.map((cat) => (
                                                                    <Box
                                                                        key={cat.id}
                                                                        px={3}
                                                                        py={2}
                                                                        cursor="pointer"
                                                                        _hover={{ bg: "gray.50" }}
                                                                        onClick={() => selectCategory(cat.name)}
                                                                    >
                                                                        <Text fontSize="sm">{cat.name}</Text>
                                                                    </Box>
                                                                ))
                                                            ) : (
                                                                category.trim().length > 0 && (
                                                                    <Box
                                                                        px={3}
                                                                        py={2}
                                                                        cursor="pointer"
                                                                        _hover={{ bg: "gray.50" }}
                                                                        onClick={() => selectCategory(category.trim())}
                                                                    >
                                                                        <Text fontSize="sm" color="blue.600">
                                                                            Create "{category.trim()}"
                                                                        </Text>
                                                                    </Box>
                                                                )
                                                            )}
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Field.Root>
                                        </SimpleGrid>
                                    </VStack>
                                </Card.Body>
                            </Card.Root>


                            <Card.Root border="1px solid" borderColor="gray.100" bg="white">
                                <Card.Header p={5} pb={0}>
                                    <Heading size="sm" fontWeight="semibold">Pricing</Heading>
                                </Card.Header>
                                <Card.Body p={5}>
                                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                                        <Field.Root>
                                            <Field.Label fontSize="sm">Selling Price</Field.Label>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                size="sm"
                                                value={sellingPrice}
                                                onChange={(e) => setSellingPrice(e.target.value)}
                                            />
                                        </Field.Root>
                                    </SimpleGrid>
                                </Card.Body>
                            </Card.Root>

                            {/* Stock */}
                            <Card.Root border="1px solid" borderColor="gray.100" bg="white">
                                <Card.Header p={5} pb={0}>
                                    <Heading size="sm" fontWeight="semibold">Stock Information</Heading>
                                </Card.Header>
                                <Card.Body p={5}>
                                    <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                                        <Field.Root>
                                            <Field.Label fontSize="sm">Current Stock</Field.Label>
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                size="sm"
                                                value={initialStock}
                                                onChange={(e) => setInitialStock(e.target.value)}
                                            />
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label fontSize="sm">Minimum Stock Level</Field.Label>
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                size="sm"
                                                value={minStock}
                                                onChange={(e) => setMinStock(e.target.value)}
                                            />
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label fontSize="sm">Location</Field.Label>
                                            <Input
                                                placeholder="Warehouse A - Shelf 1"
                                                size="sm"
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                            />
                                        </Field.Root>
                                    </SimpleGrid>
                                    <Field.Root>
                                        <Field.Label fontSize="sm">Expiry Date</Field.Label>
                                        <Input
                                            type="date"
                                            size="sm"
                                            value={expiryDate}
                                            onChange={(e) => setExpiryDate(e.target.value)}
                                        />
                                    </Field.Root>
                                </Card.Body>
                            </Card.Root>

                            {/* Supplier */}
                            <Card.Root border="1px solid" borderColor="gray.100" bg="white">
                                <Card.Header p={5} pb={0}>
                                    <Heading size="sm" fontWeight="semibold">Supplier Information</Heading>
                                </Card.Header>
                                <Card.Body p={5}>
                                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                                        <Field.Root>
                                            <Field.Label fontSize="sm">Supplier Name</Field.Label>
                                            <Input
                                                placeholder="Enter supplier name"
                                                size="sm"
                                                value={supplierName}
                                                onChange={(e) => setSupplierName(e.target.value)}
                                            />
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label fontSize="sm">Supplier Contact</Field.Label>
                                            <Input
                                                placeholder="Email or phone"
                                                size="sm"
                                                value={supplierContact}
                                                onChange={(e) => setSupplierContact(e.target.value)}
                                            />
                                        </Field.Root>
                                    </SimpleGrid>
                                </Card.Body>
                            </Card.Root>
                        </VStack>
                    </Box>

                    {/* Sidebar */}
                    <Box>
                        <Card.Root border="1px solid" borderColor="gray.100" bg="white" position="sticky" top="80px">
                            <Card.Header p={5} pb={0}>
                                <Heading size="sm" fontWeight="semibold">Preview</Heading>
                            </Card.Header>
                            <Card.Body p={5}>
                                <VStack gap={4} align="stretch">
                                    <Box textAlign="center" py={6} bg="orange.50" borderRadius="xl">
                                        <Box
                                            w={16}
                                            h={16}
                                            mx="auto"
                                            bg="orange.100"
                                            borderRadius="xl"
                                            display="flex"
                                            alignItems="center"
                                            justifyContent="center"
                                            color="orange.500"
                                            mb={3}
                                        >
                                            <LuPackage size={32} />
                                        </Box>
                                        <Text fontWeight="semibold">{productName || "Product Name"}</Text>
                                        <Text fontSize="sm" color="gray.500">{sku || "SKU-XXX"}</Text>
                                    </Box>
                                    <VStack gap={2} align="stretch">
                                        <HStack justify="space-between">
                                            <Text fontSize="sm" color="gray.600">Category</Text>
                                            <Text fontSize="sm" fontWeight="medium">{category || "-"}</Text>
                                        </HStack>
                                        <HStack justify="space-between">
                                            <Text fontSize="sm" color="gray.600">Price</Text>
                                            <Text fontSize="sm" fontWeight="medium">QAR {sellingPrice || "0.00"}</Text>
                                        </HStack>
                                        <HStack justify="space-between">
                                            <Text fontSize="sm" color="gray.600">Stock</Text>
                                            <Text fontSize="sm" fontWeight="medium">{initialStock || "0"} units</Text>
                                        </HStack>
                                    </VStack>
                                </VStack>
                            </Card.Body>
                        </Card.Root>
                    </Box>
                </SimpleGrid>
            </VStack>

            {/* Save Confirmation Dialog */}
            <Dialog.Root open={saveDialogOpen} onOpenChange={(e) => setSaveDialogOpen(e.open)}>
                <Portal>
                    <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
                    <Dialog.Positioner>
                        <Dialog.Content bg="white" borderRadius="xl" maxW="400px" mx={4}>
                            <Dialog.Header p={5} pb={0}>
                                <Dialog.Title fontWeight="semibold">Save Changes</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body p={5}>
                                <Text color="gray.600">
                                    Are you sure you want to save changes to "{productName}"?
                                </Text>
                            </Dialog.Body>
                            <Dialog.Footer p={5} pt={0} gap={3}>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="outline" size="sm">Cancel</Button>
                                </Dialog.ActionTrigger>
                                <Button
                                    colorPalette="orange"
                                    size="sm"
                                    onClick={handleSaveProduct}
                                >
                                    <LuCheck /> Save Changes
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
                        <Dialog.Content bg="white" borderRadius="xl" maxW="400px" mx={4}>
                            <Dialog.Header p={5} pb={0}>
                                <Dialog.Title fontWeight="semibold">Discard Changes</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body p={5}>
                                <Text color="gray.600">
                                    You have unsaved changes. Are you sure you want to discard them?
                                </Text>
                            </Dialog.Body>
                            <Dialog.Footer p={5} pt={0} gap={3}>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="outline" size="sm">Keep Editing</Button>
                                </Dialog.ActionTrigger>
                                <Button
                                    colorPalette="red"
                                    size="sm"
                                    onClick={handleDiscard}
                                >
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

            {/* Delete Confirmation Dialog */}
            <Dialog.Root open={deleteDialogOpen} onOpenChange={(e) => setDeleteDialogOpen(e.open)}>
                <Portal>
                    <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
                    <Dialog.Positioner>
                        <Dialog.Content bg="white" borderRadius="xl" maxW="400px" mx={4}>
                            <Dialog.Header p={5} pb={0}>
                                <Dialog.Title fontWeight="semibold">Delete Product</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body p={5}>
                                <Text color="gray.600">
                                    Are you sure you want to delete "{productName}"? This action cannot be undone.
                                </Text>
                            </Dialog.Body>
                            <Dialog.Footer p={5} pt={0} gap={3}>
                                <Dialog.ActionTrigger asChild>
                                    <Button variant="outline" size="sm">Cancel</Button>
                                </Dialog.ActionTrigger>
                                <Button
                                    colorPalette="red"
                                    size="sm"
                                    onClick={handleDelete}
                                >
                                    <LuTrash2 /> Delete Product
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
