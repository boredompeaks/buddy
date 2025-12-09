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

export default function GlassLayout({ children, style, edges, hideStatusBar = false }: GlassLayoutProps) {
    const colors = useThemeColors();

    const isDark = colors.background === '#0f172a';

    return (
        <View style={styles.container}>
            {/* Mesh/Aurora Background Simulation */}
            <LinearGradient
                colors={isDark
                    ? ['#0f172a', '#1e1b4b', '#020617'] // Midnight Blue -> Deep Indigo -> Slate 950
                    : ['#f8fafc', '#e0e7ff', '#f1f5f9'] // Light Mode Fallback
                }
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
