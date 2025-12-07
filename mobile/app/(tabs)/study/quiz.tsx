// Quiz Mode Screen - Test knowledge with explanations for wrong answers
import { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, Lightbulb, AlertTriangle, Trophy, RefreshCw } from 'lucide-react-native';
import { useNotesStore } from '../../../src/stores';
import { generateQuiz } from '../../../src/services/ai';
import { COLORS } from '../../../src/constants';
import { QuizQuestion } from '../../../src/types';

type QuizState = 'loading' | 'question' | 'result' | 'explanation' | 'complete';

export default function QuizScreen() {
    const { noteId } = useLocalSearchParams<{ noteId?: string }>();
    const router = useRouter();

    const notes = useNotesStore(state => state.notes);
    const note = noteId ? notes.find(n => n.id === noteId) : null;

    const [quizState, setQuizState] = useState<QuizState>('loading');
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [answers, setAnswers] = useState<number[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Load quiz on mount
    useMemo(() => {
        if (!note) return;

        generateQuiz(note.content, 5)
            .then(q => {
                setQuestions(q);
                setQuizState('question');
            })
            .catch(err => {
                setError(err.message || 'Failed to generate quiz');
                setQuizState('loading');
            });
    }, [note?.id]);

    const currentQuestion = questions[currentIndex];
    const isCorrect = selectedAnswer === currentQuestion?.correctAnswer;

    const handleSelectAnswer = useCallback((index: number) => {
        if (selectedAnswer !== null) return; // Already answered

        setSelectedAnswer(index);
        setAnswers(prev => [...prev, index]);

        // Show result briefly then move to explanation
        setQuizState('result');
        setTimeout(() => {
            setQuizState('explanation');
        }, 1000);
    }, [selectedAnswer]);

    const handleNext = useCallback(() => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setQuizState('question');
        } else {
            setQuizState('complete');
        }
    }, [currentIndex, questions.length]);

    const handleRestart = useCallback(() => {
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setAnswers([]);
        setQuizState('question');
    }, []);

    // Calculate score
    const score = useMemo(() => {
        return answers.reduce((acc, ans, i) => {
            return acc + (ans === questions[i]?.correctAnswer ? 1 : 0);
        }, 0);
    }, [answers, questions]);

    const scorePercentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

    // Loading state
    if (quizState === 'loading' && !error) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.light.primary} />
                    <Text style={styles.loadingText}>Generating quiz from your notes...</Text>
                    <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Error state
    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.errorContainer}>
                    <AlertTriangle size={48} color={COLORS.light.error} />
                    <Text style={styles.errorTitle}>Quiz Generation Failed</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Complete state - Show results
    if (quizState === 'complete') {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <ScrollView contentContainerStyle={styles.completeContainer}>
                    <View style={styles.trophyContainer}>
                        <Trophy size={64} color={scorePercentage >= 70 ? '#f59e0b' : COLORS.light.primary} />
                    </View>

                    <Text style={styles.completeTitle}>Quiz Complete!</Text>

                    <View style={styles.scoreCard}>
                        <Text style={styles.scoreValue}>{score}/{questions.length}</Text>
                        <Text style={styles.scoreLabel}>Correct Answers</Text>
                        <View style={[styles.scoreBadge, { backgroundColor: scorePercentage >= 70 ? COLORS.light.success : COLORS.light.warning }]}>
                            <Text style={styles.scoreBadgeText}>{scorePercentage}%</Text>
                        </View>
                    </View>

                    {/* Review wrong answers */}
                    {answers.map((ans, i) => {
                        const q = questions[i];
                        const wasCorrect = ans === q.correctAnswer;
                        if (wasCorrect) return null;

                        return (
                            <View key={i} style={styles.reviewCard}>
                                <View style={styles.reviewHeader}>
                                    <XCircle size={20} color={COLORS.light.error} />
                                    <Text style={styles.reviewQuestion}>{q.question}</Text>
                                </View>
                                <Text style={styles.reviewYourAnswer}>
                                    Your answer: <Text style={styles.wrongAnswer}>{q.options[ans]}</Text>
                                </Text>
                                <Text style={styles.reviewCorrectAnswer}>
                                    Correct: <Text style={styles.correctAnswer}>{q.options[q.correctAnswer]}</Text>
                                </Text>
                                <View style={styles.explanationBox}>
                                    <Lightbulb size={16} color={COLORS.light.primary} />
                                    <Text style={styles.explanationText}>{q.explanation}</Text>
                                </View>
                            </View>
                        );
                    })}

                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.actionButton} onPress={handleRestart}>
                            <RefreshCw size={20} color={COLORS.light.primary} />
                            <Text style={styles.actionButtonText}>Try Again</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={() => router.back()}>
                            <Text style={styles.primaryButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // Question / Result / Explanation state
    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <ArrowLeft size={24} color={COLORS.light.text} />
                </TouchableOpacity>
                <View style={styles.progress}>
                    <Text style={styles.progressText}>
                        Question {currentIndex + 1} of {questions.length}
                    </Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${((currentIndex + 1) / questions.length) * 100}%` }]} />
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.questionContent}>
                {/* Question */}
                <Text style={styles.questionText}>{currentQuestion?.question}</Text>

                {/* Options */}
                <View style={styles.optionsContainer}>
                    {currentQuestion?.options.map((option, index) => {
                        const isSelected = selectedAnswer === index;
                        const isCorrectOption = index === currentQuestion.correctAnswer;
                        const showResult = quizState !== 'question';

                        let optionStyle = styles.option;
                        let textStyle = styles.optionText;

                        if (showResult) {
                            if (isCorrectOption) {
                                optionStyle = { ...styles.option, ...styles.optionCorrect };
                                textStyle = { ...styles.optionText, ...styles.optionTextCorrect };
                            } else if (isSelected && !isCorrectOption) {
                                optionStyle = { ...styles.option, ...styles.optionWrong };
                                textStyle = { ...styles.optionText, ...styles.optionTextWrong };
                            }
                        } else if (isSelected) {
                            optionStyle = { ...styles.option, ...styles.optionSelected };
                        }

                        return (
                            <TouchableOpacity
                                key={index}
                                style={optionStyle}
                                onPress={() => handleSelectAnswer(index)}
                                disabled={selectedAnswer !== null}
                            >
                                <View style={styles.optionContent}>
                                    <View style={[styles.optionLetter, showResult && isCorrectOption && styles.optionLetterCorrect]}>
                                        <Text style={styles.optionLetterText}>{String.fromCharCode(65 + index)}</Text>
                                    </View>
                                    <Text style={textStyle}>{option}</Text>
                                </View>
                                {showResult && isCorrectOption && <CheckCircle2 size={24} color={COLORS.light.success} />}
                                {showResult && isSelected && !isCorrectOption && <XCircle size={24} color={COLORS.light.error} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Explanation for wrong answers */}
                {quizState === 'explanation' && !isCorrect && (
                    <View style={styles.explanationCard}>
                        <View style={styles.explanationHeader}>
                            <Lightbulb size={20} color={COLORS.light.primary} />
                            <Text style={styles.explanationTitle}>Why this is wrong</Text>
                        </View>
                        <Text style={styles.explanationContent}>{currentQuestion?.explanation}</Text>
                    </View>
                )}

                {/* Next Button */}
                {quizState === 'explanation' && (
                    <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                        <Text style={styles.nextButtonText}>
                            {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
                        </Text>
                        <ChevronRight size={20} color="#fff" />
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.light.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
    loadingText: { fontSize: 18, fontWeight: '600', color: COLORS.light.text },
    loadingSubtext: { fontSize: 14, color: COLORS.light.textSecondary },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 },
    errorTitle: { fontSize: 20, fontWeight: '700', color: COLORS.light.text },
    errorText: { fontSize: 14, color: COLORS.light.textSecondary, textAlign: 'center' },
    backButton: { backgroundColor: COLORS.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
    backButtonText: { color: '#fff', fontWeight: '600' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16, borderBottomWidth: 1, borderBottomColor: COLORS.light.border },
    progress: { flex: 1 },
    progressText: { fontSize: 14, fontWeight: '600', color: COLORS.light.textSecondary, marginBottom: 8 },
    progressBar: { height: 6, backgroundColor: COLORS.light.border, borderRadius: 3 },
    progressFill: { height: '100%', backgroundColor: COLORS.light.primary, borderRadius: 3 },
    questionContent: { padding: 20 },
    questionText: { fontSize: 22, fontWeight: '700', color: COLORS.light.text, lineHeight: 32, marginBottom: 24 },
    optionsContainer: { gap: 12 },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.light.surface,
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    optionSelected: { borderColor: COLORS.light.primary, backgroundColor: COLORS.light.primary + '10' },
    optionCorrect: { borderColor: COLORS.light.success, backgroundColor: COLORS.light.success + '15' },
    optionWrong: { borderColor: COLORS.light.error, backgroundColor: COLORS.light.error + '15' },
    optionContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    optionLetter: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.light.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionLetterCorrect: { backgroundColor: COLORS.light.success },
    optionLetterText: { fontSize: 14, fontWeight: '700', color: COLORS.light.text },
    optionText: { fontSize: 16, color: COLORS.light.text, flex: 1 },
    optionTextCorrect: { fontWeight: '600' },
    optionTextWrong: { color: COLORS.light.textSecondary },
    explanationCard: {
        marginTop: 24,
        backgroundColor: COLORS.light.primary + '10',
        padding: 20,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.light.primary,
    },
    explanationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    explanationTitle: { fontSize: 16, fontWeight: '700', color: COLORS.light.primary },
    explanationContent: { fontSize: 15, color: COLORS.light.text, lineHeight: 24 },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.light.primary,
        paddingVertical: 16,
        borderRadius: 16,
        marginTop: 24,
        gap: 8,
    },
    nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    completeContainer: { padding: 20, alignItems: 'center' },
    trophyContainer: { marginVertical: 24 },
    completeTitle: { fontSize: 28, fontWeight: '800', color: COLORS.light.text, marginBottom: 20 },
    scoreCard: { alignItems: 'center', backgroundColor: COLORS.light.surface, padding: 24, borderRadius: 20, width: '100%', marginBottom: 24 },
    scoreValue: { fontSize: 48, fontWeight: '800', color: COLORS.light.primary },
    scoreLabel: { fontSize: 14, color: COLORS.light.textSecondary, marginTop: 4 },
    scoreBadge: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
    scoreBadgeText: { color: '#fff', fontWeight: '700', fontSize: 18 },
    reviewCard: { backgroundColor: COLORS.light.surface, padding: 16, borderRadius: 16, width: '100%', marginBottom: 12 },
    reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
    reviewQuestion: { fontSize: 15, fontWeight: '600', color: COLORS.light.text, flex: 1 },
    reviewYourAnswer: { fontSize: 14, color: COLORS.light.textSecondary },
    wrongAnswer: { color: COLORS.light.error, fontWeight: '600' },
    reviewCorrectAnswer: { fontSize: 14, color: COLORS.light.textSecondary, marginTop: 4 },
    correctAnswer: { color: COLORS.light.success, fontWeight: '600' },
    explanationBox: { flexDirection: 'row', gap: 8, marginTop: 12, padding: 12, backgroundColor: COLORS.light.primary + '10', borderRadius: 12 },
    explanationText: { fontSize: 13, color: COLORS.light.text, flex: 1, lineHeight: 20 },
    actionButtons: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 12 },
    actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, backgroundColor: COLORS.light.surface },
    actionButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.light.primary },
    primaryButton: { backgroundColor: COLORS.light.primary },
    primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
