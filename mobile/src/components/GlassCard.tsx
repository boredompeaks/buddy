import React, { memo, useCallback } from 'react';
import { StyleSheet, ViewStyle, Platform, Pressable, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useThemeColors } from '../../hooks/useThemeColors';

interface GlassCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    intensity?: number;
    onPress?: () => void;
    activeScale?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function GlassCardComponent({
    children,
    style,
    intensity = 30,
    onPress,
    activeScale = 0.98
}: GlassCardProps) {
    const colors = useThemeColors();
    const scale = useSharedValue(1);

    const isDark = colors.background === '#0f172a';

    // Animation styles
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = useCallback(() => {
        scale.value = withSpring(activeScale, { damping: 10, stiffness: 400 });
    }, [activeScale, scale]);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, { damping: 10, stiffness: 400 });
    }, [scale]);

    const Container = onPress ? AnimatedPressable : Animated.View;

    return (
        <Container
            style={[styles.container, style, animatedStyle]}
            onPress={onPress}
            onPressIn={onPress ? handlePressIn : undefined}
            onPressOut={onPress ? handlePressOut : undefined}
        >
            <BlurView
                intensity={Platform.OS === 'android' ? intensity / 2 : intensity} // Android blur is heavy
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
            />
            {/* Overlay for tint and border */}
            <Animated.View style={[
                styles.overlay,
                {
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(255, 255, 255, 0.4)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
                }
            ]} />
            {children}
        </Container>
    );
}

// Memoize to prevent unnecessary re-renders
const GlassCard = memo(GlassCardComponent);
export default GlassCard;

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        borderRadius: 24,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderRadius: 24,
    }
});
