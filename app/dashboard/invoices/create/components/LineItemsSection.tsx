"use client";

import {
    Card,
    Heading,
    Button,
    VStack,
    HStack,
    Box,
    Input,
    Text,
    IconButton,
    Field,
    SimpleGrid,
    Flex,
    List,
    Icon,
} from "@chakra-ui/react";
import { LuPlus, LuTrash2, LuPackage, LuScanLine, LuX } from "react-icons/lu";
import { ProductResponse } from "@/lib/models/Product";

export interface InvoiceItem {
    id: number;
    description: string;
    quantity: number;
    rate: number;
    discount?: number; // Per-item discount amount
    isReturn?: boolean;
    productId?: string;
    productStock?: number; // Store product stock for validation
}

interface LineItemsSectionProps {
    items: InvoiceItem[];
    onAddItem: () => void;
    onRemoveItem: (id: number) => void;
    onUpdateItem: (id: number, field: keyof InvoiceItem, value: string | number) => void;
    onToggleReturn: (id: number) => void;
    products: ProductResponse[];
    productSearchQueries: { [key: number]: string };
    showProductDropdown: { [key: number]: boolean };
    isSearchingProducts: { [key: number]: boolean };
    onProductSearchChange: (itemId: number, value: string) => void;
    onProductSelect: (itemId: number, product: ProductResponse) => void;
    onProductSearchFocus: (itemId: number) => void;
    onProductSearchBlur: (itemId: number) => void;
    filteredProducts: (itemId: number) => ProductResponse[];
    scannerEnabled: boolean;
    onToggleScanner: () => void;
}

export default function LineItemsSection({
    items,
    onAddItem,
    onRemoveItem,
    onUpdateItem,
    onToggleReturn,
    products,
    productSearchQueries,
    showProductDropdown,
    isSearchingProducts,
    onProductSearchChange,
    onProductSelect,
    onProductSearchFocus,
    onProductSearchBlur,
    filteredProducts,
    scannerEnabled,
    onToggleScanner,
}: LineItemsSectionProps) {
    return (
        <Card.Root border="1px solid" borderColor="border.default" bg="bg.surface">
            <Card.Header p={5} pb={0}>
                <Flex justify="space-between" align="center">
                    <HStack gap={2}>
                        <Heading size="sm" fontWeight="semibold">Line Items</Heading>
                        <Button
                            size="xs"
                            variant={scannerEnabled ? "solid" : "outline"}
                            colorPalette={scannerEnabled ? "green" : "gray"}
                            onClick={onToggleScanner}
                            gap={1}
                        >
                            <Icon fontSize="xs">
                                {scannerEnabled ? <LuScanLine /> : <LuScanLine />}
                            </Icon>
                            {scannerEnabled ? "Scanning ON" : "Scan"}
                            {scannerEnabled && <Icon fontSize="xs"><LuX /></Icon>}
                        </Button>
                    </HStack>
                    <Button variant="ghost" size="xs" onClick={onAddItem}>
                        <LuPlus /> Add Item
                    </Button>
                </Flex>
            </Card.Header>
            <Card.Body p={5}>
                {/* Desktop view - horizontal layout */}
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
                                            data-item-id={item.id}
                                            value={productSearchQueries[item.id] !== undefined && productSearchQueries[item.id] !== "" ? productSearchQueries[item.id] : item.description}
                                            onChange={(e) => onProductSearchChange(item.id, e.target.value)}
                                            onFocus={() => onProductSearchFocus(item.id)}
                                            onBlur={() => onProductSearchBlur(item.id)}
                                            borderColor={item.isReturn ? "red.300" : undefined}
                                            bg={item.isReturn ? "red.50" : undefined}
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
                                                                _hover={{ bg: "blue.500/10" }}
                                                                onClick={() => onProductSelect(item.id, product)}
                                                                p={2}
                                                                borderBottomWidth="1px"
                                                                borderColor="border.default"
                                                            >
                                                                <HStack gap={2}>
                                                                    <Icon color="blue.500"><LuPackage /></Icon>
                                                                    <VStack align="start" gap={0} flex={1}>
                                                                        <Text fontSize="sm" fontWeight="medium">{product.name}</Text>
                                                                        {product.arabicName && (
                                                                            <Text fontSize="xs" color="fg.muted" dir="rtl">{product.arabicName}</Text>
                                                                        )}
                                                                        <HStack gap={2} flexWrap="wrap">
                                                                            <Text fontSize="xs" color="fg.muted">SKU: {product.sku}</Text>
                                                                            <Text fontSize="xs" color="fg.muted">•</Text>
                                                                            <Text fontSize="xs" color="blue.600" fontWeight="medium">QAR {product.sellingPrice.toLocaleString()}</Text>
                                                                            <Text fontSize="xs" color="fg.muted">•</Text>
                                                                            <Text fontSize="xs" color={product.stock === 0 ? "red.600" : product.stock < (product.minStock || 15) ? "orange.600" : "green.600"}>
                                                                                Stock: {product.stock}
                                                                            </Text>
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
                                    {!item.isReturn && item.productStock !== undefined && item.quantity > item.productStock && (
                                        <Text fontSize="xs" color="red.500" mt={0.5}>
                                            Quantity exceeds available stock ({item.productStock})
                                        </Text>
                                    )}
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
                                                    onUpdateItem(item.id, 'quantity', 0);
                                                } else {
                                                    const numValue = parseInt(value);
                                                    if (!isNaN(numValue)) {
                                                        onUpdateItem(item.id, 'quantity', numValue);
                                                    }
                                                }
                                            }}
                                            borderColor={
                                                item.quantity === 0
                                                    ? "red.500"
                                                    : !item.isReturn && item.productStock !== undefined && item.quantity > item.productStock
                                                        ? "red.500"
                                                        : item.isReturn
                                                            ? "red.300"
                                                            : undefined
                                            }
                                            bg={
                                                item.quantity === 0
                                                    ? "red.50"
                                                    : !item.isReturn && item.productStock !== undefined && item.quantity > item.productStock
                                                        ? "red.50"
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
                                                onUpdateItem(item.id, 'rate', 0);
                                            } else {
                                                const numValue = parseFloat(value);
                                                if (!isNaN(numValue)) {
                                                    onUpdateItem(item.id, 'rate', numValue);
                                                }
                                            }
                                        }}
                                        borderColor={item.isReturn ? "red.300" : undefined}
                                        bg={item.isReturn ? "red.50" : undefined}
                                    />
                                </Box>
                                <Box w={{ base: "90px", md: "90px" }} flexShrink={0}>
                                    {index === 0 && <Text fontSize="xs" color="fg.muted" mb={1}>Disc. (QAR)</Text>}
                                    <Input
                                        type="number"
                                        size={{ base: "md", md: "sm" }}
                                        placeholder="0"
                                        value={!item.discount ? '' : item.discount}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === '') {
                                                onUpdateItem(item.id, 'discount', 0);
                                            } else {
                                                const numValue = parseFloat(value);
                                                if (!isNaN(numValue) && numValue >= 0) {
                                                    onUpdateItem(item.id, 'discount', numValue);
                                                }
                                            }
                                        }}
                                        borderColor={item.isReturn ? "red.300" : undefined}
                                        bg={item.isReturn ? "red.50" : undefined}
                                    />
                                </Box>
                                <Box w={{ base: "100px", md: "100px" }} flexShrink={0}>
                                    {index === 0 && <Text fontSize="xs" color="fg.muted" mb={1}>Amount</Text>}
                                    <Text
                                        fontWeight="medium"
                                        py={2}
                                        color={item.isReturn ? "red.600" : undefined}
                                    >
                                        {item.isReturn ? "-" : ""}QAR {(item.quantity * item.rate - (item.discount || 0)).toLocaleString()}
                                    </Text>
                                </Box>
                                <Box w={{ base: "80px", md: "80px" }} flexShrink={0}>
                                    {index === 0 && <Text fontSize="xs" color="fg.muted" mb={1}>Type</Text>}
                                    <Button
                                        size="xs"
                                        variant={item.isReturn ? "solid" : "outline"}
                                        colorPalette={item.isReturn ? "red" : "gray"}
                                        onClick={() => onToggleReturn(item.id)}
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
                                    onClick={() => onRemoveItem(item.id)}
                                    disabled={items.length === 1}
                                >
                                    <LuTrash2 />
                                </IconButton>
                            </HStack>
                        ))}
                    </VStack>
                </Box>
                {/* Mobile view - stacked cards */}
                <VStack gap={4} align="stretch" display={{ base: "flex", md: "none" }}>
                    {items.map((item) => (
                        <Card.Root
                            key={item.id}
                            variant="outline"
                            bg={item.isReturn ? "red.50" : "gray.50"}
                            borderColor={item.isReturn ? "red.200" : undefined}
                        >
                            <Card.Body p={4}>
                                <VStack gap={3} align="stretch">
                                    <Field.Root>
                                        <Field.Label fontSize="xs">Description</Field.Label>
                                        <Box position="relative">
                                            <Input
                                                placeholder="Search product or enter description"
                                                size="md"
                                                data-item-id={item.id}
                                                value={productSearchQueries[item.id] !== undefined && productSearchQueries[item.id] !== "" ? productSearchQueries[item.id] : item.description}
                                                onChange={(e) => onProductSearchChange(item.id, e.target.value)}
                                                onFocus={() => onProductSearchFocus(item.id)}
                                                onBlur={() => onProductSearchBlur(item.id)}
                                                borderColor={item.isReturn ? "red.300" : undefined}
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
                                                                _hover={{ bg: "blue.500/10" }}
                                                                onClick={() => onProductSelect(item.id, product)}
                                                                p={2}
                                                                borderBottomWidth="1px"
                                                                borderColor="border.default"
                                                            >
                                                                <HStack gap={2}>
                                                                    <Icon color="blue.500"><LuPackage /></Icon>
                                                                    <VStack align="start" gap={0} flex={1}>
                                                                        <Text fontSize="sm" fontWeight="medium">{product.name}</Text>
                                                                        {product.arabicName && (
                                                                            <Text fontSize="xs" color="fg.muted" dir="rtl">{product.arabicName}</Text>
                                                                        )}
                                                                        <HStack gap={2} flexWrap="wrap">
                                                                            <Text fontSize="xs" color="fg.muted">SKU: {product.sku}</Text>
                                                                            <Text fontSize="xs" color="fg.muted">•</Text>
                                                                            <Text fontSize="xs" color="blue.600" fontWeight="medium">QAR {product.sellingPrice.toLocaleString()}</Text>
                                                                            <Text fontSize="xs" color="fg.muted">•</Text>
                                                                            <Text fontSize="xs" color={product.stock === 0 ? "red.600" : product.stock < (product.minStock || 15) ? "orange.600" : "green.600"}>
                                                                                Stock: {product.stock}
                                                                            </Text>
                                                                        </HStack>
                                                                    </VStack>
                                                                </HStack>
                                                            </List.Item>
                                                        ))}
                                                    </List.Root>
                                                </Box>
                                            )}
                                        </Box>
                                        {item.productId && (
                                            <Text fontSize="xs" color="blue.600" mt={1}>
                                                Product selected from inventory
                                            </Text>
                                        )}
                                        {!item.isReturn && item.productStock !== undefined && item.quantity > item.productStock && (
                                            <Text fontSize="xs" color="red.500" mt={1}>
                                                Quantity exceeds available stock ({item.productStock})
                                            </Text>
                                        )}
                                    </Field.Root>
                                    <SimpleGrid columns={2} gap={3}>
                                        <Field.Root>
                                            <Field.Label fontSize="xs">Quantity</Field.Label>
                                            <VStack align="stretch" gap={0}>
                                                <Input
                                                    type="number"
                                                    size="sm"
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value === '') {
                                                            onUpdateItem(item.id, 'quantity', 0);
                                                        } else {
                                                            const numValue = parseInt(value);
                                                            if (!isNaN(numValue)) {
                                                                onUpdateItem(item.id, 'quantity', numValue);
                                                            }
                                                        }
                                                    }}
                                                    value={item.quantity === 0 ? '' : item.quantity}
                                                    borderColor={
                                                        item.quantity === 0
                                                            ? "red.500"
                                                            : !item.isReturn && item.productStock !== undefined && item.quantity > item.productStock
                                                                ? "red.500"
                                                                : item.isReturn
                                                                    ? "red.300"
                                                                    : undefined
                                                    }
                                                    bg={
                                                        item.quantity === 0
                                                            ? "red.50"
                                                            : !item.isReturn && item.productStock !== undefined && item.quantity > item.productStock
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
                                                        onUpdateItem(item.id, 'rate', 0);
                                                    } else {
                                                        const numValue = parseFloat(value);
                                                        if (!isNaN(numValue)) {
                                                            onUpdateItem(item.id, 'rate', numValue);
                                                        }
                                                    }
                                                }}
                                                borderColor={item.isReturn ? "red.300" : undefined}
                                            />
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label fontSize="xs">Discount (QAR)</Field.Label>
                                            <Input
                                                type="number"
                                                size="sm"
                                                placeholder="0"
                                                value={!item.discount ? '' : item.discount}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === '') {
                                                        onUpdateItem(item.id, 'discount', 0);
                                                    } else {
                                                        const numValue = parseFloat(value);
                                                        if (!isNaN(numValue) && numValue >= 0) {
                                                            onUpdateItem(item.id, 'discount', numValue);
                                                        }
                                                    }
                                                }}
                                                borderColor={item.isReturn ? "red.300" : undefined}
                                            />
                                        </Field.Root>
                                    </SimpleGrid>
                                    <Flex justify="space-between" align="center" gap={2}>
                                        <Button
                                            size="xs"
                                            variant={item.isReturn ? "solid" : "outline"}
                                            colorPalette={item.isReturn ? "red" : "gray"}
                                            onClick={() => onToggleReturn(item.id)}
                                            title={item.isReturn ? "Mark as sale" : "Mark as return"}
                                        >
                                            {item.isReturn ? "Return" : "Sale"}
                                        </Button>
                                        <HStack gap={2} flex={1} justify="flex-end">
                                            <Text fontSize="sm" color="fg.muted">
                                                Amount: <Text as="span" fontWeight="semibold" color={item.isReturn ? "red.600" : "gray.800"}>
                                                    {item.isReturn ? "-" : ""}QAR {(item.quantity * item.rate - (item.discount || 0)).toLocaleString()}
                                                </Text>
                                            </Text>
                                            <IconButton
                                                variant="ghost"
                                                size="xs"
                                                colorPalette="red"
                                                aria-label="Remove item"
                                                onClick={() => onRemoveItem(item.id)}
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
    );
}

