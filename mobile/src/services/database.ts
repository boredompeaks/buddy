// SQLite Database Service for MindVault
import * as SQLite from 'expo-sqlite';
import { Note, Task, ExamSchedule, Flashcard, FlashcardDeck, StudySession, WeakTopic, QuizSession } from '../types';

const DB_NAME = 'mindvault.db';

let db: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

// Database error wrapper for consistent error handling
class DatabaseError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = 'DatabaseError';
    }
}

// Safe JSON parse with fallback
function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
    if (!json) return fallback;
    try {
        return JSON.parse(json) as T;
    } catch {
        console.warn('Failed to parse JSON, using fallback:', json);
        return fallback;
    }
}

// ================== DATABASE MIGRATION SYSTEM ==================
// Current schema version - increment when making schema changes
const CURRENT_SCHEMA_VERSION = 1;

/**
 * Migration functions map: version -> upgrade function
 * Each migration upgrades from (version - 1) to (version)
 */
const MIGRATIONS: Record<number, (db: SQLite.SQLiteDatabase) => Promise<void>> = {
    // Version 1: Initial schema (baseline, no migration needed)
    1: async (_db) => {
        // This is the baseline version - tables created in initDatabase
        console.log('[DB Migration] Schema v1 (baseline) initialized');
    },
    // Example future migration:
    // 2: async (db) => {
    //     await db.execAsync(`
    //         ALTER TABLE notes ADD COLUMN syncedAt INTEGER;
    //         CREATE INDEX IF NOT EXISTS idx_notes_synced ON notes(syncedAt);
    //     `);
    //     console.log('[DB Migration] Upgraded to schema v2');
    // },
};

/**
 * Runs any pending database migrations
 */
async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
    // Get current database version
    const result = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const currentVersion = result?.user_version ?? 0;

    if (currentVersion >= CURRENT_SCHEMA_VERSION) {
        console.log(`[DB Migration] Schema up-to-date (v${currentVersion})`);
        return;
    }

    console.log(`[DB Migration] Upgrading from v${currentVersion} to v${CURRENT_SCHEMA_VERSION}`);

    // Run each migration in order
    for (let version = currentVersion + 1; version <= CURRENT_SCHEMA_VERSION; version++) {
        const migration = MIGRATIONS[version];
        if (migration) {
            try {
                await migration(database);
            } catch (error) {
                console.error(`[DB Migration] Failed at v${version}:`, error);
                throw new DatabaseError(`Database migration to v${version} failed`, error);
            }
        }
    }

    // Update schema version
    await database.execAsync(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`);
    console.log(`[DB Migration] Successfully upgraded to v${CURRENT_SCHEMA_VERSION}`);
}

// ================== DATABASE INITIALIZATION ==================

// Initialize database with indexes
export async function initDatabase(): Promise<void> {
    if (isInitialized && db) {
        return; // Prevent re-initialization race condition
    }

    try {
        db = await SQLite.openDatabaseAsync(DB_NAME);

        // Run migrations before schema setup
        await runMigrations(db);

        await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    
    -- Notes table
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT 'General',
      tags TEXT NOT NULL DEFAULT '[]',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      isFavorite INTEGER NOT NULL DEFAULT 0,
      isArchived INTEGER NOT NULL DEFAULT 0
    );
    
    -- Indexes for notes (critical for performance)
    CREATE INDEX IF NOT EXISTS idx_notes_subject ON notes(subject);
    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updatedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_favorite ON notes(isFavorite) WHERE isFavorite = 1;
    CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(isArchived);
    
    -- Attachments table
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      noteId TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      uri TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_attachments_note ON attachments(noteId);
    
    -- Tasks table
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'daily',
      priority TEXT NOT NULL DEFAULT 'medium',
      dueDate INTEGER,
      recurring TEXT,
      linkedExamId TEXT,
      createdAt INTEGER NOT NULL,
      completedAt INTEGER
    );
    
    -- Indexes for tasks
    CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
    CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
    CREATE INDEX IF NOT EXISTS idx_tasks_duedate ON tasks(dueDate);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    
    -- Exam Schedule table
    CREATE TABLE IF NOT EXISTS exam_schedules (
      id TEXT PRIMARY KEY,
      subjectName TEXT NOT NULL,
      examDate INTEGER NOT NULL,
      chapters TEXT NOT NULL DEFAULT '[]',
      totalSyllabus INTEGER NOT NULL DEFAULT 100,
      completedSyllabus INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_exams_date ON exam_schedules(examDate ASC);
    
    -- Flashcard Decks table
    CREATE TABLE IF NOT EXISTS flashcard_decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      noteId TEXT,
      cardCount INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL
    );
    
    -- Flashcards table
    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      deckId TEXT NOT NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      easeFactor REAL NOT NULL DEFAULT 2.5,
      interval INTEGER NOT NULL DEFAULT 0,
      repetitions INTEGER NOT NULL DEFAULT 0,
      nextReview INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (deckId) REFERENCES flashcard_decks(id) ON DELETE CASCADE
    );
    
    -- Indexes for flashcards (SM-2 review queries)
    CREATE INDEX IF NOT EXISTS idx_flashcards_deck ON flashcards(deckId);
    CREATE INDEX IF NOT EXISTS idx_flashcards_review ON flashcards(nextReview);
    
    -- Study Sessions table
    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      duration INTEGER NOT NULL,
      type TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_sessions_timestamp ON study_sessions(timestamp DESC);
    
    -- Weak Topics table
    CREATE TABLE IF NOT EXISTS weak_topics (
      id TEXT PRIMARY KEY,
      topic TEXT NOT NULL,
      subject TEXT NOT NULL,
      wrongCount INTEGER NOT NULL DEFAULT 1,
      lastAttempt INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_weaktopics_subject ON weak_topics(subject);
    
    -- Quiz Sessions table
    CREATE TABLE IF NOT EXISTS quiz_sessions (
      id TEXT PRIMARY KEY,
      noteId TEXT,
      subject TEXT NOT NULL,
      questions TEXT NOT NULL,
      answers TEXT NOT NULL,
      score INTEGER NOT NULL,
      completedAt INTEGER NOT NULL,
      weakTopics TEXT NOT NULL DEFAULT '[]'
    );
    
    CREATE INDEX IF NOT EXISTS idx_quiz_completed ON quiz_sessions(completedAt DESC);
    
    -- Chat Messages table
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      noteId TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_chat_note ON chat_messages(noteId);
  `);

        isInitialized = true;
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw new DatabaseError('Failed to initialize database', error);
    }
}

// Get database instance
function getDb(): SQLite.SQLiteDatabase {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

// ================== NOTES ==================
export async function getAllNotes(): Promise<Note[]> {
    const database = getDb();
    try {
        const rows = await database.getAllAsync<any>('SELECT * FROM notes WHERE isArchived = 0 ORDER BY updatedAt DESC');
        return rows.map(row => ({
            ...row,
            tags: safeJsonParse<string[]>(row.tags, []),
            isFavorite: Boolean(row.isFavorite),
            isArchived: Boolean(row.isArchived),
        }));
    } catch (error) {
        console.error('Failed to get notes:', error);
        throw new DatabaseError('Failed to load notes', error);
    }
}

export async function getNoteById(id: string): Promise<Note | null> {
    if (!id || typeof id !== 'string') return null;
    const database = getDb();
    try {
        const row = await database.getFirstAsync<any>('SELECT * FROM notes WHERE id = ?', [id]);
        if (!row) return null;
        return {
            ...row,
            tags: safeJsonParse<string[]>(row.tags, []),
            isFavorite: Boolean(row.isFavorite),
            isArchived: Boolean(row.isArchived),
        };
    } catch (error) {
        console.error('Failed to get note by id:', error);
        return null;
    }
}

export async function saveNote(note: Note): Promise<void> {
    if (!note || !note.id) throw new DatabaseError('Invalid note: missing id');
    const database = getDb();
    try {
        await database.runAsync(
            `INSERT OR REPLACE INTO notes (id, title, content, subject, tags, createdAt, updatedAt, isFavorite, isArchived)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                note.id,
                note.title || 'Untitled',
                note.content || '',
                note.subject || 'General',
                JSON.stringify(note.tags || []),
                note.createdAt || Date.now(),
                note.updatedAt || Date.now(),
                note.isFavorite ? 1 : 0,
                note.isArchived ? 1 : 0
            ]
        );
    } catch (error) {
        console.error('Failed to save note:', error);
        throw new DatabaseError('Failed to save note', error);
    }
}

export async function deleteNote(id: string): Promise<void> {
    if (!id) return;
    const database = getDb();
    try {
        await database.runAsync('DELETE FROM notes WHERE id = ?', [id]);
    } catch (error) {
        console.error('Failed to delete note:', error);
        throw new DatabaseError('Failed to delete note', error);
    }
}

export async function searchNotes(query: string): Promise<Note[]> {
    if (!query || typeof query !== 'string') return [];
    const database = getDb();
    try {
        // Sanitize query to prevent SQL injection edge cases
        const sanitizedQuery = query.replace(/[%_]/g, '\\$&');
        const rows = await database.getAllAsync<any>(
            `SELECT * FROM notes WHERE isArchived = 0 AND (title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\') ORDER BY updatedAt DESC`,
            [`%${sanitizedQuery}%`, `%${sanitizedQuery}%`]
        );
        return rows.map(row => ({
            ...row,
            tags: safeJsonParse<string[]>(row.tags, []),
            isFavorite: Boolean(row.isFavorite),
            isArchived: Boolean(row.isArchived),
        }));
    } catch (error) {
        console.error('Failed to search notes:', error);
        return [];
    }
}

// ================== TASKS ==================
export async function getAllTasks(): Promise<Task[]> {
    const database = getDb();
    try {
        const rows = await database.getAllAsync<any>('SELECT * FROM tasks ORDER BY dueDate ASC, createdAt DESC');
        return rows.map(row => ({
            ...row,
            completed: Boolean(row.completed),
            recurring: safeJsonParse(row.recurring, undefined),
        }));
    } catch (error) {
        console.error('Failed to get tasks:', error);
        throw new DatabaseError('Failed to load tasks', error);
    }
}

export async function saveTask(task: Task): Promise<void> {
    if (!task || !task.id) throw new DatabaseError('Invalid task: missing id');
    const database = getDb();
    try {
        await database.runAsync(
            `INSERT OR REPLACE INTO tasks (id, text, completed, category, priority, dueDate, recurring, linkedExamId, createdAt, completedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                task.id,
                task.text || '',
                task.completed ? 1 : 0,
                task.category || 'daily',
                task.priority || 'medium',
                task.dueDate || null,
                task.recurring ? JSON.stringify(task.recurring) : null,
                task.linkedExamId || null,
                task.createdAt || Date.now(),
                task.completedAt || null
            ]
        );
    } catch (error) {
        console.error('Failed to save task:', error);
        throw new DatabaseError('Failed to save task', error);
    }
}

export async function deleteTask(id: string): Promise<void> {
    if (!id) return;
    const database = getDb();
    try {
        await database.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
    } catch (error) {
        console.error('Failed to delete task:', error);
        throw new DatabaseError('Failed to delete task', error);
    }
}

export async function getTasksByCategory(category: 'daily' | 'weekly' | 'exam'): Promise<Task[]> {
    const validCategories = ['daily', 'weekly', 'exam'];
    if (!validCategories.includes(category)) return [];
    const database = getDb();
    try {
        const rows = await database.getAllAsync<any>('SELECT * FROM tasks WHERE category = ? ORDER BY dueDate ASC', [category]);
        return rows.map(row => ({
            ...row,
            completed: Boolean(row.completed),
            recurring: safeJsonParse(row.recurring, undefined),
        }));
    } catch (error) {
        console.error('Failed to get tasks by category:', error);
        return [];
    }
}

// ================== EXAM SCHEDULE ==================
export async function getAllExamSchedules(): Promise<ExamSchedule[]> {
    const database = getDb();
    try {
        const rows = await database.getAllAsync<any>('SELECT * FROM exam_schedules ORDER BY examDate ASC');
        return rows.map(row => ({
            ...row,
            chapters: safeJsonParse<any[]>(row.chapters, []),
        }));
    } catch (error) {
        console.error('Failed to get exam schedules:', error);
        throw new DatabaseError('Failed to load exam schedules', error);
    }
}

export async function saveExamSchedule(exam: ExamSchedule): Promise<void> {
    if (!exam || !exam.id) throw new DatabaseError('Invalid exam: missing id');
    const database = getDb();
    try {
        await database.runAsync(
            `INSERT OR REPLACE INTO exam_schedules (id, subjectName, examDate, chapters, totalSyllabus, completedSyllabus, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                exam.id,
                exam.subjectName || 'Untitled',
                exam.examDate || Date.now(),
                JSON.stringify(exam.chapters || []),
                exam.totalSyllabus ?? 100,
                exam.completedSyllabus ?? 0,
                exam.createdAt || Date.now()
            ]
        );
    } catch (error) {
        console.error('Failed to save exam schedule:', error);
        throw new DatabaseError('Failed to save exam schedule', error);
    }
}

export async function deleteExamSchedule(id: string): Promise<void> {
    if (!id) return;
    const database = getDb();
    try {
        await database.runAsync('DELETE FROM exam_schedules WHERE id = ?', [id]);
    } catch (error) {
        console.error('Failed to delete exam schedule:', error);
        throw new DatabaseError('Failed to delete exam schedule', error);
    }
}

// ================== FLASHCARDS ==================
export async function getAllFlashcardDecks(): Promise<FlashcardDeck[]> {
    const database = getDb();
    try {
        return await database.getAllAsync<FlashcardDeck>('SELECT * FROM flashcard_decks ORDER BY createdAt DESC');
    } catch (error) {
        console.error('Failed to get flashcard decks:', error);
        return [];
    }
}

export async function saveFlashcardDeck(deck: FlashcardDeck): Promise<void> {
    if (!deck || !deck.id) throw new DatabaseError('Invalid deck: missing id');
    const database = getDb();
    try {
        await database.runAsync(
            `INSERT OR REPLACE INTO flashcard_decks (id, name, subject, noteId, cardCount, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
            [deck.id, deck.name || 'Untitled', deck.subject || 'General', deck.noteId || null, deck.cardCount ?? 0, deck.createdAt || Date.now()]
        );
    } catch (error) {
        console.error('Failed to save flashcard deck:', error);
        throw new DatabaseError('Failed to save flashcard deck', error);
    }
}

export async function getFlashcardsByDeck(deckId: string): Promise<Flashcard[]> {
    if (!deckId) return [];
    const database = getDb();
    try {
        return await database.getAllAsync<Flashcard>('SELECT * FROM flashcards WHERE deckId = ?', [deckId]);
    } catch (error) {
        console.error('Failed to get flashcards:', error);
        return [];
    }
}

export async function saveFlashcard(card: Flashcard): Promise<void> {
    if (!card || !card.id || !card.deckId) throw new DatabaseError('Invalid flashcard: missing id or deckId');
    const database = getDb();
    try {
        await database.runAsync(
            `INSERT OR REPLACE INTO flashcards (id, deckId, front, back, easeFactor, interval, repetitions, nextReview, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                card.id,
                card.deckId,
                card.front || '',
                card.back || '',
                card.easeFactor ?? 2.5,
                card.interval ?? 0,
                card.repetitions ?? 0,
                card.nextReview ?? Date.now(),
                card.createdAt ?? Date.now()
            ]
        );
    } catch (error) {
        console.error('Failed to save flashcard:', error);
        throw new DatabaseError('Failed to save flashcard', error);
    }
}

export async function getDueFlashcards(deckId: string): Promise<Flashcard[]> {
    if (!deckId) return [];
    const database = getDb();
    try {
        const now = Date.now();
        return await database.getAllAsync<Flashcard>(
            'SELECT * FROM flashcards WHERE deckId = ? AND nextReview <= ? ORDER BY nextReview ASC',
            [deckId, now]
        );
    } catch (error) {
        console.error('Failed to get due flashcards:', error);
        return [];
    }
}

// ================== STUDY SESSIONS ==================
export async function saveStudySession(session: StudySession): Promise<void> {
    if (!session || !session.id) throw new DatabaseError('Invalid study session: missing id');
    const database = getDb();
    try {
        await database.runAsync(
            `INSERT INTO study_sessions (id, subject, duration, type, timestamp) VALUES (?, ?, ?, ?, ?)`,
            [session.id, session.subject || 'General', session.duration ?? 0, session.type || 'general', session.timestamp ?? Date.now()]
        );
    } catch (error) {
        console.error('Failed to save study session:', error);
        throw new DatabaseError('Failed to save study session', error);
    }
}

export async function getStudySessions(days: number = 30): Promise<StudySession[]> {
    const safeDays = Math.max(1, Math.min(365, days)); // Limit to 1-365 days
    const database = getDb();
    try {
        const cutoff = Date.now() - safeDays * 24 * 60 * 60 * 1000;
        return await database.getAllAsync<StudySession>(
            'SELECT * FROM study_sessions WHERE timestamp > ? ORDER BY timestamp DESC',
            [cutoff]
        );
    } catch (error) {
        console.error('Failed to get study sessions:', error);
        return [];
    }
}

// ================== WEAK TOPICS ==================
export async function getWeakTopics(): Promise<WeakTopic[]> {
    const database = getDb();
    try {
        return await database.getAllAsync<WeakTopic>('SELECT * FROM weak_topics ORDER BY wrongCount DESC');
    } catch (error) {
        console.error('Failed to get weak topics:', error);
        return [];
    }
}

export async function addWeakTopic(topic: WeakTopic): Promise<void> {
    if (!topic || !topic.topic || !topic.subject) return;
    const database = getDb();
    try {
        const existing = await database.getFirstAsync<WeakTopic>(
            'SELECT * FROM weak_topics WHERE topic = ? AND subject = ?',
            [topic.topic, topic.subject]
        );

        if (existing) {
            await database.runAsync(
                'UPDATE weak_topics SET wrongCount = wrongCount + 1, lastAttempt = ? WHERE id = ?',
                [topic.lastAttempt ?? Date.now(), existing.id]
            );
        } else {
            await database.runAsync(
                'INSERT INTO weak_topics (id, topic, subject, wrongCount, lastAttempt) VALUES (?, ?, ?, ?, ?)',
                [topic.id || `wt-${Date.now()}`, topic.topic, topic.subject, topic.wrongCount ?? 1, topic.lastAttempt ?? Date.now()]
            );
        }
    } catch (error) {
        console.error('Failed to add weak topic:', error);
        // Don't throw - weak topics are non-critical
    }
}

export async function removeWeakTopic(id: string): Promise<void> {
    if (!id) return;
    const database = getDb();
    try {
        await database.runAsync('DELETE FROM weak_topics WHERE id = ?', [id]);
    } catch (error) {
        console.error('Failed to remove weak topic:', error);
    }
}

// ================== QUIZ SESSIONS ==================
export async function saveQuizSession(session: QuizSession): Promise<void> {
    if (!session || !session.id) throw new DatabaseError('Invalid quiz session: missing id');
    const database = getDb();
    try {
        await database.runAsync(
            `INSERT INTO quiz_sessions (id, noteId, subject, questions, answers, score, completedAt, weakTopics)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                session.id,
                session.noteId || null,
                session.subject || 'General',
                JSON.stringify(session.questions || []),
                JSON.stringify(session.answers || []),
                session.score ?? 0,
                session.completedAt ?? Date.now(),
                JSON.stringify(session.weakTopics || [])
            ]
        );
    } catch (error) {
        console.error('Failed to save quiz session:', error);
        throw new DatabaseError('Failed to save quiz session', error);
    }
}

export async function getQuizSessions(limit: number = 50): Promise<QuizSession[]> {
    const safeLimit = Math.max(1, Math.min(500, limit)); // Limit to 1-500
    const database = getDb();
    try {
        const rows = await database.getAllAsync<any>(
            'SELECT * FROM quiz_sessions ORDER BY completedAt DESC LIMIT ?',
            [safeLimit]
        );
        return rows.map(row => ({
            ...row,
            questions: safeJsonParse<any[]>(row.questions, []),
            answers: safeJsonParse<any[]>(row.answers, []),
            weakTopics: safeJsonParse<string[]>(row.weakTopics, []),
        }));
    } catch (error) {
        console.error('Failed to get quiz sessions:', error);
        return [];
    }
}
