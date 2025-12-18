// Hook to prevent multiple rapid clicks/taps
import { useRef, useCallback } from 'react';

interface UsePreventMultiClickOptions {
    delay?: number; // Debounce delay in ms
}

/**
 * Hook that prevents multiple rapid clicks on buttons/touchables.
 * Wraps your onPress handler with debounce logic.
 * 
 * @example
 * const { handlePress, isProcessing } = usePreventMultiClick();
 * <TouchableOpacity onPress={handlePress(() => doSomething())} disabled={isProcessing}>
 */
export function usePreventMultiClick(options: UsePreventMultiClickOptions = {}) {
    const { delay = 500 } = options;
    const lastPressTime = useRef(0);
    const isProcessingRef = useRef(false);

    const handlePress = useCallback(<T extends (...args: any[]) => any>(
        callback: T
    ) => {
        return (...args: Parameters<T>) => {
            const now = Date.now();

            // Prevent if within debounce window
            if (now - lastPressTime.current < delay) {
                return;
            }

            // Prevent if still processing
            if (isProcessingRef.current) {
                return;
            }

            lastPressTime.current = now;

            // Check if callback returns a promise
            const result = callback(...args);

            if (result instanceof Promise) {
                isProcessingRef.current = true;
                result.finally(() => {
                    isProcessingRef.current = false;
                });
            }

            return result;
        };
    }, [delay]);

    return { handlePress, isProcessing: isProcessingRef.current };
}

/**
 * Simple debounced press handler for inline use.
 * Creates a new ref on each call, so use usePreventMultiClick for components.
 */
export function createDebouncedPress(delay = 500) {
    let lastPress = 0;

    return <T extends (...args: any[]) => any>(callback: T) => {
        return (...args: Parameters<T>) => {
            const now = Date.now();
            if (now - lastPress < delay) return;
            lastPress = now;
            return callback(...args);
        };
    };
}

export default usePreventMultiClick;
