import { useEffect, useRef, useCallback, useState } from 'react';

export interface UsePhysicalScannerOptions {
    onScan: (value: string) => void;
    enabled?: boolean;
    scanTimeout?: number; // Time between keystrokes to consider as scanner input (default: 100ms)
    debounceTime?: number; // Time to ignore duplicate scans (default: 500ms)
}

export function usePhysicalScanner({
    onScan,
    enabled = true,
    scanTimeout = 100,
    debounceTime = 500,
}: UsePhysicalScannerOptions) {
    const [isActive, setIsActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const bufferRef = useRef<string>('');
    const lastKeyTimeRef = useRef<number>(0);
    const lastScanRef = useRef<string>('');
    const lastScanTimeRef = useRef<number>(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const processScan = useCallback((value: string) => {
        const now = Date.now();
        
        // Debounce: ignore duplicate scans within debounceTime
        if (value === lastScanRef.current && (now - lastScanTimeRef.current) < debounceTime) {
            return;
        }

        lastScanRef.current = value;
        lastScanTimeRef.current = now;
        onScan(value);
        bufferRef.current = '';
    }, [onScan, debounceTime]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!enabled || !isActive) return;

        const now = Date.now();
        const timeSinceLastKey = now - lastKeyTimeRef.current;

        // Handle Enter key - complete the scan
        if (e.key === 'Enter') {
            e.preventDefault();
            if (bufferRef.current.trim().length > 0) {
                processScan(bufferRef.current.trim());
            }
            bufferRef.current = '';
            lastKeyTimeRef.current = 0;
            return;
        }

        // Handle Tab key - also complete the scan (some scanners use Tab)
        if (e.key === 'Tab') {
            e.preventDefault();
            if (bufferRef.current.trim().length > 0) {
                processScan(bufferRef.current.trim());
            }
            bufferRef.current = '';
            lastKeyTimeRef.current = 0;
            return;
        }

        // Handle regular character input
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const isFirstChar = timeSinceLastKey === 0;
            const isRapidInput = !isFirstChar && timeSinceLastKey < scanTimeout;
            
            if (isRapidInput) {
                // Rapid input - likely from scanner; prevent char going into focused inputs
                e.preventDefault();
                bufferRef.current += e.key;
                lastKeyTimeRef.current = now;

                // Clear any existing timeout
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }

                // Set timeout to process scan if no more input comes
                timeoutRef.current = setTimeout(() => {
                    if (bufferRef.current.trim().length > 0) {
                        processScan(bufferRef.current.trim());
                    }
                    bufferRef.current = '';
                }, scanTimeout * 2);
            } else {
                // Slow input or first character - likely manual typing
                // Reset buffer and start fresh
                bufferRef.current = e.key;
                lastKeyTimeRef.current = now;
                
                // Clear any existing timeout
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
            }
        }
    }, [enabled, isActive, scanTimeout, processScan]);

    useEffect(() => {
        if (!enabled || !isActive) {
            return;
        }

        // Focus the input when active
        if (inputRef.current) {
            inputRef.current.focus();
        }

        // Add global keydown listener
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [enabled, isActive, handleKeyDown]);

    const activate = useCallback(() => {
        setIsActive(true);
        bufferRef.current = '';
        lastKeyTimeRef.current = 0;
    }, []);

    const deactivate = useCallback(() => {
        setIsActive(false);
        bufferRef.current = '';
        lastKeyTimeRef.current = 0;
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }, []);

    return {
        inputRef,
        isActive,
        activate,
        deactivate,
    };
}
