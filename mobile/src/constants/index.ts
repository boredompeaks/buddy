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

// Theme Colors - MindVault Modern (Eye Comfort Focus)
export const COLORS = {
    light: {
        // We are enforcing a "Dark Mode" aesthetic for Eye Comfort even in light mode,
        // but keeping high contrast for the light theme just in case.
        primary: '#6366f1', // Indigo 500
        primaryLight: '#818cf8',
        primaryDark: '#4f46e5',
        secondary: '#a855f7', // Purple 500
        accent: '#f43f5e', // Rose 500
        background: '#f8fafc', // Slate 50
        surface: '#ffffff',
        surfaceVariant: '#f1f5f9',
        surfaceHighlight: '#e2e8f0',
        text: '#0f172a', // Slate 900
        textSecondary: '#64748b', // Slate 500
        textMuted: '#94a3b8',
        border: '#e2e8f0',
        error: '#ef4444',
        success: '#10b981', // Emerald 500
        warning: '#f59e0b',
    },
    dark: {
        primary: '#818cf8', // Indigo 400
        primaryLight: '#a5b4fc',
        primaryDark: '#6366f1',
        secondary: '#c084fc', // Purple 400
        accent: '#fb7185', // Rose 400
        background: '#0f172a', // Slate 900 (Deep Midnight Blue)
        surface: 'rgba(30, 41, 59, 0.7)', // Slate 800 with opacity for Glass
        surfaceVariant: 'rgba(51, 65, 85, 0.5)',
        surfaceHighlight: 'rgba(71, 85, 105, 0.4)',
        text: '#f1f5f9', // Slate 100
        textSecondary: '#cbd5e1', // Slate 300
        textMuted: '#94a3b8', // Slate 400
        border: 'rgba(148, 163, 184, 0.2)', // Slate 400 low opacity
        error: '#f87171',
        success: '#34d399',
        warning: '#fbbf24',
    },
};

// Exam Rules & Constants
export const EXAM_RULES = {
    READING_TIME_MINUTES: 15,
    WRITING_TIME_HOURS: {
        DEFAULT: 2,
        LONG_SUBJECTS: 3, // For Maths and Hindi
    },
    LONG_SUBJECTS_LIST: ['Mathematics', 'Hindi'] as const,
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

// Exam Timer Constants
export const EXAM_TIMER = {
    DEFAULT_DURATION_SECONDS: 180 * 60,  // 3 hours
    WARNING_THRESHOLD_SECONDS: 300,      // 5 minutes - yellow warning
    URGENCY_THRESHOLD_SECONDS: 60,       // 1 minute - red urgency
};

