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

        // Don't intercept when the user is typing in a real input.
        // We identify the scanner's own hidden input via data-scanner-input so it is excluded.
        const activeEl = document.activeElement as HTMLElement | null;
        const isUserTyping =
            activeEl &&
            !activeEl.hasAttribute('data-scanner-input') &&
            (
                activeEl.tagName === 'INPUT' ||
                activeEl.tagName === 'TEXTAREA' ||
                activeEl.isContentEditable
            );

        if (isUserTyping) return;

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
                e.preventDefault();
                bufferRef.current += e.key;
                lastKeyTimeRef.current = now;

                if (timeoutRef.current) clearTimeout(timeoutRef.current);

                timeoutRef.current = setTimeout(() => {
                    if (bufferRef.current.trim().length > 0) {
                        processScan(bufferRef.current.trim());
                    }
                    bufferRef.current = '';
                }, scanTimeout * 2);
            } else {
                // First character or slow input — likely manual typing; reset buffer
                bufferRef.current = e.key;
                lastKeyTimeRef.current = now;

                if (timeoutRef.current) clearTimeout(timeoutRef.current);
            }
        }
    }, [enabled, isActive, scanTimeout, processScan]);

    useEffect(() => {
        if (!enabled || !isActive) return;

        // Focus the hidden scanner input so it captures keystrokes by default
        inputRef.current?.focus();

        window.addEventListener('keydown', handleKeyDown);

        // When the user clicks on something that is NOT a real text input, refocus
        // the hidden scanner input so scanning stays ready.
        const handleWindowClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const clickedRealInput =
                (target.tagName === 'INPUT' && !target.hasAttribute('data-scanner-input')) ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;

            if (!clickedRealInput) {
                // Small delay lets other click handlers (buttons, etc.) run first
                setTimeout(() => inputRef.current?.focus(), 0);
            }
        };

        // Use capture so we see the click before other handlers steal focus
        window.addEventListener('click', handleWindowClick, true);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('click', handleWindowClick, true);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
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
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, []);

    return {
        inputRef,
        isActive,
        activate,
        deactivate,
    };
}
