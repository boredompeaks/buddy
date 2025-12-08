// Flashcard Store - Persistent deck storage with mastery tracking
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const FLASHCARD_DECKS_KEY = 'mindvault_flashcard_decks';

export interface FlashcardCard {
    id: string;
    front: string;
    back: string;
    // SM-2 algorithm fields
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReview: number;
}

export interface FlashcardDeck {
    id: string;
    noteId: string;
    noteTitle: string;
    subject: string;
    cards: FlashcardCard[];
    createdAt: number;
    lastStudied: number | null;
    totalReviews: number;
}

interface FlashcardState {
    decks: FlashcardDeck[];
    isLoading: boolean;
    loadDecks: () => Promise<void>;
    getDeckByNoteId: (noteId: string) => FlashcardDeck | undefined;
    saveDeck: (noteId: string, noteTitle: string, subject: string, cards: { front: string; back: string }[]) => Promise<FlashcardDeck>;
    updateCardMastery: (deckId: string, cardId: string, quality: number) => Promise<void>;
    recordStudySession: (deckId: string) => Promise<void>;
    deleteDeck: (deckId: string) => Promise<void>;
    getDeckStats: (deckId: string) => { mastered: number; learning: number; new: number };
}

export const useFlashcardStore = create<FlashcardState>((set, get) => ({
    decks: [],
    isLoading: false,

    loadDecks: async () => {
        set({ isLoading: true });
        try {
            const saved = await AsyncStorage.getItem(FLASHCARD_DECKS_KEY);
            if (saved) {
                set({ decks: JSON.parse(saved), isLoading: false });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            console.error('Failed to load flashcard decks:', error);
            set({ isLoading: false });
        }
    },

    getDeckByNoteId: (noteId: string) => {
        return get().decks.find(d => d.noteId === noteId);
    },

    saveDeck: async (noteId: string, noteTitle: string, subject: string, cards: { front: string; back: string }[]) => {
        const existingDeck = get().decks.find(d => d.noteId === noteId);

        const newCards: FlashcardCard[] = cards.map(c => ({
            id: Crypto.randomUUID(),
            front: c.front,
            back: c.back,
            easeFactor: 2.5,
            interval: 0,
            repetitions: 0,
            nextReview: Date.now(),
        }));

        const deck: FlashcardDeck = existingDeck ? {
            ...existingDeck,
            cards: newCards, // Replace cards on regenerate
            lastStudied: existingDeck.lastStudied,
        } : {
            id: Crypto.randomUUID(),
            noteId,
            noteTitle,
            subject,
            cards: newCards,
            createdAt: Date.now(),
            lastStudied: null,
            totalReviews: 0,
        };

        const updatedDecks = existingDeck
            ? get().decks.map(d => d.noteId === noteId ? deck : d)
            : [...get().decks, deck];

        await AsyncStorage.setItem(FLASHCARD_DECKS_KEY, JSON.stringify(updatedDecks));
        set({ decks: updatedDecks });
        return deck;
    },

    updateCardMastery: async (deckId: string, cardId: string, quality: number) => {
        const { decks } = get();
        const deckIndex = decks.findIndex(d => d.id === deckId);
        if (deckIndex === -1) return;

        const deck = { ...decks[deckIndex] };
        const cardIndex = deck.cards.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;

        const card = { ...deck.cards[cardIndex] };

        // SM-2 Algorithm
        const safeQuality = Math.max(0, Math.min(5, quality));

        if (safeQuality < 3) {
            card.repetitions = 0;
            card.interval = 1;
        } else {
            card.repetitions += 1;
            if (card.repetitions === 1) {
                card.interval = 1;
            } else if (card.repetitions === 2) {
                card.interval = 6;
            } else {
                card.interval = Math.round(card.interval * card.easeFactor);
            }
            card.easeFactor = Math.max(1.3, card.easeFactor + (0.1 - (5 - safeQuality) * (0.08 + (5 - safeQuality) * 0.02)));
        }

        card.nextReview = Date.now() + card.interval * 24 * 60 * 60 * 1000;

        deck.cards[cardIndex] = card;
        deck.totalReviews += 1;

        const updatedDecks = [...decks];
        updatedDecks[deckIndex] = deck;

        await AsyncStorage.setItem(FLASHCARD_DECKS_KEY, JSON.stringify(updatedDecks));
        set({ decks: updatedDecks });
    },

    recordStudySession: async (deckId: string) => {
        const { decks } = get();
        const updatedDecks = decks.map(d =>
            d.id === deckId ? { ...d, lastStudied: Date.now() } : d
        );

        await AsyncStorage.setItem(FLASHCARD_DECKS_KEY, JSON.stringify(updatedDecks));
        set({ decks: updatedDecks });
    },

    deleteDeck: async (deckId: string) => {
        const updatedDecks = get().decks.filter(d => d.id !== deckId);
        await AsyncStorage.setItem(FLASHCARD_DECKS_KEY, JSON.stringify(updatedDecks));
        set({ decks: updatedDecks });
    },

    getDeckStats: (deckId: string) => {
        const deck = get().decks.find(d => d.id === deckId);
        if (!deck) return { mastered: 0, learning: 0, new: 0 };

        const now = Date.now();
        let mastered = 0, learning = 0, newCards = 0;

        deck.cards.forEach(card => {
            if (card.repetitions === 0) {
                newCards++;
            } else if (card.interval >= 21) { // 21+ days = mastered
                mastered++;
            } else {
                learning++;
            }
        });

        return { mastered, learning, new: newCards };
    },
}));
