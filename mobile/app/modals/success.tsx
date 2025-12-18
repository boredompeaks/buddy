import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import GlassLayout from '../../src/components/GlassLayout';
import GlassCard from '../../src/components/GlassCard';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useHaptics } from '../../src/hooks/useHaptics';

export default function SuccessModal() {
    const router = useRouter();
    const colors = useThemeColors();
    const haptics = useHaptics();
    const params = useLocalSearchParams();

    const title = params.title as string || 'Success!';
    const message = params.message as string || 'Operation completed successfully.';
    const nextRoute = params.nextRoute as string;

    const handleContinue = () => {
        haptics.selection();
        if (nextRoute) {
            router.replace(nextRoute as any); // Replace to avoid going back to modal
        } else {
            router.back();
        }
    };

    return (
        <GlassLayout>
            <View style={styles.container}>
                <GlassCard style={styles.card} intensity={40}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}>
                        <Check size={48} color={colors.success} strokeWidth={3} />
                    </View>

                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.primary }]}
                        onPress={handleContinue}
                    >
                        <Text style={styles.buttonText}>Continue</Text>
                    </TouchableOpacity>
                </GlassCard>
            </View>
        </GlassLayout>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20 },
    card: { padding: 32, alignItems: 'center', gap: 16, borderRadius: 32 },
    iconContainer: {
        width: 80, height: 80, borderRadius: 40,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 8
    },
    title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
    message: { fontSize: 16, textAlign: 'center', lineHeight: 22 },
    button: { width: '100%', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 16 },
    buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
