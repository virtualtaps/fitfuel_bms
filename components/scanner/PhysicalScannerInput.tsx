"use client";

import { useEffect } from 'react';
import { Badge, Text, HStack, Icon } from '@chakra-ui/react';
import { LuScanLine } from 'react-icons/lu';
import { usePhysicalScanner } from '@/hooks/usePhysicalScanner';

interface PhysicalScannerInputProps {
    onScan: (value: string) => void;
    enabled?: boolean;
    showIndicator?: boolean;
}

export function PhysicalScannerInput({ 
    onScan, 
    enabled = true,
    showIndicator = true,
}: PhysicalScannerInputProps) {
    const { inputRef, isActive, activate, deactivate } = usePhysicalScanner({
        onScan,
        enabled,
    });

    useEffect(() => {
        if (enabled) {
            activate();
        } else {
            deactivate();
        }
    }, [enabled, activate, deactivate]);

    return (
        <>
            {/* Hidden input field for capturing scanner input */}
            <input
                ref={inputRef}
                type="text"
                data-scanner-input="true"
                style={{
                    position: 'absolute',
                    left: '-9999px',
                    width: '1px',
                    height: '1px',
                    opacity: 0,
                }}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                readOnly
            />
            {/* Visual indicator */}
            {showIndicator && isActive && enabled && (
                <Badge
                    colorPalette="green"
                    variant="solid"
                    position="fixed"
                    bottom={4}
                    right={4}
                    zIndex={1000}
                    p={2}
                    borderRadius="md"
                    boxShadow="lg"
                >
                    <HStack gap={2}>
                        <Icon><LuScanLine /></Icon>
                        <Text fontSize="xs" fontWeight="medium">Ready to scan</Text>
                    </HStack>
                </Badge>
            )}
        </>
    );
}
