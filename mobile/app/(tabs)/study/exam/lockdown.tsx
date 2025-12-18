// Exam Lockdown Screen - Full answer persistence and proper navigation
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, BackHandler, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, ChevronDown, ChevronUp, Camera } from 'lucide-react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useThemeColors } from '../../../../src/hooks/useThemeColors';
import { useHaptics } from '../../../../src/hooks/useHaptics';
import GlassCard from '../../../../src/components/GlassCard';
import { EXAM_TIMER } from '../../../../src/constants';

// Exam result storage key
const EXAM_RESULT_KEY = 'mindvault_last_exam_result';

// Sample Exam Questions (In production, fetch from AI-generated paper or store)
const EXAM_QUESTIONS = [
    { id: 1, q: "Explain the theory of relativity in simple terms.", marks: 5 },
    { id: 2, q: "Differentiate between mitosis and meiosis.", marks: 5 },
    { id: 3, q: "Solve for x: 2x² + 5x - 3 = 0", marks: 10 },
];

interface ExamResult {
    subject: string;
    answers: Record<number, string>;
    totalMarks: number;
    questionsAttempted: number;
    totalQuestions: number;
    timeTaken: number; // seconds
    submittedAt: number;
}

export default function ExamLockdownScreen() {
    const router = useRouter();
    const colors = useThemeColors();
    const haptics = useHaptics();
    const params = useLocalSearchParams();

    const mode = params.mode as 'text' | 'handwritten' || 'text';
    const subject = params.subject as string || 'General';
    const initialDuration = params.duration
        ? parseInt(params.duration as string) * 60
        : EXAM_TIMER.DEFAULT_DURATION_SECONDS;

    const [timeLeft, setTimeLeft] = useState(initialDuration);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [expandedQ, setExpandedQ] = useState<number | null>(mode === 'text' ? 1 : null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const startTimeRef = useRef(Date.now());
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Calculate time taken
    const getTimeTaken = useCallback(() => {
        return Math.floor((Date.now() - startTimeRef.current) / 1000);
    }, []);

    // Save exam result and navigate to grading
    const saveAndNavigate = useCallback(async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        const questionsAttempted = Object.keys(answers).filter(k => answers[parseInt(k)]?.trim()).length;
        const totalMarks = EXAM_QUESTIONS.reduce((sum, q) => sum + q.marks, 0);

        const result: ExamResult = {
            subject,
            answers,
            totalMarks,
            questionsAttempted,
            totalQuestions: EXAM_QUESTIONS.length,
            timeTaken: getTimeTaken(),
            submittedAt: Date.now(),
        };

        try {
            // Persist result
            await AsyncStorage.setItem(EXAM_RESULT_KEY, JSON.stringify(result));
            haptics.success();

            // Navigate to answer grading with params
            // Navigate to Success Modal then to Grading
            const nextPath = `/study/answer-grading?subject=${encodeURIComponent(subject)}&questionsAttempted=${questionsAttempted}&totalQuestions=${EXAM_QUESTIONS.length}&timeTaken=${result.timeTaken}`;

            router.replace({
                pathname: '/modals/success',
                params: {
                    title: 'Exam Submitted!',
                    message: 'Your answers have been securely saved. Let\'s see how you performed.',
                    nextRoute: nextPath
                }
            });
        } catch (error) {
            console.error('Failed to save exam result:', error);
            haptics.error();
            Alert.alert('Error', 'Failed to save your answers. Please try again.');
            setIsSubmitting(false);
        }
    }, [answers, subject, getTimeTaken, isSubmitting, haptics, router]);

    // Handle submit with confirmation
    const handleSubmit = useCallback(() => {
        const questionsAttempted = Object.keys(answers).filter(k => answers[parseInt(k)]?.trim()).length;

        Alert.alert(
            "Submit Exam?",
            `You have answered ${questionsAttempted} of ${EXAM_QUESTIONS.length} questions.\n\nThis action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Submit", style: "destructive", onPress: saveAndNavigate }
            ]
        );
    }, [answers, saveAndNavigate]);

    // Prevent Back Button with proper dialog
    useEffect(() => {
        const onBackPress = () => {
            Alert.alert(
                "Exit Exam?",
                "Time is still running. If you leave now, your progress will be auto-submitted.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Quit & Submit", style: "destructive", onPress: saveAndNavigate }
                ]
            );
            return true; // Prevent default back action
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [saveAndNavigate]);

    // Delta-based timer for accuracy
    useEffect(() => {
        const endTime = startTimeRef.current + initialDuration * 1000;

        timerRef.current = setInterval(() => {
            const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
            setTimeLeft(remaining);

            if (remaining <= 0) {
                if (timerRef.current) clearInterval(timerRef.current);
                haptics.warning();
                Alert.alert(
                    "Time's Up!",
                    "Your exam has been auto-submitted.",
                    [{ text: "View Results", onPress: saveAndNavigate }]
                );
            }
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [initialDuration, saveAndNavigate, haptics]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const toggleAccordion = (id: number) => {
        Layout.springify();
        setExpandedQ(expandedQ === id ? null : id);
        haptics.selection();
    };

    // Determine timer color based on urgency
    const getTimerColor = () => {
        if (timeLeft <= EXAM_TIMER.URGENCY_THRESHOLD_SECONDS) return colors.error;
        if (timeLeft <= EXAM_TIMER.WARNING_THRESHOLD_SECONDS) return colors.warning;
        return colors.primary;
    };

    return (
        <View style={[styles.container, { backgroundColor: '#0f172a' }]}>
            <SafeAreaView style={{ flex: 1 }}>

                {/* Header / Timer */}
                <View style={[styles.header, { backgroundColor: colors.surface }]}>
                    <View style={styles.timerContainer}>
                        <Clock size={20} color={getTimerColor()} />
                        <Text style={[styles.timerText, { color: getTimerColor() }]}>
                            {formatTime(timeLeft)}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: colors.error }]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.submitBtnText}>
                            {isSubmitting ? 'Submitting...' : 'End Exam'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    {EXAM_QUESTIONS.map((q, index) => (
                        <Animated.View
                            key={q.id}
                            entering={FadeInDown.delay(index * 100).springify()}
                            layout={Layout.springify()}
                        >
                            {/* Question Card */}
                            <GlassCard style={styles.questionCard} intensity={25}>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => mode === 'text' && toggleAccordion(q.id)}
                                    style={styles.questionHeader}
                                >
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.qMeta}>
                                            <Text style={[styles.qNum, { color: colors.textSecondary }]}>Q.{q.id}</Text>
                                            <Text style={[styles.marks, { color: colors.primary }]}>{q.marks} marks</Text>
                                        </View>
                                        <Text style={[styles.questionText, { color: colors.text }]}>{q.q}</Text>
                                    </View>
                                    {mode === 'text' && (
                                        expandedQ === q.id ?
                                            <ChevronUp color={colors.textSecondary} /> :
                                            <ChevronDown color={colors.textSecondary} />
                                    )}
                                </TouchableOpacity>

                                {/* Input Area (Text Mode) */}
                                {mode === 'text' && expandedQ === q.id && (
                                    <View style={styles.inputContainer}>
                                        <TextInput
                                            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                                            multiline
                                            placeholder="Type your answer here..."
                                            placeholderTextColor={colors.textSecondary}
                                            value={answers[q.id] || ''}
                                            onChangeText={(text) => setAnswers(prev => ({ ...prev, [q.id]: text }))}
                                        />
                                        {answers[q.id]?.trim() && (
                                            <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                                                {answers[q.id].length} characters
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </GlassCard>
                        </Animated.View>
                    ))}

                    {/* Handwritten Mode Footer */}
                    {mode === 'handwritten' && (
                        <View style={styles.uploadArea}>
                            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>
                                Write your answers on paper. When finished, take photos to upload.
                            </Text>
                            <TouchableOpacity style={[styles.cameraBtn, { borderColor: colors.primary }]}>
                                <Camera size={24} color={colors.primary} />
                                <Text style={{ color: colors.primary, fontWeight: '600' }}>Scan Pages</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>

            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    timerContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    timerText: { fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
    submitBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    submitBtnText: { color: '#fff', fontWeight: '700' },

    content: { padding: 20 },
    questionCard: { marginBottom: 16, padding: 0, overflow: 'hidden' },
    questionHeader: { padding: 20, flexDirection: 'row', alignItems: 'flex-start' },
    qMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingRight: 8 },
    qNum: { fontWeight: '700' },
    marks: { fontWeight: '600', fontSize: 12 },
    questionText: { fontSize: 16, fontWeight: '500', lineHeight: 24 },

    inputContainer: { padding: 20, paddingTop: 0 },
    input: {
        height: 150,
        textAlignVertical: 'top',
        padding: 12,
        borderWidth: 1,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.2)',
        fontSize: 16
    },
    charCount: { marginTop: 8, fontSize: 12, textAlign: 'right' },

    uploadArea: { marginTop: 40, alignItems: 'center' },
    cameraBtn: { flexDirection: 'row', gap: 10, padding: 16, borderRadius: 12, borderWidth: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
});
