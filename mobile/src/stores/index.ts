// Zustand Stores for MindVault
import { create } from 'zustand';
import { Note, Task, ExamSchedule, AppSettings, StreakData } from '../types';
import * as db from '../services/database';
import { STORAGE_KEYS } from '../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isToday, isYesterday, parseISO, differenceInDays } from 'date-fns';
import * as Crypto from 'expo-crypto';

// ================== NOTES STORE ==================
interface NotesState {
    notes: Note[];
    isLoading: boolean;
    error: string | null;
    searchQuery: string;
    selectedSubject: string | null;

    // Actions
    loadNotes: () => Promise<void>;
    addNote: (note: Partial<Note>) => Promise<Note>;
    updateNote: (note: Note) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
    setSearchQuery: (query: string) => void;
    setSelectedSubject: (subject: string | null) => void;
    clearError: () => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
    notes: [],
    isLoading: false,
    error: null,
    searchQuery: '',
    selectedSubject: null,

    loadNotes: async () => {
        set({ isLoading: true, error: null });
        try {
            const notes = await db.getAllNotes();
            set({ notes, isLoading: false });
        } catch (error) {
            console.error('Failed to load notes:', error);
            set({ isLoading: false, error: 'Failed to load notes. Tap to retry.' });
        }
    },

    addNote: async (partial) => {
        const note: Note = {
            id: Crypto.randomUUID(),
            title: partial.title || 'Untitled Note',
            content: partial.content || '',
            subject: partial.subject || 'General',
            tags: partial.tags || [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isFavorite: false,
            isArchived: false,
            ...partial,
        };
        await db.saveNote(note);
        set(state => ({ notes: [note, ...state.notes] }));
        return note;
    },

    updateNote: async (note) => {
        const updated = { ...note, updatedAt: Date.now() };
        await db.saveNote(updated);
        set(state => ({
            notes: state.notes.map(n => n.id === note.id ? updated : n),
        }));
    },

    deleteNote: async (id) => {
        await db.deleteNote(id);
        set(state => ({ notes: state.notes.filter(n => n.id !== id) }));
    },

    setSearchQuery: (query) => set({ searchQuery: query }),
    setSelectedSubject: (subject) => set({ selectedSubject: subject }),
    clearError: () => set({ error: null }),
}));

// ================== TASKS STORE ==================
interface TasksState {
    tasks: Task[];
    isLoading: boolean;
    activeCategory: 'daily' | 'weekly' | 'exam';

    loadTasks: () => Promise<void>;
    addTask: (task: Partial<Task>) => Promise<Task>;
    updateTask: (task: Task) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    toggleTask: (id: string) => Promise<void>;
    setActiveCategory: (category: 'daily' | 'weekly' | 'exam') => void;
}

export const useTasksStore = create<TasksState>((set, get) => ({
    tasks: [],
    isLoading: false,
    activeCategory: 'daily',

    loadTasks: async () => {
        set({ isLoading: true });
        try {
            const tasks = await db.getAllTasks();
            set({ tasks, isLoading: false });
        } catch (error) {
            console.error('Failed to load tasks:', error);
            set({ isLoading: false });
        }
    },

    addTask: async (partial) => {
        const task: Task = {
            id: Crypto.randomUUID(),
            text: partial.text || '',
            completed: false,
            category: partial.category || get().activeCategory,
            priority: partial.priority || 'medium',
            createdAt: Date.now(),
            ...partial,
        };
        await db.saveTask(task);
        set(state => ({ tasks: [...state.tasks, task] }));
        return task;
    },

    updateTask: async (task) => {
        await db.saveTask(task);
        set(state => ({
            tasks: state.tasks.map(t => t.id === task.id ? task : t),
        }));
    },

    deleteTask: async (id) => {
        await db.deleteTask(id);
        set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }));
    },

    toggleTask: async (id) => {
        const { tasks, updateTask } = get();
        const task = tasks.find(t => t.id === id);
        if (task) {
            await updateTask({
                ...task,
                completed: !task.completed,
                completedAt: !task.completed ? Date.now() : undefined,
            });
        }
    },

    setActiveCategory: (category) => set({ activeCategory: category }),
}));

// ================== EXAM SCHEDULE STORE ==================
interface ExamState {
    exams: ExamSchedule[];
    isLoading: boolean;

    loadExams: () => Promise<void>;
    addExam: (exam: Partial<ExamSchedule>) => Promise<ExamSchedule>;
    updateExam: (exam: ExamSchedule) => Promise<void>;
    deleteExam: (id: string) => Promise<void>;
}

export const useExamStore = create<ExamState>((set) => ({
    exams: [],
    isLoading: false,

    loadExams: async () => {
        set({ isLoading: true });
        try {
            const exams = await db.getAllExamSchedules();
            set({ exams, isLoading: false });
        } catch (error) {
            console.error('Failed to load exams:', error);
            set({ isLoading: false });
        }
    },

    addExam: async (partial) => {
        const exam: ExamSchedule = {
            id: Crypto.randomUUID(),
            subjectName: partial.subjectName || '',
            examDate: partial.examDate || Date.now(),
            chapters: partial.chapters || [],
            totalSyllabus: 100,
            completedSyllabus: 0,
            createdAt: Date.now(),
            ...partial,
        };
        await db.saveExamSchedule(exam);
        set(state => ({ exams: [...state.exams, exam] }));
        return exam;
    },

    updateExam: async (exam) => {
        await db.saveExamSchedule(exam);
        set(state => ({
            exams: state.exams.map(e => e.id === exam.id ? exam : e),
        }));
    },

    deleteExam: async (id) => {
        await db.deleteExamSchedule(id);
        set(state => ({ exams: state.exams.filter(e => e.id !== id) }));
    },
}));

// ================== SETTINGS STORE ==================
interface SettingsState {
    settings: AppSettings;
    isLoading: boolean;

    loadSettings: () => Promise<void>;
    updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
}

const defaultSettings: AppSettings = {
    theme: 'system',
    notificationsEnabled: true,
    defaultExamPattern: 'icse-2024',
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
    settings: defaultSettings,
    isLoading: false,

    loadSettings: async () => {
        set({ isLoading: true });
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEYS.settings);
            if (stored) {
                set({ settings: { ...defaultSettings, ...JSON.parse(stored) }, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            set({ isLoading: false });
        }
    },

    updateSettings: async (partial) => {
        const updated = { ...get().settings, ...partial };
        await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(updated));
        set({ settings: updated });
    },
}));

// ================== STREAK STORE ==================
interface StreakState {
    streak: StreakData;
    isLoading: boolean;

    loadStreak: () => Promise<void>;
    recordStudyDay: () => Promise<void>;
}

const defaultStreak: StreakData = {
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: '',
    studyDays: [],
};

export const useStreakStore = create<StreakState>((set, get) => ({
    streak: defaultStreak,
    isLoading: false,

    loadStreak: async () => {
        set({ isLoading: true });
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEYS.streak);
            if (stored) {
                const streak = JSON.parse(stored) as StreakData;
                // Check if streak should be reset
                if (streak.lastStudyDate) {
                    const lastDate = parseISO(streak.lastStudyDate);
                    const daysDiff = differenceInDays(new Date(), lastDate);
                    if (daysDiff > 1) {
                        // Streak broken
                        streak.currentStreak = 0;
                    }
                }
                set({ streak, isLoading: false });
            } else {
                set({ isLoading: false });
            }
        } catch (error) {
            console.error('Failed to load streak:', error);
            set({ isLoading: false });
        }
    },

    recordStudyDay: async () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const { streak } = get();

        // Already recorded today
        if (streak.lastStudyDate === today) return;

        let newStreak = 1;
        if (streak.lastStudyDate) {
            const lastDate = parseISO(streak.lastStudyDate);
            if (isYesterday(lastDate)) {
                newStreak = streak.currentStreak + 1;
            }
        }

        const updated: StreakData = {
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, streak.longestStreak),
            lastStudyDate: today,
            studyDays: [...streak.studyDays.slice(-365), today], // Keep last year
        };

        await AsyncStorage.setItem(STORAGE_KEYS.streak, JSON.stringify(updated));
        set({ streak: updated });
    },
}));
