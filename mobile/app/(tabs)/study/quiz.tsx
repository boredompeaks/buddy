// Quiz Mode Screen - Batch Submission Flow
// Enhanced with LinearGradient, Adaptive Grid, and Reanimated Animations
import { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, XCircle, ChevronRight, Lightbulb, AlertTriangle, Trophy, RefreshCw, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useNotesStore, useStudyStatsStore } from '../../../src/stores'; // Adjusted path
import { generateQuiz } from '../../../src/services/ai';
import { useThemeColors } from '../../../hooks/useThemeColors'; // Adjusted path
import { useResponsiveLayout } from '../../../src/hooks/useResponsiveLayout'; // Adjusted path
import { QuizQuestion } from '../../../src/types';

type QuizState = 'config' | 'loading' | 'answering' | 'submitting' | 'results';

export default function QuizScreen() {
    const { noteId } = useLocalSearchParams<{ noteId?: string }>();
    const router = useRouter();
    const colors = useThemeColors();
    const { numColumns, gap, containerPadding, isTabletOrDesktop } = useResponsiveLayout();

    const notes = useNotesStore(state => state.notes);
    const note = noteId ? notes.find(n => n.id === noteId) : null;
    const recordQuizResult = useStudyStatsStore(state => state.recordQuizResult);

    const [quizState, setQuizState] = useState<QuizState>('config');
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
    const [score, setScore] = useState(0);
    const [questionCount, setQuestionCount] = useState(10);
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'board'>('board');

    // Generate Quiz
    const handleStartQuiz = async () => {
        if (!note) return;
        setQuizState('loading');
        try {
            const generated = await generateQuiz(note.content, questionCount, difficulty);
            setQuestions(generated);
            setQuizState('answering');
            setSelectedAnswers({});
        } catch (error) {
            Alert.alert('Error', 'Failed to generate quiz. Please try again.');
            setQuizState('config');
        }
    };

    // Handle Answer Selection
    const toggleAnswer = (qIndex: number, optionIndex: number) => {
        if (quizState !== 'answering') return;
        setSelectedAnswers(prev => ({
            ...prev,
            [qIndex]: optionIndex
        }));
    };

    // Submit Quiz
    const handleSubmit = async () => {
        // Calculate score
        let correctCount = 0;
        questions.forEach((q, index) => {
            if (selectedAnswers[index] === q.correctAnswer) {
                correctCount++;
            }
        });
        setScore(correctCount);
        setQuizState('results');

        // Record quiz result for stats tracking
        await recordQuizResult(questions.length, correctCount);
    };

    // Restart
    const handleRestart = () => {
        setQuizState('config');
        setQuestions([]);
        setSelectedAnswers({});
        setScore(0);
    };

    // Config View
    if (quizState === 'config') {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <LinearGradient
                    colors={[colors.primary, colors.primary + '80']}
                    style={styles.headerGradient}
                />
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <ArrowLeft size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitleWhite}>New Quiz</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <View style={[styles.configCard, { backgroundColor: colors.surface, margin: containerPadding }]}>
                        <Text style={[styles.label, { color: colors.text }]}>Topic</Text>
                        <Text style={[styles.value, { color: colors.primary }]}>{note?.title || 'Select a note first'}</Text>

                        <Text style={[styles.label, { color: colors.text, marginTop: 20 }]}>Difficulty</Text>
                        <View style={styles.optionRow}>
                            {(['easy', 'medium', 'hard', 'board'] as const).map(diff => (
                                <TouchableOpacity
                                    key={diff}
                                    style={[
                                        styles.optionChip,
                                        {
                                            backgroundColor: difficulty === diff ? colors.primary : colors.surfaceHighlight,
                                            borderColor: difficulty === diff ? colors.primary : colors.border
                                        }
                                    ]}
                                    onPress={() => setDifficulty(diff)}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        { color: difficulty === diff ? '#FFF' : colors.text }
                                    ]}>{diff.charAt(0).toUpperCase() + diff.slice(1)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 40 }]}
                            onPress={handleStartQuiz}
                            disabled={!note}
                        >
                            <Trophy size={20} color="#FFF" />
                            <Text style={styles.primaryButtonText}>Start Quiz</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    // Loading View
    if (quizState === 'loading') {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text }]}>Generating tricky questions...</Text>
            </View>
        );
    }

    // Main Quiz Logic (Answering & Results)
    const isResults = quizState === 'results';

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient
                colors={[colors.primary, colors.primary + '80']}
                style={styles.headerGradient}
            />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitleWhite}>
                        {isResults ? 'Quiz Results' : `Question ${Object.keys(selectedAnswers).length}/${questions.length}`}
                    </Text>
                    {/* Score Badge */}
                    {isResults && (
                        <View style={styles.scoreBadge}>
                            <Text style={styles.scoreText}>{Math.round((score / questions.length) * 100)}%</Text>
                        </View>
                    )}
                    {!isResults && <View style={{ width: 24 }} />}
                </View>

                <ScrollView contentContainerStyle={{ padding: containerPadding }}>
                    {/* Score Summary Card */}
                    {isResults && (
                        <Animated.View entering={FadeInDown.delay(100).springify()} style={[styles.resultCard, { backgroundColor: colors.surface }]}>
                            <Trophy size={48} color={colors.warning} />
                            <Text style={[styles.resultTitle, { color: colors.text }]}>
                                {score === questions.length ? 'Perfect Score!' : score > questions.length / 2 ? 'Great Job!' : 'Build Competency!'}
                            </Text>
                            <Text style={[styles.resultSub, { color: colors.textSecondary }]}>
                                You got {score} out of {questions.length} correct.
                            </Text>
                            <TouchableOpacity style={[styles.restartButton, { borderColor: colors.primary }]} onPress={handleRestart}>
                                <RefreshCw size={16} color={colors.primary} />
                                <Text style={[styles.restartText, { color: colors.primary }]}>Try Again</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* Questions Grid */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gap }}>
                        {questions.map((q, qIndex) => {
                            const userAnswer = selectedAnswers[qIndex];
                            const isCorrect = userAnswer === q.correctAnswer;
                            const showFeedback = isResults;

                            return (
                                <Animated.View
                                    key={qIndex}
                                    entering={FadeInDown.delay(qIndex * 100).springify()}
                                    layout={Layout.springify()}
                                    style={{ width: numColumns > 1 ? '48%' : '100%' }}
                                >
                                    <View style={[
                                        styles.questionCard,
                                        {
                                            backgroundColor: colors.surface,
                                            borderColor: showFeedback ? (isCorrect ? colors.success : colors.error) : 'transparent',
                                            borderWidth: showFeedback ? 2 : 0
                                        }
                                    ]}>
                                        {/* Question Header */}
                                        <View style={styles.qHeader}>
                                            <Text style={[styles.qNum, { color: colors.textSecondary }]}>Q{qIndex + 1}</Text>
                                            {q.difficulty === 'hard' && <AlertTriangle size={16} color={colors.warning} />}
                                        </View>
                                        <Text style={[styles.questionText, { color: colors.text }]}>{q.question}</Text>

                                        {/* Options */}
                                        <View style={styles.optionsList}>
                                            {q.options.map((opt, optIndex) => {
                                                const isSelected = userAnswer === optIndex;
                                                const isRight = q.correctAnswer === optIndex;

                                                let optionColor = colors.surfaceHighlight;
                                                let textColor = colors.text;

                                                if (showFeedback) {
                                                    if (isRight) { optionColor = colors.success + '20'; textColor = colors.success; }
                                                    else if (isSelected && !isRight) { optionColor = colors.error + '20'; textColor = colors.error; }
                                                } else if (isSelected) {
                                                    optionColor = colors.primary + '20';
                                                    textColor = colors.primary;
                                                }

                                                return (
                                                    <TouchableOpacity
                                                        key={optIndex}
                                                        style={[styles.optionButton, { backgroundColor: optionColor }]}
                                                        onPress={() => toggleAnswer(qIndex, optIndex)}
                                                        disabled={isResults}
                                                    >
                                                        <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                                                        {showFeedback && isRight && <CheckCircle2 size={16} color={colors.success} />}
                                                        {showFeedback && isSelected && !isRight && <XCircle size={16} color={colors.error} />}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>

                                        {/* Inline Explanation */}
                                        {showFeedback && !isCorrect && (
                                            <View style={[styles.explanationBox, { backgroundColor: colors.background }]}>
                                                <Lightbulb size={16} color={colors.warning} />
                                                <Text style={[styles.explanationText, { color: colors.textSecondary }]}>{q.explanation}</Text>
                                            </View>
                                        )}
                                    </View>
                                </Animated.View>
                            );
                        })}
                    </View>

                    {/* Submit Button */}
                    {!isResults && (
                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                { backgroundColor: Object.keys(selectedAnswers).length === questions.length ? colors.primary : colors.textMuted }
                            ]}
                            onPress={handleSubmit}
                            disabled={Object.keys(selectedAnswers).length !== questions.length}
                        >
                            <Text style={styles.submitText}>Submit Quiz</Text>
                        </TouchableOpacity>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
    headerTitleWhite: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    backButton: { padding: 8 },

    configCard: { padding: 24, borderRadius: 20, shadowOpacity: 0.1, shadowRadius: 10 },
    label: { fontSize: 16, fontWeight: '600' },
    value: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
    optionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
    optionChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    optionText: { fontSize: 14, fontWeight: '600' },
    primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 8 },
    primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

    loadingText: { marginTop: 16, fontSize: 16 },

    scoreBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    scoreText: { color: '#FFF', fontWeight: '700' },

    resultCard: { alignItems: 'center', padding: 24, borderRadius: 20, marginBottom: 24 },
    resultTitle: { fontSize: 24, fontWeight: '800', marginVertical: 8 },
    resultSub: { fontSize: 16, marginBottom: 16 },
    restartButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, gap: 8 },
    restartText: { fontWeight: '600' },

    questionCard: { padding: 16, borderRadius: 16, marginBottom: 16 },
    qHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    qNum: { fontSize: 12, fontWeight: '700' },
    questionText: { fontSize: 16, fontWeight: '600', marginBottom: 16, lineHeight: 22 },
    optionsList: { gap: 8 },
    optionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12 },
    explanationBox: { flexDirection: 'row', padding: 12, borderRadius: 8, marginTop: 12, gap: 8 },
    explanationText: { flex: 1, fontSize: 13, lineHeight: 18 },

    submitButton: { padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
    submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
