"use client";

import { Text, Button, Dialog, Portal, CloseButton } from "@chakra-ui/react";
import { LuTrash2 } from "react-icons/lu";

interface DeleteInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDelete: () => void;
}

export default function DeleteInvoiceDialog({ open, onOpenChange, onDelete }: DeleteInvoiceDialogProps) {
    return (
        <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
            <Portal>
                <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(4px)" />
                <Dialog.Positioner>
                    <Dialog.Content bg="bg.surface" borderRadius="xl" maxW="400px" mx={4}>
                        <Dialog.Header p={5} pb={0}>
                            <Dialog.Title fontWeight="semibold">Delete Invoice</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body p={5}>
                            <Text color="fg.muted">
                                Are you sure you want to delete this invoice? This action cannot be undone.
                            </Text>
                        </Dialog.Body>
                        <Dialog.Footer p={5} pt={0} gap={3}>
                            <Dialog.ActionTrigger asChild>
                                <Button variant="outline" size="sm">Cancel</Button>
                            </Dialog.ActionTrigger>
                            <Button colorPalette="red" size="sm" onClick={onDelete}>
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
    );
}
