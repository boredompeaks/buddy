// Skeleton Loader Component - Smooth shimmer effect for loading states
import React from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { useThemeColors } from '../../hooks/useThemeColors';

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
    const colors = useThemeColors();
    const shimmerPosition = useSharedValue(-1);

    React.useEffect(() => {
        shimmerPosition.value = withRepeat(
            withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shimmerPosition.value * 100 }],
    }));

    return (
        <View
            style={[
                styles.container,
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: colors.border,
                },
                style,
            ]}
        >
            <Animated.View
                style={[
                    styles.shimmer,
                    {
                        backgroundColor: colors.surfaceHighlight,
                    },
                    animatedStyle,
                ]}
            />
        </View>
    );
}

// Pre-built skeleton patterns
export function NoteSkeleton() {
    const colors = useThemeColors();
    return (
        <View style={[styles.noteCard, { backgroundColor: colors.surface }]}>
            <Skeleton height={16} width="60%" style={{ marginBottom: 8 }} />
            <Skeleton height={12} width="90%" style={{ marginBottom: 4 }} />
            <Skeleton height={12} width="75%" style={{ marginBottom: 12 }} />
            <View style={styles.noteFooter}>
                <Skeleton height={10} width={60} />
                <Skeleton height={10} width={40} />
            </View>
        </View>
    );
}

export function TaskSkeleton() {
    const colors = useThemeColors();
    return (
        <View style={[styles.taskItem, { backgroundColor: colors.surface }]}>
            <Skeleton width={24} height={24} borderRadius={12} />
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Skeleton height={14} width="70%" style={{ marginBottom: 6 }} />
                <Skeleton height={10} width={50} />
            </View>
        </View>
    );
}

export function StatCardSkeleton() {
    const colors = useThemeColors();
    return (
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Skeleton width={40} height={40} borderRadius={12} />
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Skeleton height={12} width="50%" style={{ marginBottom: 6 }} />
                <Skeleton height={20} width="40%" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
    },
    shimmer: {
        width: '50%',
        height: '100%',
        opacity: 0.4,
    },
    noteCard: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    noteFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    statCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
    },
});
