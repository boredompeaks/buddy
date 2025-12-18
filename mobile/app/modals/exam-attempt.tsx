import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FileText, PenTool, X } from 'lucide-react-native';
import GlassLayout from '../../src/components/GlassLayout';
import GlassCard from '../../src/components/GlassCard';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useHaptics } from '../../src/hooks/useHaptics';

export default function ExamAttemptModal() {
    const router = useRouter();
    const params = useLocalSearchParams<{ examId?: string; subject?: string; duration?: string }>();
    const colors = useThemeColors();
    const haptics = useHaptics();

    // Safe defaults for params
    const examId = params.examId || 'unknown';
    const subject = params.subject || 'Exam';
    const duration = params.duration || '180';

    const handleModeSelect = (mode: 'text' | 'handwritten') => {
        haptics.selection();
        // Close this modal and navigate to the actual attempt screen with correct mode
        router.back();

        // Short delay to allow modal to close smoothly before push
        setTimeout(() => {
            router.push({
                pathname: '/(tabs)/study/exam/lockdown',
                params: { examId, subject, mode, duration }
            });
        }, 100);
    };

    return (
        <GlassLayout>
            <View style={styles.container}>
                <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => router.back()}
                >
                    <X size={24} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.content}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        Choose Attempt Mode
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        How would you like to take this exam?
                    </Text>

                    <View style={styles.options}>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => handleModeSelect('text')}
                        >
                            <GlassCard style={styles.card}>
                                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                                    <FileText size={32} color={colors.primary} />
                                </View>
                                <View style={styles.cardContent}>
                                    <Text style={[styles.cardTitle, { color: colors.text }]}>Text Mode</Text>
                                    <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                                        Type your answers directly in the app. Best for quick practice.
                                    </Text>
                                </View>
                            </GlassCard>
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => handleModeSelect('handwritten')}
                        >
                            <GlassCard style={styles.card}>
                                <View style={[styles.iconContainer, { backgroundColor: colors.secondary + '20' }]}>
                                    <PenTool size={32} color={colors.secondary} />
                                </View>
                                <View style={styles.cardContent}>
                                    <Text style={[styles.cardTitle, { color: colors.text }]}>Handwritten Mode</Text>
                                    <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                                        Write on paper, then snap photos of your answers. Best for exam simulation.
                                    </Text>
                                </View>
                            </GlassCard>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </GlassLayout>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center' },
    closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
    content: { alignItems: 'center', gap: 8 },
    title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
    subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 32 },
    options: { width: '100%', gap: 16 },
    card: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconContainer: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
    cardContent: { flex: 1, gap: 4 },
    cardTitle: { fontSize: 18, fontWeight: '700' },
    cardDesc: { fontSize: 13, lineHeight: 18 },
});
