// Quiz Screen - MindVault Modern
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { ArrowLeft, CheckCircle, XCircle, Brain, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import GlassLayout from '../../../src/components/GlassLayout';
import GlassCard from '../../../src/components/GlassCard';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useStudyStatsStore } from '../../../src/stores';
// import { generateQuiz } from '../../../src/services/ai'; // Commented out until service is confirmed fixed

// Dummy/Fallback Data
const FALLBACK_QUIZ = [
    {
        id: '1',
        question: 'What is the powerhouse of the cell?',
        options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi Apparatus'],
        correctAnswer: 'Mitochondria',
        explanation: 'Mitochondria generate most of the chemical energy needed to power the cell\'s biochemical reactions.'
    },
    {
        id: '2',
        question: 'Which law states that F=ma?',
        options: ['Newton\'s First Law', 'Newton\'s Second Law', 'Newton\'s Third Law', 'Law of Gravitation'],
        correctAnswer: 'Newton\'s Second Law',
        explanation: 'Newton\'s Second Law of Motion pertains to the behavior of objects for which all existing forces are not balanced.'
    }
];

export default function QuizScreen() {
    const router = useRouter();
    const colors = useThemeColors();
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<any[]>([]); // Using any[] for now to bypass strict typing if types are missing
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [quizComplete, setQuizComplete] = useState(false);

    const recordResult = useStudyStatsStore(state => state.recordQuizResult);

    useEffect(() => {
        loadQuiz();
    }, []);

    const loadQuiz = async () => {
        setLoading(true);
        try {
            // Simulator: Fetch real AI quiz or use fallback
            setTimeout(() => {
                setQuestions(FALLBACK_QUIZ);
                setLoading(false);
            }, 1000);
        } catch (e) {
            setQuestions(FALLBACK_QUIZ);
            setLoading(false);
        }
    };

    const handleOptionSelect = (option: string) => {
        if (showResult) return;
        setSelectedOption(option);
        Haptics.selectionAsync();

        setShowResult(true);
        const isCorrect = option === questions[currentQIndex].correctAnswer;
        if (isCorrect) {
            setScore(prev => prev + 1);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const handleNext = () => {
        if (currentQIndex < questions.length - 1) {
            setCurrentQIndex(prev => prev + 1);
            setSelectedOption(null);
            setShowResult(false);
        } else {
            finishQuiz();
        }
    };

    const finishQuiz = () => {
        setQuizComplete(true);
        recordResult(questions.length, score);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    if (loading) {
        return (
            <GlassLayout>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Generating Questions...</Text>
                </View>
            </GlassLayout>
        );
    }

    if (quizComplete) {
        const percentage = Math.round((score / questions.length) * 100);
        return (
            <GlassLayout>
                <View style={styles.center}>
                    <GlassCard style={styles.resultCard} intensity={40}>
                        <Brain size={64} color={colors.primary} />
                        <Text style={[styles.scoreTitle, { color: colors.text }]}>Quiz Complete!</Text>
                        <Text style={[styles.scoreValue, { color: percentage > 70 ? colors.success : colors.warning }]}>
                            {percentage}%
                        </Text>
                        <Text style={[styles.scoreSub, { color: colors.textSecondary }]}>
                            You got {score} out of {questions.length} correct
                        </Text>

                        <TouchableOpacity
                            style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
                            onPress={() => router.back()}
                        >
                            <Text style={styles.btnText}>Back to Hub</Text>
                        </TouchableOpacity>
                    </GlassCard>
                </View>
            </GlassLayout>
        );
    }

    const currentQ = questions[currentQIndex];

    return (
        <GlassLayout>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${((currentQIndex + 1) / questions.length) * 100}%`, backgroundColor: colors.primary }]} />
                </View>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{score}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Animated.View
                    key={currentQ.id}
                    entering={FadeInDown.springify()}
                    layout={Layout.springify()}
                >
                    <GlassCard style={styles.questionCard} intensity={30}>
                        <Text style={[styles.questionText, { color: colors.text }]}>{currentQ.question}</Text>
                    </GlassCard>

                    <View style={styles.optionsContainer}>
                        {currentQ.options.map((opt: string, idx: number) => {
                            const isSelected = selectedOption === opt;
                            const isCorrect = opt === currentQ.correctAnswer;
                            const showCorrect = showResult && isCorrect;
                            const showWrong = showResult && isSelected && !isCorrect;

                            let borderColor = 'rgba(255,255,255,0.1)';
                            let bgColor = 'rgba(255,255,255,0.05)';

                            if (showCorrect) {
                                borderColor = colors.success;
                                bgColor = colors.success + '20';
                            } else if (showWrong) {
                                borderColor = colors.error;
                                bgColor = colors.error + '20';
                            } else if (isSelected) {
                                borderColor = colors.primary;
                                bgColor = colors.primary + '20';
                            }

                            return (
                                <GlassCard
                                    key={idx}
                                    style={[
                                        styles.optionCard,
                                        { borderColor, backgroundColor: bgColor, borderWidth: 1 }
                                    ]}
                                    onPress={() => handleOptionSelect(opt)}
                                    activeScale={0.98}
                                >
                                    <View style={styles.optionRow}>
                                        <Text style={[styles.optionText, { color: colors.text }]}>{opt}</Text>
                                        {showCorrect && <CheckCircle size={20} color={colors.success} />}
                                        {showWrong && <XCircle size={20} color={colors.error} />}
                                    </View>
                                </GlassCard>
                            );
                        })}
                    </View>

                    {showResult && (
                        <Animated.View entering={FadeInDown.delay(200)}>
                            <GlassCard style={[styles.explanationCard, { borderColor: colors.primary + '40' }]} intensity={20}>
                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                                    <AlertCircle size={16} color={colors.primary} />
                                    <Text style={[styles.explLabel, { color: colors.primary }]}>Explanation</Text>
                                </View>
                                <Text style={[styles.explText, { color: colors.textSecondary }]}>{currentQ.explanation}</Text>

                                <TouchableOpacity
                                    style={[styles.nextBtn, { backgroundColor: colors.primary }]}
                                    onPress={handleNext}
                                >
                                    <Text style={styles.btnText}>{currentQIndex === questions.length - 1 ? 'Finish' : 'Next Question'}</Text>
                                </TouchableOpacity>
                            </GlassCard>
                        </Animated.View>
                    )}
                </Animated.View>
            </ScrollView>
        </GlassLayout>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontSize: 16 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    backButton: { padding: 8 },
    progressContainer: {
        flex: 1,
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: { height: '100%' },
    content: { padding: 20 },

    questionCard: {
        padding: 24,
        marginBottom: 24,
        minHeight: 120,
        justifyContent: 'center',
    },
    questionText: { fontSize: 22, fontWeight: '700', lineHeight: 30 },

    optionsContainer: { gap: 12 },
    optionCard: { padding: 18, borderRadius: 16 },
    optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    optionText: { fontSize: 16, fontWeight: '500' },

    explanationCard: { marginTop: 24, padding: 20, borderWidth: 1 },
    explLabel: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase' },
    explText: { fontSize: 15, lineHeight: 22, marginBottom: 20 },

    nextBtn: { padding: 16, borderRadius: 14, alignItems: 'center' },

    resultCard: { padding: 40, alignItems: 'center', width: '85%' },
    scoreTitle: { fontSize: 24, fontWeight: '700', marginTop: 20 },
    scoreValue: { fontSize: 48, fontWeight: '800', marginVertical: 10 },
    scoreSub: { fontSize: 16, marginBottom: 30, textAlign: 'center' },
    btnPrimary: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, minWidth: 200, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
