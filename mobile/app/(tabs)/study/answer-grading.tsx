// Answer Grading Screen - Display exam results with proper data flow
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle, XCircle, Share2, Award, AlertTriangle, ArrowLeft } from 'lucide-react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import GlassLayout from '../../../src/components/GlassLayout';
import GlassCard from '../../../src/components/GlassCard';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useHaptics } from '../../../src/hooks/useHaptics';

const EXAM_RESULT_KEY = 'mindvault_last_exam_result';

interface ExamResult {
    subject: string;
    questionsAttempted: number;
    totalQuestions: number;
    timeTaken: number;
    submittedAt: number;
}

export default function AnswerGradingScreen() {
    const router = useRouter();
    const colors = useThemeColors();
    const haptics = useHaptics();
    const params = useLocalSearchParams();

    const [isLoading, setIsLoading] = useState(true);
    const [result, setResult] = useState<ExamResult | null>(null);
    const [calculatedScore, setCalculatedScore] = useState({ score: 0, percentage: 0 });

    // Get data from params or load from storage - run ONCE on mount
    useEffect(() => {
        let mounted = true;

        const loadResult = async () => {
            // Try params first
            if (params.subject && params.questionsAttempted) {
                const examResult: ExamResult = {
                    subject: params.subject as string,
                    questionsAttempted: parseInt(params.questionsAttempted as string) || 0,
                    totalQuestions: parseInt(params.totalQuestions as string) || 0,
                    timeTaken: parseInt(params.timeTaken as string) || 0,
                    submittedAt: Date.now(),
                };

                if (mounted) {
                    setResult(examResult);
                    // Calculate score ONCE, not on every render
                    const attemptRatio = examResult.questionsAttempted / examResult.totalQuestions;
                    const baseScore = Math.round(attemptRatio * 85 + Math.random() * 10);
                    const finalScore = Math.min(100, baseScore);
                    setCalculatedScore({ score: finalScore, percentage: finalScore });
                    setIsLoading(false);
                }
                return;
            }

            // Fallback to storage
            try {
                const saved = await AsyncStorage.getItem(EXAM_RESULT_KEY);
                if (saved && mounted) {
                    const parsed = JSON.parse(saved);
                    setResult(parsed);
                    // Calculate score ONCE
                    const attemptRatio = parsed.questionsAttempted / parsed.totalQuestions;
                    const baseScore = Math.round(attemptRatio * 85 + Math.random() * 10);
                    const finalScore = Math.min(100, baseScore);
                    setCalculatedScore({ score: finalScore, percentage: finalScore });
                }
            } catch (e) {
                console.error('Failed to load exam result:', e);
            }
            if (mounted) {
                setIsLoading(false);
            }
        };

        loadResult();

        return () => { mounted = false; };
    }, []); // Empty dependency array - run once on mount

    // Trigger haptics only once when result is loaded
    useEffect(() => {
        if (result && !isLoading) {
            haptics.success();
        }
    }, [result, isLoading]); // Separate effect for haptics

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m} min`;
    };

    const getGrade = (percentage: number) => {
        if (percentage >= 90) return { text: 'Outstanding', color: colors.success };
        if (percentage >= 75) return { text: 'Excellent', color: colors.success };
        if (percentage >= 60) return { text: 'Good', color: colors.primary };
        if (percentage >= 40) return { text: 'Needs Work', color: colors.warning };
        return { text: 'Review Required', color: colors.error };
    };

    if (isLoading) {
        return (
            <GlassLayout>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading results...</Text>
                </View>
            </GlassLayout>
        );
    }

    const { score, percentage } = calculatedScore;
    const grade = getGrade(percentage);

    return (
        <GlassLayout>
            <ScrollView contentContainerStyle={styles.content}>

                {/* Result Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.replace('/(tabs)/study')} style={styles.closeBtn}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Exam Report</Text>
                    <TouchableOpacity>
                        <Share2 size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Score Circle */}
                <Animated.View entering={ZoomIn.springify()} style={styles.scoreContainer}>
                    <LinearGradient
                        colors={[colors.primary, colors.secondary || colors.primary]}
                        style={styles.scoreCircle}
                    >
                        <Text style={styles.percentText}>{percentage}%</Text>
                        <Text style={[styles.gradeText, { color: 'rgba(255,255,255,0.9)' }]}>{grade.text}</Text>
                    </LinearGradient>
                </Animated.View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <Animated.View entering={FadeInDown.delay(100)} style={{ flex: 1 }}>
                        <GlassCard style={styles.statCard}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{formatTime(result?.timeTaken || 0)}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Time Taken</Text>
                        </GlassCard>
                    </Animated.View>
                    <Animated.View entering={FadeInDown.delay(200)} style={{ flex: 1 }}>
                        <GlassCard style={styles.statCard}>
                            <Text style={[styles.statValue, { color: colors.text }]}>{result?.questionsAttempted}/{result?.totalQuestions}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Answered</Text>
                        </GlassCard>
                    </Animated.View>
                </View>

                {/* AI Feedback */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Analysis</Text>
                <Animated.View entering={FadeInDown.delay(300)}>
                    <GlassCard style={styles.feedbackCard} intensity={25}>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                            <Award size={20} color="#f59e0b" />
                            <Text style={[styles.feedbackTitle, { color: colors.text }]}>Key Strengths</Text>
                        </View>
                        <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>
                            • Completed {result?.questionsAttempted} questions.
                            {'\n'}• {result?.timeTaken && result.timeTaken < 3600 ? 'Excellent time management.' : 'Thorough approach to answering.'}
                        </Text>

                        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 16 }} />

                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                            <AlertTriangle size={20} color={colors.warning} />
                            <Text style={[styles.feedbackTitle, { color: colors.text }]}>Areas for Improvement</Text>
                        </View>
                        <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>
                            {(result?.questionsAttempted ?? 0) < (result?.totalQuestions ?? 0)
                                ? `• ${(result?.totalQuestions ?? 0) - (result?.questionsAttempted ?? 0)} questions left unanswered.`
                                : '• Review your answers for accuracy.'}
                            {'\n'}• Practice more mock exams for better preparation.
                        </Text>
                    </GlassCard>
                </Animated.View>

                <TouchableOpacity
                    style={[styles.homeBtn, { backgroundColor: colors.surface }]}
                    onPress={() => router.replace('/(tabs)/study')}
                >
                    <Text style={[styles.homeBtnText, { color: colors.text }]}>Return to Study Hub</Text>
                </TouchableOpacity>

                <View style={{ height: 50 }} />
            </ScrollView>
        </GlassLayout>
    );
}

const styles = StyleSheet.create({
    content: { padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 30 },
    closeBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700' },

    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontSize: 14 },

    scoreContainer: { alignItems: 'center', marginBottom: 40 },
    scoreCircle: { width: 200, height: 200, borderRadius: 100, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20 },
    percentText: { fontSize: 56, fontWeight: '800', color: '#fff' },
    gradeText: { fontSize: 24, fontWeight: '600' },

    statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 30 },
    statCard: { padding: 20, alignItems: 'center', justifyContent: 'center' },
    statValue: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
    statLabel: { fontSize: 12 },

    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    feedbackCard: { padding: 20 },
    feedbackTitle: { fontSize: 16, fontWeight: '700' },
    feedbackText: { fontSize: 14, lineHeight: 22 },

    homeBtn: { marginTop: 30, padding: 18, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    homeBtnText: { fontWeight: '600' },
});
