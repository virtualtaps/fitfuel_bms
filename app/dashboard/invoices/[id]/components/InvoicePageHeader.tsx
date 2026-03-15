"use client";

import { Box, HStack, Heading, Badge, Text, Button, IconButton, Flex } from "@chakra-ui/react";
import { LuArrowLeft, LuPencil, LuSend, LuPrinter, LuCopy, LuTrash2, LuReceiptText } from "react-icons/lu";
import Link from "next/link";
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

interface InvoicePageHeaderProps {
    invoice: InvoiceResponse;
    invoiceId: string;
    isPrinting: boolean;
    isSending: boolean;
    onPrint: () => void;
    onPrintReceipt: () => void;
    onDuplicate: () => void;
    onSendClick: () => void;
    onDeleteClick: () => void;
}

export default function InvoicePageHeader({
    invoice,
    invoiceId,
    isPrinting,
    isSending,
    onPrint,
    onPrintReceipt,
    onDuplicate,
    onSendClick,
    onDeleteClick,
}: InvoicePageHeaderProps) {
    return (
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
                        Created on {new Date(invoice.issueDate).toLocaleDateString("en-US", {
                            month: "long", day: "numeric", year: "numeric",
                        })}
                    </Text>
                </Box>
            </HStack>

            <HStack gap={2} flexWrap="wrap">
                <Button variant="outline" size="sm" loading={isPrinting} onClick={onPrint}>
                    <LuPrinter /> Print
                </Button>
                <Button variant="outline" size="sm" onClick={onPrintReceipt}>
                    <LuReceiptText /> Print Receipt
                </Button>
                <Button variant="outline" size="sm" onClick={onDuplicate}>
                    <LuCopy /> Duplicate
                </Button>
                <Link href={`/dashboard/invoices/${invoiceId}/edit`}>
                    <Button variant="outline" size="sm">
                        <LuPencil /> Edit
                    </Button>
                </Link>
                <Button colorPalette="blue" size="sm" loading={isSending} loadingText="Sending..." onClick={onSendClick}>
                    <LuSend /> Send Invoice
                </Button>
                <Button colorPalette="red" variant="outline" size="sm" onClick={onDeleteClick}>
                    <LuTrash2 /> Delete
                </Button>
            </HStack>
        </Flex>
    );
}
