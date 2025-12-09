import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, PenTool, Lock, Clock, Check } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import GlassLayout from '../../../../src/components/GlassLayout';
import GlassCard from '../../../../src/components/GlassCard';
import { useThemeColors } from '../../../../src/hooks/useThemeColors';
import { useHaptics } from '../../../../src/hooks/useHaptics';
import { FileText } from 'lucide-react-native';

export default function ExamReviewScreen() {
    const router = useRouter();
    const colors = useThemeColors();
    const haptics = useHaptics();
    const params = useLocalSearchParams();

    // Default to 'text' mode, can switch to 'handwritten'
    const [mode, setMode] = useState<'text' | 'handwritten'>('text');
    const [acknowledged, setAcknowledged] = useState(false);

    const subject = params.subject as string || 'Mathematics';
    const duration = params.duration ? parseInt(params.duration as string) : 180; // Default 3 hours

    const handleStart = () => {
        if (!acknowledged) {
            haptics.warning();
            return;
        }
        haptics.success();

        // Navigate to the actual Exam Lockdown screen
        router.push({
            pathname: '/study/exam/lockdown',
            params: { mode, subject, duration }
        });
    };

    return (
        <GlassLayout>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Exam Setup</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Paper Details */}
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                    <GlassCard style={styles.summaryCard} intensity={30}>
                        <View style={styles.row}>
                            <View>
                                <Text style={[styles.subject, { color: colors.text }]}>{subject}</Text>
                                <Text style={[styles.subtext, { color: colors.textSecondary }]}>Full Syllabus Mock</Text>
                            </View>
                            <View style={styles.timeBadge}>
                                <Clock size={16} color={colors.primary} />
                                <Text style={[styles.timeText, { color: colors.primary }]}>{duration / 60} hrs</Text>
                            </View>
                        </View>
                    </GlassCard>
                </Animated.View>

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Choose Attempt Mode</Text>

                {/* Mode Selection */}
                <View style={styles.modeContainer}>
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={{ flex: 1 }}>
                        <TouchableOpacity onPress={() => { setMode('text'); haptics.selection(); }}>
                            <GlassCard
                                style={[
                                    styles.modeCard,
                                    mode === 'text' && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                                ]}
                            >
                                <FileText size={32} color={mode === 'text' ? colors.primary : colors.textSecondary} />
                                <Text style={[styles.modeTitle, { color: colors.text }]}>Type Answers</Text>
                                <Text style={[styles.modeDesc, { color: colors.textSecondary }]}>
                                    Smart accordion layout. Type directly in app. Auto-submit.
                                </Text>
                            </GlassCard>
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(300).springify()} style={{ flex: 1 }}>
                        <TouchableOpacity onPress={() => { setMode('handwritten'); haptics.selection(); }}>
                            <GlassCard
                                style={[
                                    styles.modeCard,
                                    mode === 'handwritten' && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                                ]}
                            >
                                <PenTool size={32} color={mode === 'handwritten' ? colors.primary : colors.textSecondary} />
                                <Text style={[styles.modeTitle, { color: colors.text }]}>Handwritten</Text>
                                <Text style={[styles.modeDesc, { color: colors.textSecondary }]}>
                                    View questions only. Write on paper. Upload photos at end.
                                </Text>
                            </GlassCard>
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                {/* Lockdown Warning */}
                <Animated.View entering={FadeInDown.delay(400).springify()}>
                    <GlassCard style={[styles.warningCard, { borderColor: colors.warning }]} intensity={20}>
                        <View style={styles.warningHeader}>
                            <Lock size={20} color={colors.warning} />
                            <Text style={[styles.warningTitle, { color: colors.warning }]}>Lockdown Mode Enabled</Text>
                        </View>
                        <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                            • You cannot leave the app once started.
                            {'\n'}• Notifications will be suppressed.
                            {'\n'}• Leaving the app will auto-submit your exam.
                        </Text>

                        <TouchableOpacity
                            style={styles.ackRow}
                            onPress={() => { setAcknowledged(!acknowledged); haptics.selection(); }}
                        >
                            <View style={[styles.checkbox, acknowledged && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                                {acknowledged && <Check size={14} color="#fff" />}
                            </View>
                            <Text style={[styles.ackText, { color: colors.text }]}>I understand and agree to the rules.</Text>
                        </TouchableOpacity>
                    </GlassCard>
                </Animated.View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Sticky Start Button */}
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[
                        styles.startButton,
                        { backgroundColor: acknowledged ? colors.primary : colors.textMuted, opacity: acknowledged ? 1 : 0.5 }
                    ]}
                    disabled={!acknowledged}
                    onPress={handleStart}
                >
                    <Text style={styles.startBtnText}>Begin Exam</Text>
                </TouchableOpacity>
            </View>
        </GlassLayout>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
    backButton: { padding: 8 },
    title: { fontSize: 24, fontWeight: '700' },
    content: { padding: 20 },

    summaryCard: { padding: 20, marginBottom: 30 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    subject: { fontSize: 22, fontWeight: '700' },
    subtext: { fontSize: 14, marginTop: 4 },
    timeBadge: { flexDirection: 'row', gap: 6, alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
    timeText: { fontWeight: '700' },

    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
    modeContainer: { flexDirection: 'row', gap: 16, marginBottom: 30 },
    modeCard: { padding: 16, height: 180, justifyContent: 'space-between', borderWidth: 1, borderColor: 'transparent' },
    modeTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
    modeDesc: { fontSize: 12, lineHeight: 16 },

    warningCard: { padding: 20, borderWidth: 1 },
    warningHeader: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 16 },
    warningTitle: { fontSize: 16, fontWeight: '700', textTransform: 'uppercase' },
    warningText: { fontSize: 14, lineHeight: 22, marginBottom: 20 },

    ackRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#666', justifyContent: 'center', alignItems: 'center' },
    ackText: { flex: 1, fontSize: 14, fontWeight: '600' },

    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 40, borderTopWidth: 1 },
    startButton: { padding: 18, borderRadius: 16, alignItems: 'center' },
    startBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
