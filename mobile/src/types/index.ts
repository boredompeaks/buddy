// Types for MindVault Mobile App

// ================== NOTES ==================
export interface Note {
    id: string;
    title: string;
    content: string;
    subject: string;
    tags: string[];
    createdAt: number;
    updatedAt: number;
    isFavorite: boolean;
    isArchived: boolean;
}

export interface Attachment {
    id: string;
    noteId: string;
    type: 'pdf' | 'image';
    name: string;
    uri: string;
    size: number;
    createdAt: number;
}

// ================== TASKS ==================
export interface Task {
    id: string;
    text: string;
    completed: boolean;
    category: 'daily' | 'weekly' | 'exam';
    priority: 'low' | 'medium' | 'high';
    dueDate?: number;
    recurring?: RecurringConfig;
    linkedExamId?: string;
    createdAt: number;
    completedAt?: number;
}

export interface RecurringConfig {
    type: 'daily' | 'weekly' | 'monthly';
    interval: number; // every N days/weeks/months
    endDate?: number;
}

// ================== EXAM SCHEDULE ==================
export interface ExamSchedule {
    id: string;
    subjectName: string;
    examDate: number;
    chapters: Chapter[];
    totalSyllabus: number;
    completedSyllabus: number;
    createdAt: number;
}

export interface Chapter {
    id: string;
    name: string;
    weight: number; // 1-10 importance
    estimatedHours: number;
    completed: boolean;
    linkedNoteIds: string[];
}

// ================== FLASHCARDS ==================
export interface Flashcard {
    id: string;
    deckId: string;
    front: string;
    back: string;
    // SM-2 algorithm fields
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReview: number;
    createdAt: number;
}

export interface FlashcardDeck {
    id: string;
    name: string;
    subject: string;
    noteId?: string;
    cardCount: number;
    createdAt: number;
}

// ================== QUIZ ==================
export interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizSession {
    id: string;
    noteId?: string;
    subject: string;
    questions: QuizQuestion[];
    answers: number[];
    score: number;
    completedAt: number;
    weakTopics: string[];
}

// ================== STUDY ANALYTICS ==================
export interface StudySession {
    id: string;
    subject: string;
    duration: number; // minutes
    type: 'notes' | 'flashcards' | 'quiz' | 'paper';
    timestamp: number;
}

export interface WeakTopic {
    id: string;
    topic: string;
    subject: string;
    wrongCount: number;
    lastAttempt: number;
}

// ================== EXAM PATTERNS ==================
export interface ExamPattern {
    id: string;
    name: string;
    board: 'ICSE' | 'CBSE' | 'Custom';
    totalMarks: number;
    duration: string;
    sections: ExamSection[];
    isBuiltIn: boolean;
}

export interface ExamSection {
    name: string;
    type: 'mcq' | 'short' | 'long' | 'numerical';
    marks: number;
    questions: number;
}

// ================== CHAT ==================
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    timestamp: number;
    noteId?: string;
}

// ================== SETTINGS ==================
export interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    notificationsEnabled: boolean;
    dailyReminderTime?: string;
    defaultExamPattern: string;
    groqApiKey?: string;
    geminiApiKey?: string;
}

// ================== STREAK ==================
export interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastStudyDate: string; // YYYY-MM-DD
    studyDays: string[]; // Array of YYYY-MM-DD dates
}

// ================== NAVIGATION ==================
export type RootStackParamList = {
    '(tabs)': undefined;
    'note/[id]': { id: string };
    'modals/ai-chat': { noteId?: string };
    'modals/deep-study': { noteId: string };
    'modals/paper-generator': { subject?: string };
};
