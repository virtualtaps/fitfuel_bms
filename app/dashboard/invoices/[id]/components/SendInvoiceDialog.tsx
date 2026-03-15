"use client";

import { Text, Button, Dialog, Portal, CloseButton } from "@chakra-ui/react";
import { LuSend } from "react-icons/lu";
import { InvoiceResponse } from "@/lib/models/Invoice";

interface SendInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoice: InvoiceResponse;
    onSend: () => void;
}

export default function SendInvoiceDialog({ open, onOpenChange, invoice, onSend }: SendInvoiceDialogProps) {
    return (
        <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
            <Portal>
                <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
                <Dialog.Positioner>
                    <Dialog.Content bg="bg.surface" borderRadius="xl" maxW="400px" mx={4}>
                        <Dialog.Header p={5} pb={0}>
                            <Dialog.Title fontWeight="semibold">Send Invoice</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body p={5}>
                            <Text color="fg.muted">Send invoice {invoice.invoiceNumber}?</Text>
                        </Dialog.Body>
                        <Dialog.Footer p={5} pt={0} gap={3}>
                            <Dialog.ActionTrigger asChild>
                                <Button variant="outline" size="sm">Cancel</Button>
                            </Dialog.ActionTrigger>
                            <Button colorPalette="blue" size="sm" onClick={onSend}>
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
    );
}
