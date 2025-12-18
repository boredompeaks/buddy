import React, { memo, useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SafeAreaView } from 'react-native-safe-area-context';

interface GlassLayoutProps {
    children: React.ReactNode;
    style?: ViewStyle;
    edges?: ('top' | 'right' | 'bottom' | 'left')[];
    hideStatusBar?: boolean;
}

// Dark and light gradient colors - defined outside component to prevent recreation
const DARK_GRADIENT: readonly [string, string, string] = ['#0f172a', '#1e1b4b', '#020617'];
const LIGHT_GRADIENT: readonly [string, string, string] = ['#f8fafc', '#e0e7ff', '#f1f5f9'];

function GlassLayoutComponent({ children, style, edges, hideStatusBar = false }: GlassLayoutProps) {
    const colors = useThemeColors();

    const isDark = colors.background === '#0f172a';

    // Memoize gradient colors to prevent unnecessary re-renders
    const gradientColors = useMemo(() => isDark ? DARK_GRADIENT : LIGHT_GRADIENT, [isDark]);

    return (
        <View style={styles.container}>
            {/* Mesh/Aurora Background Simulation */}
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.background}
            />

            {!hideStatusBar && <StatusBar style={isDark ? 'light' : 'dark'} />}

            <SafeAreaView
                style={[styles.content, style]}
                edges={edges || ['top', 'left', 'right']}
            >
                {children}
            </SafeAreaView>
        </View>
    );
}

// Memoize to prevent unnecessary re-renders
const GlassLayout = memo(GlassLayoutComponent);
export default GlassLayout;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    content: {
        flex: 1,
    }
});
