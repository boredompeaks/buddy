// Flashcard Screen - SM-2 Spaced Repetition Study Mode
import { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolate,
    runOnJS,
} from 'react-native-reanimated';
import { ArrowLeft, RotateCcw, ThumbsUp, ThumbsDown, Sparkles, AlertTriangle } from 'lucide-react-native';
import { useNotesStore } from '../../../src/stores';
import { generateFlashcards } from '../../../src/services/ai';
import { COLORS } from '../../../src/constants';
import type { Flashcard } from '../../../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// SM-2 Algorithm Implementation
interface SM2Result {
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReview: number;
}

/**
 * Calculate next review using SM-2 algorithm
 * @param quality - Rating 0-5 (0-2: again, 3: hard, 4: good, 5: easy)
 * @param repetitions - Number of consecutive correct responses
 * @param easeFactor - Current ease factor (>= 1.3)
 * @param interval - Current interval in days
 */
function calculateSM2(
    quality: number,
    repetitions: number,
    easeFactor: number,
    interval: number
): SM2Result {
    // Defensive: ensure valid inputs
    const safeQuality = Math.max(0, Math.min(5, quality));
    const safeEaseFactor = Math.max(1.3, easeFactor);
    const safeRepetitions = Math.max(0, repetitions);
    const safeInterval = Math.max(0, interval);

    let newRepetitions: number;
    let newInterval: number;
    let newEaseFactor: number;

    if (safeQuality < 3) {
        // Failed - reset
        newRepetitions = 0;
        newInterval = 1;
        newEaseFactor = safeEaseFactor;
    } else {
        // Passed
        newRepetitions = safeRepetitions + 1;

        if (newRepetitions === 1) {
            newInterval = 1;
        } else if (newRepetitions === 2) {
            newInterval = 6;
        } else {
            newInterval = Math.round(safeInterval * safeEaseFactor);
        }

        // Update ease factor
        newEaseFactor = safeEaseFactor + (0.1 - (5 - safeQuality) * (0.08 + (5 - safeQuality) * 0.02));
        newEaseFactor = Math.max(1.3, newEaseFactor);
    }

    const nextReview = Date.now() + newInterval * 24 * 60 * 60 * 1000;

    return {
        easeFactor: newEaseFactor,
        interval: newInterval,
        repetitions: newRepetitions,
        nextReview,
    };
}

type FlashcardState = 'loading' | 'studying' | 'complete' | 'error';

interface CardWithSM2 extends Flashcard {
    easeFactor: number;
    interval: number;
    repetitions: number;
}

export default function FlashcardScreen() {
    const { noteId, deckId } = useLocalSearchParams<{ noteId?: string; deckId?: string }>();
    const router = useRouter();

    const notes = useNotesStore(state => state.notes);
    const note = noteId ? notes.find(n => n.id === noteId) : null;

    const [state, setState] = useState<FlashcardState>('loading');
    const [error, setError] = useState<string | null>(null);
    const [cards, setCards] = useState<CardWithSM2[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [studyStats, setStudyStats] = useState({ correct: 0, incorrect: 0 });

    // Animation values
    const flipValue = useSharedValue(0);

    // Load flashcards on mount
    useEffect(() => {
        if (!note?.content) {
            setError('No content to generate flashcards from.');
            setState('error');
            return;
        }

        let isMounted = true;

        async function loadCards(): Promise<void> {
            try {
                const generated = await generateFlashcards(note!.content, 15);

                if (!isMounted) return;

                // Defensive: validate response structure
                if (!Array.isArray(generated) || generated.length === 0) {
                    throw new Error('Failed to generate flashcards. Please try again.');
                }

                // Initialize with SM-2 defaults
                const cardsWithSM2: CardWithSM2[] = generated.map((card, i) => ({
                    id: `card-${i}-${Date.now()}`,
                    front: typeof card.front === 'string' ? card.front : 'Invalid card',
                    back: typeof card.back === 'string' ? card.back : 'Invalid card',
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
                if (!isMounted) return;
                const message = err instanceof Error ? err.message : 'Unknown error';
                setError(message);
                setState('error');
            }
        }

        loadCards();

        return () => {
            isMounted = false;
        };
    }, [note?.id]);

    const currentCard = cards[currentIndex];

    const handleFlip = useCallback(() => {
        setIsFlipped(prev => !prev);
        flipValue.value = withSpring(isFlipped ? 0 : 1, { damping: 20, stiffness: 90 });
    }, [isFlipped]);

    const handleResponse = useCallback((quality: number) => {
        if (!currentCard) return;

        // Update stats
        if (quality >= 3) {
            setStudyStats(prev => ({ ...prev, correct: prev.correct + 1 }));
        } else {
            setStudyStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
        }

        // Calculate new SM-2 values
        const result = calculateSM2(
            quality,
            currentCard.repetitions,
            currentCard.easeFactor,
            currentCard.interval
        );

        // Update card in array
        setCards(prev => prev.map(c =>
            c.id === currentCard.id
                ? { ...c, ...result }
                : c
        ));

        // Move to next card
        setIsFlipped(false);
        flipValue.value = 0;

        if (currentIndex < cards.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setState('complete');
        }
    }, [currentCard, currentIndex, cards.length]);

    const handleRestart = useCallback(() => {
        setCurrentIndex(0);
        setIsFlipped(false);
        flipValue.value = 0;
        setStudyStats({ correct: 0, incorrect: 0 });
        setState('studying');
    }, []);

    // Animated styles for flip
    const frontAnimatedStyle = useAnimatedStyle(() => {
        const rotateY = interpolate(flipValue.value, [0, 1], [0, 180]);
        return {
            transform: [{ rotateY: `${rotateY}deg` }],
            backfaceVisibility: 'hidden' as const,
        };
    });

    const backAnimatedStyle = useAnimatedStyle(() => {
        const rotateY = interpolate(flipValue.value, [0, 1], [180, 360]);
        return {
            transform: [{ rotateY: `${rotateY}deg` }],
            backfaceVisibility: 'hidden' as const,
            position: 'absolute' as const,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
        };
    });

    // Loading state
    if (state === 'loading') {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.light.primary} />
                    <Text style={styles.loadingText}>Generating flashcards...</Text>
                    <Text style={styles.loadingSubtext}>This may take a moment</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Error state
    if (state === 'error') {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.centerContainer}>
                    <AlertTriangle size={48} color={COLORS.light.error} />
                    <Text style={styles.errorTitle}>Generation Failed</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Complete state
    if (state === 'complete') {
        const totalCards = cards.length;
        const accuracy = totalCards > 0 ? Math.round((studyStats.correct / totalCards) * 100) : 0;

        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.centerContainer}>
                    <Sparkles size={56} color={accuracy >= 70 ? '#f59e0b' : COLORS.light.primary} />
                    <Text style={styles.completeTitle}>Session Complete!</Text>

                    <View style={styles.statsCard}>
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>Cards Reviewed</Text>
                            <Text style={styles.statValue}>{totalCards}</Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>Correct</Text>
                            <Text style={[styles.statValue, { color: COLORS.light.success }]}>{studyStats.correct}</Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>Incorrect</Text>
                            <Text style={[styles.statValue, { color: COLORS.light.error }]}>{studyStats.incorrect}</Text>
                        </View>
                        <View style={styles.accuracyBar}>
                            <View style={[styles.accuracyFill, { width: `${accuracy}%` }]} />
                        </View>
                        <Text style={styles.accuracyText}>{accuracy}% Accuracy</Text>
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.actionBtn} onPress={handleRestart}>
                            <RotateCcw size={20} color={COLORS.light.primary} />
                            <Text style={styles.actionBtnText}>Study Again</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]} onPress={() => router.back()}>
                            <Text style={styles.primaryBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // Studying state
    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <ArrowLeft size={24} color={COLORS.light.text} />
                </TouchableOpacity>
                <View style={styles.progressContainer}>
                    <Text style={styles.progressText}>{currentIndex + 1} / {cards.length}</Text>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${((currentIndex + 1) / cards.length) * 100}%` }]} />
                    </View>
                </View>
            </View>

            {/* Card */}
            <View style={styles.cardContainer}>
                <TouchableOpacity onPress={handleFlip} activeOpacity={0.9} style={styles.cardTouchable}>
                    {/* Front */}
                    <Animated.View style={[styles.card, frontAnimatedStyle]}>
                        <Text style={styles.cardLabel}>Question</Text>
                        <Text style={styles.cardText}>{currentCard?.front}</Text>
                        <Text style={styles.tapHint}>Tap to flip</Text>
                    </Animated.View>

                    {/* Back */}
                    <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
                        <Text style={styles.cardLabel}>Answer</Text>
                        <Text style={styles.cardText}>{currentCard?.back}</Text>
                    </Animated.View>
                </TouchableOpacity>
            </View>

            {/* Response buttons (only show when flipped) */}
            {isFlipped && (
                <View style={styles.responseContainer}>
                    <TouchableOpacity style={[styles.responseBtn, styles.againBtn]} onPress={() => handleResponse(1)}>
                        <ThumbsDown size={24} color="#fff" />
                        <Text style={styles.responseBtnText}>Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.responseBtn, styles.goodBtn]} onPress={() => handleResponse(4)}>
                        <ThumbsUp size={24} color="#fff" />
                        <Text style={styles.responseBtnText}>Got it</Text>
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.light.background },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
    loadingText: { fontSize: 18, fontWeight: '600', color: COLORS.light.text, marginTop: 16 },
    loadingSubtext: { fontSize: 14, color: COLORS.light.textSecondary },
    errorTitle: { fontSize: 20, fontWeight: '700', color: COLORS.light.text, marginTop: 12 },
    errorText: { fontSize: 14, color: COLORS.light.textSecondary, textAlign: 'center' },
    backBtn: { backgroundColor: COLORS.light.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 16 },
    backBtnText: { color: '#fff', fontWeight: '600' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 },
    progressContainer: { flex: 1 },
    progressText: { fontSize: 14, fontWeight: '600', color: COLORS.light.textSecondary, marginBottom: 6 },
    progressBar: { height: 6, backgroundColor: COLORS.light.border, borderRadius: 3 },
    progressFill: { height: '100%', backgroundColor: COLORS.light.primary, borderRadius: 3 },
    cardContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    cardTouchable: { width: SCREEN_WIDTH - 40, height: 350 },
    card: {
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.light.surface,
        borderRadius: 24,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    cardBack: { backgroundColor: COLORS.light.primary },
    cardLabel: { fontSize: 14, fontWeight: '600', color: COLORS.light.textSecondary, marginBottom: 16 },
    cardText: { fontSize: 22, fontWeight: '600', color: COLORS.light.text, textAlign: 'center', lineHeight: 32 },
    tapHint: { position: 'absolute', bottom: 20, fontSize: 12, color: COLORS.light.textMuted },
    responseContainer: { flexDirection: 'row', padding: 20, gap: 16 },
    responseBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 8 },
    againBtn: { backgroundColor: COLORS.light.error },
    goodBtn: { backgroundColor: COLORS.light.success },
    responseBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    completeTitle: { fontSize: 28, fontWeight: '800', color: COLORS.light.text, marginTop: 12 },
    statsCard: { backgroundColor: COLORS.light.surface, padding: 24, borderRadius: 20, width: '100%', marginTop: 20, gap: 12 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between' },
    statLabel: { fontSize: 15, color: COLORS.light.textSecondary },
    statValue: { fontSize: 15, fontWeight: '700', color: COLORS.light.text },
    accuracyBar: { height: 8, backgroundColor: COLORS.light.border, borderRadius: 4, marginTop: 8 },
    accuracyFill: { height: '100%', backgroundColor: COLORS.light.success, borderRadius: 4 },
    accuracyText: { textAlign: 'center', fontSize: 16, fontWeight: '700', color: COLORS.light.success, marginTop: 4 },
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, backgroundColor: COLORS.light.surface, borderRadius: 16 },
    actionBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.light.primary },
    primaryBtn: { backgroundColor: COLORS.light.primary },
    primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
