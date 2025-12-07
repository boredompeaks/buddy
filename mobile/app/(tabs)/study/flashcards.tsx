// Flashcard Screen - SM-2 Spaced Repetition Study Mode
import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, FlatList, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolate,
} from 'react-native-reanimated';
import { ArrowLeft, RotateCcw, ThumbsUp, ThumbsDown, Sparkles, AlertTriangle, BookOpen, ChevronRight } from 'lucide-react-native';
import { useNotesStore } from '../../../src/stores';
import { generateFlashcards } from '../../../src/services/ai';
import { useThemeColors } from '../../../hooks/useThemeColors';
import type { Flashcard } from '../../../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// SM-2 Algorithm Implementation (Same as before)
interface SM2Result {
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReview: number;
}

function calculateSM2(
    quality: number,
    repetitions: number,
    easeFactor: number,
    interval: number
): SM2Result {
    const safeQuality = Math.max(0, Math.min(5, quality));
    const safeEaseFactor = Math.max(1.3, easeFactor);
    const safeRepetitions = Math.max(0, repetitions);
    const safeInterval = Math.max(0, interval);

    let newRepetitions: number;
    let newInterval: number;
    let newEaseFactor: number;

    if (safeQuality < 3) {
        newRepetitions = 0;
        newInterval = 1;
        newEaseFactor = safeEaseFactor;
    } else {
        newRepetitions = safeRepetitions + 1;
        if (newRepetitions === 1) {
            newInterval = 1;
        } else if (newRepetitions === 2) {
            newInterval = 6;
        } else {
            newInterval = Math.round(safeInterval * safeEaseFactor);
        }
        newEaseFactor = safeEaseFactor + (0.1 - (5 - safeQuality) * (0.08 + (5 - safeQuality) * 0.02));
        newEaseFactor = Math.max(1.3, newEaseFactor);
    }

    const nextReview = Date.now() + newInterval * 24 * 60 * 60 * 1000;
    return { easeFactor: newEaseFactor, interval: newInterval, repetitions: newRepetitions, nextReview };
}

type FlashcardState = 'selection' | 'loading' | 'studying' | 'complete' | 'error';

interface CardWithSM2 extends Flashcard {
    easeFactor: number;
    interval: number;
    repetitions: number;
}

export default function FlashcardScreen() {
    const { noteId, deckId } = useLocalSearchParams<{ noteId?: string; deckId?: string }>();
    const router = useRouter();
    const colors = useThemeColors();

    const notes = useNotesStore(state => state.notes);
    const note = noteId ? notes.find(n => n.id === noteId) : null;

    const [state, setState] = useState<FlashcardState>(noteId ? 'loading' : 'selection');
    const [error, setError] = useState<string | null>(null);
    const [cards, setCards] = useState<CardWithSM2[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [studyStats, setStudyStats] = useState({ correct: 0, incorrect: 0 });

    const flipValue = useSharedValue(0);

    // Initial load logic
    useEffect(() => {
        if (noteId && note) {
            loadCards();
        } else if (noteId && !note) {
            setError('Note not found');
            setState('error');
        } else {
            setState('selection');
        }
    }, [noteId, note]);

    async function loadCards() {
        if (!note?.content) {
            setError('No content to generate flashcards from.');
            setState('error');
            return;
        }
        setState('loading');
        try {
            const generated = await generateFlashcards(note.content, 15);
            if (!Array.isArray(generated) || generated.length === 0) {
                throw new Error('Failed to generate flashcards.');
            }
            const cardsWithSM2: CardWithSM2[] = generated.map((card, i) => ({
                id: `card-${i}-${Date.now()}`,
                front: card.front,
                back: card.back,
                easeFactor: 2.5,
                interval: 0,
                repetitions: 0,
                nextReview: Date.now(),
                createdAt: Date.now(),
                deckId: deckId ?? 'temp',
            }));
            setCards(cardsWithSM2);
            setState('studying');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setState('error');
        }
    }

    const handleSelectNote = (id: string) => {
        router.push({ pathname: '/(tabs)/study/flashcards', params: { noteId: id } });
    };

    const handleFlip = useCallback(() => {
        setIsFlipped(prev => !prev);
        flipValue.value = withSpring(isFlipped ? 0 : 1, { damping: 20, stiffness: 90 });
    }, [isFlipped]);

    const handleResponse = useCallback((quality: number) => {
        const currentCard = cards[currentIndex];
        if (!currentCard) return;

        if (quality >= 3) {
            setStudyStats(prev => ({ ...prev, correct: prev.correct + 1 }));
        } else {
            setStudyStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
        }

        const result = calculateSM2(quality, currentCard.repetitions, currentCard.easeFactor, currentCard.interval);
        setCards(prev => prev.map(c => c.id === currentCard.id ? { ...c, ...result } : c));

        setIsFlipped(false);
        flipValue.value = 0;

        if (currentIndex < cards.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setState('complete');
        }
    }, [currentIndex, cards, flipValue]);

    const handleRestart = useCallback(() => {
        setCurrentIndex(0);
        setIsFlipped(false);
        flipValue.value = 0;
        setStudyStats({ correct: 0, incorrect: 0 });
        setState('studying');
    }, [flipValue]);

    const frontAnimatedStyle = useAnimatedStyle(() => {
        const rotateY = interpolate(flipValue.value, [0, 1], [0, 180]);
        return { transform: [{ rotateY: `${rotateY}deg` }], backfaceVisibility: 'hidden' };
    });

    const backAnimatedStyle = useAnimatedStyle(() => {
        const rotateY = interpolate(flipValue.value, [0, 1], [180, 360]);
        return {
            transform: [{ rotateY: `${rotateY}deg` }],
            backfaceVisibility: 'hidden',
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        };
    });

    // SELECTION STATE
    if (state === 'selection') {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Select Note</Text>
                </View>
                <FlatList
                    data={notes}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={[styles.noteItem, { backgroundColor: colors.surface }]}
                            onPress={() => handleSelectNote(item.id)}
                        >
                            <BookOpen size={20} color={colors.primary} />
                            <View style={styles.noteInfo}>
                                <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                                <Text style={[styles.noteSubject, { color: colors.textSecondary }]}>{item.subject}</Text>
                            </View>
                            <ChevronRight size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No notes available. Create one first!</Text>
                        </View>
                    }
                />
            </SafeAreaView>
        );
    }

    // LOADING STATE
    if (state === 'loading') {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.text }]}>Generating Flashcards...</Text>
                    <Text style={[styles.loadingSubtext, { color: colors.textSecondary }]}>Analyzing your note with AI</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ERROR STATE
    if (state === 'error') {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.centerContainer}>
                    <AlertTriangle size={48} color={colors.error} />
                    <Text style={[styles.errorTitle, { color: colors.text }]}>Generation Failed</Text>
                    <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
                    <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // COMPLETE STATE
    if (state === 'complete') {
        const totalCards = cards.length;
        const accuracy = totalCards > 0 ? Math.round((studyStats.correct / totalCards) * 100) : 0;
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.centerContainer}>
                    <Sparkles size={56} color={accuracy >= 70 ? '#f59e0b' : colors.primary} />
                    <Text style={[styles.completeTitle, { color: colors.text }]}>Session Complete!</Text>
                    <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
                        <View style={styles.statRow}>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Cards Reviewed</Text>
                            <Text style={[styles.statValue, { color: colors.text }]}>{totalCards}</Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Correct</Text>
                            <Text style={[styles.statValue, { color: colors.success }]}>{studyStats.correct}</Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Incorrect</Text>
                            <Text style={[styles.statValue, { color: colors.error }]}>{studyStats.incorrect}</Text>
                        </View>
                        <View style={[styles.accuracyBar, { backgroundColor: colors.border }]}>
                            <View style={[styles.accuracyFill, { width: `${accuracy}%`, backgroundColor: colors.success }]} />
                        </View>
                        <Text style={[styles.accuracyText, { color: colors.success }]}>{accuracy}% Accuracy</Text>
                    </View>
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface }]} onPress={handleRestart}>
                            <RotateCcw size={20} color={colors.primary} />
                            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Study Again</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
                            <Text style={[styles.primaryBtnText, { color: '#fff' }]}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // STUDYING STATE
    const currentCard = cards[currentIndex];
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.progressContainer}>
                    <Text style={[styles.progressText, { color: colors.textSecondary }]}>{currentIndex + 1} / {cards.length}</Text>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                        <View style={[styles.progressFill, { width: `${((currentIndex + 1) / cards.length) * 100}%`, backgroundColor: colors.primary }]} />
                    </View>
                </View>
            </View>
            <View style={styles.cardContainer}>
                <TouchableOpacity onPress={handleFlip} activeOpacity={0.9} style={styles.cardTouchable}>
                    <Animated.View style={[styles.card, { backgroundColor: colors.surface }, frontAnimatedStyle]}>
                        <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Question</Text>
                        <Text style={[styles.cardText, { color: colors.text }]}>{currentCard?.front}</Text>
                        <Text style={[styles.tapHint, { color: colors.textMuted }]}>Tap to flip</Text>
                    </Animated.View>
                    <Animated.View style={[styles.card, { backgroundColor: colors.primary }, backAnimatedStyle]}>
                        <Text style={[styles.cardLabel, { color: 'rgba(255,255,255,0.8)' }]}>Answer</Text>
                        <Text style={[styles.cardText, { color: '#fff' }]}>{currentCard?.back}</Text>
                    </Animated.View>
                </TouchableOpacity>
            </View>
            {isFlipped && (
                <View style={styles.responseContainer}>
                    <TouchableOpacity style={[styles.responseBtn, { backgroundColor: colors.error }]} onPress={() => handleResponse(1)}>
                        <ThumbsDown size={24} color="#fff" />
                        <Text style={styles.responseBtnText}>Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.responseBtn, { backgroundColor: colors.success }]} onPress={() => handleResponse(4)}>
                        <ThumbsUp size={24} color="#fff" />
                        <Text style={styles.responseBtnText}>Got it</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    backButton: { padding: 4 },
    listContent: { padding: 20 },
    noteItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12, gap: 12 },
    noteInfo: { flex: 1 },
    noteTitle: { fontSize: 16, fontWeight: '600' },
    noteSubject: { fontSize: 12, marginTop: 2 },
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 14 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
    loadingText: { fontSize: 18, fontWeight: '600', marginTop: 16 },
    loadingSubtext: { fontSize: 14 },
    errorTitle: { fontSize: 20, fontWeight: '700', marginTop: 12 },
    errorText: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
    backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    backBtnText: { color: '#fff', fontWeight: '600' },
    progressContainer: { flex: 1 },
    progressText: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
    progressBar: { height: 6, borderRadius: 3 },
    progressFill: { height: '100%', borderRadius: 3 },
    cardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    cardTouchable: { width: SCREEN_WIDTH - 40, height: 350 },
    card: { width: '100%', height: '100%', borderRadius: 24, padding: 24, justifyContent: 'center', alignItems: 'center', backfaceVisibility: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
    cardLabel: { fontSize: 14, fontWeight: '600', marginBottom: 16 },
    cardText: { fontSize: 22, fontWeight: '600', textAlign: 'center', lineHeight: 32 },
    tapHint: { position: 'absolute', bottom: 20, fontSize: 12 },
    responseContainer: { flexDirection: 'row', padding: 20, gap: 16 },
    responseBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 8 },
    responseBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    completeTitle: { fontSize: 28, fontWeight: '800', marginTop: 12 },
    statsCard: { padding: 24, borderRadius: 20, width: '100%', marginTop: 20, gap: 12 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between' },
    statLabel: { fontSize: 15 },
    statValue: { fontSize: 15, fontWeight: '700' },
    accuracyBar: { height: 8, borderRadius: 4, marginTop: 8 },
    accuracyFill: { height: '100%', borderRadius: 4 },
    accuracyText: { textAlign: 'center', fontSize: 16, fontWeight: '700', marginTop: 4 },
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
    actionBtnText: { fontSize: 15, fontWeight: '600' },
    primaryBtnText: { fontSize: 15, fontWeight: '600' },
});