// Network Status Hook - Detects offline/online state
import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkStatus {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string;
}

export function useNetworkStatus() {
    const [status, setStatus] = useState<NetworkStatus>({
        isConnected: true,
        isInternetReachable: true,
        type: 'unknown',
    });

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            setStatus({
                isConnected: state.isConnected,
                isInternetReachable: state.isInternetReachable,
                type: state.type,
            });
        });

        // Initial fetch
        NetInfo.fetch().then((state) => {
            setStatus({
                isConnected: state.isConnected,
                isInternetReachable: state.isInternetReachable,
                type: state.type,
            });
        });

        return () => unsubscribe();
    }, []);

    return status;
}

// Fallback implementation if @react-native-community/netinfo is not installed
// Uses a simple fetch-based connectivity check
export function useNetworkStatusFallback() {
    const [isOnline, setIsOnline] = useState(true);

    const checkConnectivity = useCallback(async () => {
        try {
            const response = await fetch('https://www.google.com/generate_204', {
                method: 'HEAD',
                mode: 'no-cors',
            });
            setIsOnline(true);
        } catch {
            setIsOnline(false);
        }
    }, []);

    useEffect(() => {
        checkConnectivity();
        const interval = setInterval(checkConnectivity, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [checkConnectivity]);

    return { isConnected: isOnline, isInternetReachable: isOnline, type: 'unknown' };
}

export default useNetworkStatus;
