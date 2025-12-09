// Flashcards Screen - Full SM-2 Integration with Store
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, RotateCw, Check, X as XIcon, Layers, BookOpen, Sparkles, Trash2 } from 'lucide-react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolate,
    runOnJS,
    withTiming
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

import GlassLayout from '../../../src/components/GlassLayout';
import GlassCard from '../../../src/components/GlassCard';
import { Skeleton } from '../../../src/components/Skeleton';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useHaptics } from '../../../src/hooks/useHaptics';
import { useNotesStore } from '../../../src/stores';
import { useFlashcardStore, FlashcardCard } from '../../../src/stores/flashcards';
import { generateFlashcards } from '../../../src/services/ai';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

type ScreenState = 'select' | 'loading' | 'review' | 'complete';

export default function FlashcardsScreen() {
    const router = useRouter();
    const colors = useThemeColors();
    const haptics = useHaptics();

    // Stores
    const notes = useNotesStore(state => state.notes);
    const {
        decks,
        isLoading: decksLoading,
        loadDecks,
        getDeckByNoteId,
        saveDeck,
        updateCardMastery,
        recordStudySession,
        deleteDeck,
        getDeckStats,
        getShuffledCards
    } = useFlashcardStore();

    // Screen state
    const [screenState, setScreenState] = useState<ScreenState>('select');
    const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
    const [cards, setCards] = useState<FlashcardCard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [generatingForNote, setGeneratingForNote] = useState<string | null>(null);

    // Animation Values
    const translateX = useSharedValue(0);
    const rotateY = useSharedValue(0);

    // Load decks on mount
    useEffect(() => {
        loadDecks();
    }, []);

    // Get notes that have content (for flashcard generation)
    const notesWithContent = notes.filter(n => n.content && n.content.length >= 50);

    // Handle selecting a note to study
    const handleSelectNote = async (noteId: string, noteTitle: string, subject: string) => {
        const existingDeck = getDeckByNoteId(noteId);

        if (existingDeck) {
            // Use existing deck
            setActiveDeckId(existingDeck.id);
            const shuffled = getShuffledCards(existingDeck.id);
            setCards(shuffled);
            setCurrentIndex(0);
            setScreenState('review');
            haptics.medium();
        } else {
            // Generate new deck
            setGeneratingForNote(noteId);
            setScreenState('loading');
            haptics.light();

            try {
                const note = notes.find(n => n.id === noteId);
                if (!note) throw new Error('Note not found');

                const generatedCards = await generateFlashcards(note.content, 15);
                const deck = await saveDeck(noteId, noteTitle, subject, generatedCards);

                setActiveDeckId(deck.id);
                const shuffled = getShuffledCards(deck.id);
                setCards(shuffled.length > 0 ? shuffled : deck.cards);
                setCurrentIndex(0);
                setScreenState('review');
                haptics.success();
            } catch (error) {
                console.error('Failed to generate flashcards:', error);
                Alert.alert('Error', 'Failed to generate flashcards. Please try again.');
                setScreenState('select');
                haptics.error();
            } finally {
                setGeneratingForNote(null);
            }
        }
    };

    // Handle card response (SM-2 quality: 0-2 = fail, 3-5 = pass)
    const handleCardResponse = useCallback(async (direction: 'left' | 'right') => {
        if (!activeDeckId || currentIndex >= cards.length) return;

        const card = cards[currentIndex];
        const quality = direction === 'right' ? 4 : 1; // Right = good (4), Left = fail (1)

        haptics.medium();

        // Update mastery in store
        await updateCardMastery(activeDeckId, card.id, quality);

        // Move to next card
        if (currentIndex + 1 >= cards.length) {
            await recordStudySession(activeDeckId);
            setScreenState('complete');
            haptics.success();
        } else {
            setCurrentIndex(prev => prev + 1);
            setIsFlipped(false);
            translateX.value = 0;
            rotateY.value = 0;
        }
    }, [activeDeckId, cards, currentIndex, haptics, updateCardMastery, recordStudySession]);

    // Gesture Handler
    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            translateX.value = event.translationX;
        })
        .onEnd((event) => {
            if (Math.abs(event.translationX) > 100) {
                const direction = event.translationX > 0 ? 'right' : 'left';
                translateX.value = withTiming(direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH, {}, () => {
                    runOnJS(handleCardResponse)(direction);
                });
            } else {
                translateX.value = withSpring(0);
            }
        });

    const handleFlip = () => {
        haptics.selection();
        if (isFlipped) {
            rotateY.value = withSpring(0);
        } else {
            rotateY.value = withSpring(180);
        }
        setIsFlipped(!isFlipped);
    };

    const handleDeleteDeck = (deckId: string, deckName: string) => {
        Alert.alert(
            'Delete Deck',
            `Are you sure you want to delete "${deckName}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteDeck(deckId);
                        haptics.warning();
                    }
                }
            ]
        );
    };

    const restartDeck = () => {
        if (activeDeckId) {
            const shuffled = getShuffledCards(activeDeckId);
            setCards(shuffled);
            setCurrentIndex(0);
            setIsFlipped(false);
            setScreenState('review');
            translateX.value = 0;
            rotateY.value = 0;
            haptics.medium();
        }
    };

    // Animation styles
    const frontAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { rotateY: `${interpolate(rotateY.value, [0, 180], [0, 180])}deg` },
            { translateX: translateX.value },
            { rotateZ: `${interpolate(translateX.value, [-SCREEN_WIDTH, SCREEN_WIDTH], [-15, 15])}deg` }
        ],
        opacity: interpolate(rotateY.value, [85, 95], [1, 0]),
        zIndex: isFlipped ? 0 : 1,
    }));

    const backAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { rotateY: `${interpolate(rotateY.value, [0, 180], [180, 360])}deg` },
            { translateX: translateX.value },
            { rotateZ: `${interpolate(translateX.value, [-SCREEN_WIDTH, SCREEN_WIDTH], [-15, 15])}deg` }
        ],
        opacity: interpolate(rotateY.value, [85, 95], [0, 1]),
        zIndex: isFlipped ? 1 : 0,
    }));

    // ========== RENDER: Note Selection ==========
    if (screenState === 'select') {
        return (
            <GlassLayout>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>Flashcards</Text>
                </View>

                {decksLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={notesWithContent}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        ListHeaderComponent={() => (
                            <>
                                {/* Existing Decks Section */}
                                {decks.length > 0 && (
                                    <View style={styles.section}>
                                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                                            <Layers size={16} color={colors.primary} /> Your Decks
                                        </Text>
                                        {decks.map(deck => {
                                            const stats = getDeckStats(deck.id);
                                            return (
                                                <GlassCard key={deck.id} style={styles.deckCard}>
                                                    <TouchableOpacity
                                                        style={styles.deckContent}
                                                        onPress={() => {
                                                            setActiveDeckId(deck.id);
                                                            const shuffled = getShuffledCards(deck.id);
                                                            setCards(shuffled);
                                                            setCurrentIndex(0);
                                                            setScreenState('review');
                                                            haptics.medium();
                                                        }}
                                                    >
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={[styles.deckTitle, { color: colors.text }]}>{deck.noteTitle}</Text>
                                                            <Text style={[styles.deckSub, { color: colors.textSecondary }]}>
                                                                {deck.cards.length} cards • {stats.mastered} mastered
                                                            </Text>
                                                        </View>
                                                        <View style={styles.statsRow}>
                                                            <View style={[styles.statBadge, { backgroundColor: colors.success + '20' }]}>
                                                                <Text style={[styles.statText, { color: colors.success }]}>{stats.mastered}</Text>
                                                            </View>
                                                            <View style={[styles.statBadge, { backgroundColor: colors.warning + '20' }]}>
                                                                <Text style={[styles.statText, { color: colors.warning }]}>{stats.learning}</Text>
                                                            </View>
                                                            <View style={[styles.statBadge, { backgroundColor: colors.primary + '20' }]}>
                                                                <Text style={[styles.statText, { color: colors.primary }]}>{stats.new}</Text>
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={styles.deleteBtn}
                                                        onPress={() => handleDeleteDeck(deck.id, deck.noteTitle)}
                                                    >
                                                        <Trash2 size={18} color={colors.error} />
                                                    </TouchableOpacity>
                                                </GlassCard>
                                            );
                                        })}
                                    </View>
                                )}

                                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
                                    <Sparkles size={16} color={colors.primary} /> Generate from Notes
                                </Text>
                            </>
                        )}
                        renderItem={({ item }) => {
                            const existingDeck = getDeckByNoteId(item.id);
                            return (
                                <TouchableOpacity
                                    onPress={() => handleSelectNote(item.id, item.title, item.subject)}
                                    disabled={generatingForNote === item.id}
                                >
                                    <GlassCard style={styles.noteCard}>
                                        <BookOpen size={20} color={colors.textSecondary} />
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={[styles.noteTitle, { color: colors.text }]}>{item.title}</Text>
                                            <Text style={[styles.noteSub, { color: colors.textSecondary }]}>{item.subject}</Text>
                                        </View>
                                        {existingDeck ? (
                                            <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
                                                <Text style={{ color: colors.success, fontSize: 10, fontWeight: '600' }}>DECK EXISTS</Text>
                                            </View>
                                        ) : (
                                            <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                                                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '600' }}>GENERATE</Text>
                                            </View>
                                        )}
                                    </GlassCard>
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyState}>
                                <BookOpen size={48} color={colors.textMuted} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    No notes with enough content.{'\n'}Add more content to your notes to generate flashcards.
                                </Text>
                            </View>
                        )}
                    />
                )}
            </GlassLayout>
        );
    }

    // ========== RENDER: Loading ==========
    if (screenState === 'loading') {
        return (
            <GlassLayout>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.text }]}>Generating flashcards...</Text>
                    <Text style={[styles.loadingSub, { color: colors.textSecondary }]}>AI is analyzing your notes</Text>
                </View>
            </GlassLayout>
        );
    }

    // ========== RENDER: Complete ==========
    if (screenState === 'complete') {
        const stats = activeDeckId ? getDeckStats(activeDeckId) : { mastered: 0, learning: 0, new: 0 };
        return (
            <GlassLayout>
                <View style={styles.centerContainer}>
                    <GlassCard style={styles.resultCard}>
                        <Check size={48} color={colors.success} />
                        <Text style={[styles.resultTitle, { color: colors.text }]}>Session Complete!</Text>
                        <Text style={[styles.resultSub, { color: colors.textSecondary }]}>
                            You reviewed {cards.length} cards
                        </Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: colors.success }]}>{stats.mastered}</Text>
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mastered</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: colors.warning }]}>{stats.learning}</Text>
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Learning</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: colors.primary }]}>{stats.new}</Text>
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>New</Text>
                            </View>
                        </View>
                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                                onPress={() => setScreenState('select')}
                            >
                                <Text style={[styles.buttonText, { color: colors.text }]}>Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: colors.primary }]}
                                onPress={restartDeck}
                            >
                                <Text style={[styles.buttonText, { color: '#fff' }]}>Study Again</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </View>
            </GlassLayout>
        );
    }

    // ========== RENDER: Review Mode ==========
    const currentCard = cards[currentIndex];

    return (
        <GlassLayout>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setScreenState('select')} style={styles.backButton}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${((currentIndex) / cards.length) * 100}%`, backgroundColor: colors.primary }]} />
                    </View>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{currentIndex + 1}/{cards.length}</Text>
                </View>

                <View style={styles.deckContainer}>
                    {currentCard && (
                        <GestureDetector gesture={panGesture}>
                            <View style={styles.cardWrapper}>
                                {/* Front Side */}
                                <Animated.View style={[styles.cardFace, frontAnimatedStyle]}>
                                    <GlassCard style={styles.cardContent} intensity={80}>
                                        <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Question</Text>
                                        <Text style={[styles.cardText, { color: colors.text }]}>{currentCard.front}</Text>
                                        <Text style={[styles.tapHint, { color: colors.textMuted }]}>Tap to flip</Text>
                                    </GlassCard>
                                </Animated.View>

                                {/* Back Side */}
                                <Animated.View style={[styles.cardFace, styles.cardBack, backAnimatedStyle]}>
                                    <GlassCard style={styles.cardContent} intensity={90}>
                                        <Text style={[styles.cardLabel, { color: colors.success }]}>Answer</Text>
                                        <Text style={[styles.cardText, { color: colors.text }]}>{currentCard.back}</Text>
                                    </GlassCard>
                                </Animated.View>

                                {/* Tap overlay */}
                                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleFlip} activeOpacity={1} />
                            </View>
                        </GestureDetector>
                    )}
                </View>

                {/* Controls */}
                <View style={styles.controls}>
                    <TouchableOpacity
                        style={[styles.controlBtn, { backgroundColor: colors.error + '20' }]}
                        onPress={() => handleCardResponse('left')}
                    >
                        <XIcon size={28} color={colors.error} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.controlBtn, { backgroundColor: colors.primary + '20', width: 64, height: 64 }]}
                        onPress={handleFlip}
                    >
                        <RotateCw size={28} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.controlBtn, { backgroundColor: colors.success + '20' }]}
                        onPress={() => handleCardResponse('right')}
                    >
                        <Check size={28} color={colors.success} />
                    </TouchableOpacity>
                </View>
            </GestureHandlerRootView>
        </GlassLayout>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    backButton: { padding: 8 },
    title: { fontSize: 24, fontWeight: '700' },
    progressContainer: {
        flex: 1,
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: { height: '100%' },

    listContent: { padding: 20, paddingBottom: 100 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, flexDirection: 'row', alignItems: 'center' },

    deckCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12 },
    deckContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    deckTitle: { fontSize: 16, fontWeight: '600' },
    deckSub: { fontSize: 12, marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: 6 },
    statBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statText: { fontSize: 12, fontWeight: '700' },
    deleteBtn: { padding: 8, marginLeft: 8 },

    noteCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12 },
    noteTitle: { fontSize: 16, fontWeight: '600' },
    noteSub: { fontSize: 12, marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },

    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { marginTop: 16, textAlign: 'center', lineHeight: 22 },

    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 20, fontSize: 18, fontWeight: '600' },
    loadingSub: { marginTop: 8, fontSize: 14 },

    deckContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -40,
    },
    cardWrapper: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        position: 'absolute',
    },
    cardFace: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        backfaceVisibility: 'hidden',
    },
    cardBack: {},
    cardContent: {
        flex: 1,
        padding: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardLabel: {
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 20,
    },
    cardText: {
        fontSize: 22,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 30,
    },
    tapHint: {
        marginTop: 40,
        fontSize: 12,
    },

    controls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 30,
        marginBottom: 50,
    },
    controlBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },

    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    resultCard: { padding: 40, alignItems: 'center', width: '100%' },
    resultTitle: { fontSize: 24, fontWeight: '700', marginTop: 16 },
    resultSub: { fontSize: 14, marginTop: 8 },
    statsGrid: { flexDirection: 'row', gap: 24, marginTop: 24 },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 28, fontWeight: '700' },
    statLabel: { fontSize: 12, marginTop: 4 },
    buttonRow: { flexDirection: 'row', gap: 12, marginTop: 32, width: '100%' },
    button: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
    buttonText: { fontWeight: '600' },
});