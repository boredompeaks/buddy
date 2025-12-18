// Offline Banner Component - Shows when device is offline
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { WifiOff } from 'lucide-react-native';

interface OfflineBannerProps {
    isVisible: boolean;
}

export function OfflineBanner({ isVisible }: OfflineBannerProps) {
    if (!isVisible) return null;

    return (
        <Animated.View
            entering={FadeInUp.duration(300)}
            exiting={FadeOutUp.duration(300)}
            style={styles.container}
        >
            <WifiOff size={16} color="#FFF" />
            <Text style={styles.text}>You're offline. Some features may not work.</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#EF4444',
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        zIndex: 1000,
    },
    text: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
    },
});

export default OfflineBanner;
