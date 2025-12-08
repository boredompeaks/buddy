// App Constants

export const SUBJECTS = [
    'Physics',
    'Chemistry',
    'Biology',
    'Mathematics',
    'History',
    'Geography',
    'English',
    'Hindi',
    'Computer Science',
    'Economics',
    'General',
] as const;

export type Subject = typeof SUBJECTS[number];

// Theme Colors
export const COLORS = {
    light: {
        primary: '#6366f1',
        primaryLight: '#818cf8',
        primaryDark: '#4f46e5',
        secondary: '#8b5cf6',
        accent: '#ec4899',
        background: '#f8fafc',
        surface: '#ffffff',
        surfaceVariant: '#f1f5f9',
        text: '#1e293b',
        textSecondary: '#64748b',
        textMuted: '#94a3b8',
        border: '#e2e8f0',
        error: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',
    },
    dark: {
        primary: '#818cf8',
        primaryLight: '#a5b4fc',
        primaryDark: '#6366f1',
        secondary: '#a78bfa',
        accent: '#f472b6',
        background: '#0f172a',
        surface: '#1e293b',
        surfaceVariant: '#334155',
        text: '#f1f5f9',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
        border: '#334155',
        error: '#f87171',
        success: '#4ade80',
        warning: '#fbbf24',
    },
};

// AI Models
export const AI_CONFIG = {
    groq: {
        model: 'llama-3.3-70b-versatile',
        tasks: ['chat', 'quiz', 'summary', 'classify'],
    },
    gemini: {
        flashModel: 'gemini-2.5-flash-preview-05-20', // Updated to 2.5 Flash per spec
        proModel: 'gemini-2.5-pro-preview-05-06',
        tasks: ['pdf', 'paper', 'grade', 'studyPlan', 'schedule'],
    },
};


// Storage Keys
export const STORAGE_KEYS = {
    settings: 'mindvault_settings',
    streak: 'mindvault_streak',
    onboarded: 'mindvault_onboarded',
    GROQ_API_KEY: 'groq_api_key',
    GEMINI_API_KEY: 'gemini_api_key',
};

// Built-in Exam Patterns
export const EXAM_PATTERNS = {
    icse: {
        id: 'icse-2024',
        name: 'ICSE Board 2024',
        board: 'ICSE' as const,
        totalMarks: 80,
        duration: '2 hours',
        sections: [
            { name: 'Section A', type: 'mcq' as const, marks: 20, questions: 10 },
            { name: 'Section B', type: 'short' as const, marks: 30, questions: 6 },
            { name: 'Section C', type: 'long' as const, marks: 30, questions: 3 },
        ],
        isBuiltIn: true,
    },
    cbse: {
        id: 'cbse-2024',
        name: 'CBSE Board 2024',
        board: 'CBSE' as const,
        totalMarks: 80,
        duration: '3 hours',
        sections: [
            { name: 'Section A', type: 'mcq' as const, marks: 20, questions: 20 },
            { name: 'Section B', type: 'short' as const, marks: 24, questions: 6 },
            { name: 'Section C', type: 'long' as const, marks: 36, questions: 6 },
        ],
        isBuiltIn: true,
    },
};

// Priority Colors
export const PRIORITY_COLORS = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#ef4444',
};

// Animation Durations
export const ANIMATION = {
    fast: 150,
    normal: 300,
    slow: 500,
};
