"use client";

import {
    Card,
    Heading,
    VStack,
    HStack,
    Text,
    Box,
    Separator,
    Input,
    IconButton,
} from "@chakra-ui/react";
import { LuRotateCcw } from "react-icons/lu";

interface InvoiceSummaryProps {
    subtotal: number;
    returns: number;
    netSubtotal: number;
    discountPercentage: number | null;
    discountAmount: number;
    total: number;
    isDiscountEditing: boolean;
    onDiscountPercentageChange: (value: number | null) => void;
    onDiscountEditToggle: () => void;
    onDiscountReset: () => void;
}

export default function InvoiceSummary({
    subtotal,
    returns,
    netSubtotal,
    discountPercentage,
    discountAmount,
    total,
    isDiscountEditing,
    onDiscountPercentageChange,
    onDiscountEditToggle,
    onDiscountReset,
}: InvoiceSummaryProps) {
    return (
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
                    <Box
                        border="2px solid"
                        borderColor={discountAmount > 0 ? "blue.500/30" : "border.emphasized"}
                        borderRadius="md"
                        p={3}
                        bg={discountAmount > 0 ? "blue.500/10" : "bg.subtle"}
                    >
                        <HStack justify="space-between" align="center">
                            <HStack gap={2} align="center">
                                <Text color="fg.muted" fontSize="sm" fontWeight="semibold">
                                    Discount
                                </Text>
                                {discountPercentage !== null && discountPercentage > 0 && (
                                    <IconButton
                                        variant="ghost"
                                        size="xs"
                                        aria-label="Reset discount"
                                        onClick={onDiscountReset}
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
                                        size="sm"
                                        w="80px"
                                        value={discountPercentage !== null ? discountPercentage : ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === '') {
                                                onDiscountPercentageChange(null);
                                            } else {
                                                const numValue = parseFloat(value);
                                                if (!isNaN(numValue)) {
                                                    onDiscountPercentageChange(Math.min(100, Math.max(0, numValue)));
                                                }
                                            }
                                        }}
                                        onBlur={onDiscountEditToggle}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                onDiscountEditToggle();
                                            }
                                            if (e.key === 'Escape') {
                                                onDiscountPercentageChange(null);
                                                onDiscountEditToggle();
                                            }
                                        }}
                                        autoFocus
                                        min="0"
                                        max="100"
                                        step="0.01"
                                    />
                                    <Text fontSize="sm" color="fg.muted" fontWeight="medium">%</Text>
                                </HStack>
                            ) : (
                                <Box textAlign="right">
                                    <Text
                                        fontWeight="bold"
                                        fontSize="md"
                                        cursor="pointer"
                                        color={discountAmount > 0 ? "blue.600" : "fg.muted"}
                                        _hover={{ color: "blue.500", textDecoration: "underline" }}
                                        onClick={onDiscountEditToggle}
                                        title="Click to edit discount percentage"
                                    >
                                        {discountPercentage !== null ? discountPercentage : 0}%
                                    </Text>
                                    {discountAmount > 0 && (
                                        <Text fontSize="xs" color="fg.muted">QAR {discountAmount.toLocaleString()}</Text>
                                    )}
                                </Box>
                            )}
                        </HStack>
                    </Box>
                    <Separator />
                    <HStack justify="space-between">
                        <Text fontWeight="semibold">Total</Text>
                        <Text fontWeight="bold" fontSize="xl" color="blue.600">QAR {total.toLocaleString()}</Text>
                    </HStack>
                </VStack>
            </Card.Body>
        </Card.Root>
    );
}

