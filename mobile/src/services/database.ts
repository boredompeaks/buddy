// SQLite Database Service for MindVault
import * as SQLite from 'expo-sqlite';
import { Note, Task, ExamSchedule, Flashcard, FlashcardDeck, StudySession, WeakTopic, QuizSession } from '../types';

const DB_NAME = 'mindvault.db';

let db: SQLite.SQLiteDatabase | null = null;

// Initialize database
export async function initDatabase(): Promise<void> {
    db = await SQLite.openDatabaseAsync(DB_NAME);

    await db.execAsync(`
    PRAGMA journal_mode = WAL;
    
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
    
    -- Study Sessions table
    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      duration INTEGER NOT NULL,
      type TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
    
    -- Weak Topics table
    CREATE TABLE IF NOT EXISTS weak_topics (
      id TEXT PRIMARY KEY,
      topic TEXT NOT NULL,
      subject TEXT NOT NULL,
      wrongCount INTEGER NOT NULL DEFAULT 1,
      lastAttempt INTEGER NOT NULL
    );
    
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
    
    -- Chat Messages table
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      noteId TEXT
    );
  `);
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
    const rows = await database.getAllAsync<any>('SELECT * FROM notes WHERE isArchived = 0 ORDER BY updatedAt DESC');
    return rows.map(row => ({
        ...row,
        tags: JSON.parse(row.tags || '[]'),
        isFavorite: Boolean(row.isFavorite),
        isArchived: Boolean(row.isArchived),
    }));
}

export async function getNoteById(id: string): Promise<Note | null> {
    const database = getDb();
    const row = await database.getFirstAsync<any>('SELECT * FROM notes WHERE id = ?', [id]);
    if (!row) return null;
    return {
        ...row,
        tags: JSON.parse(row.tags || '[]'),
        isFavorite: Boolean(row.isFavorite),
        isArchived: Boolean(row.isArchived),
    };
}

export async function saveNote(note: Note): Promise<void> {
    const database = getDb();
    await database.runAsync(
        `INSERT OR REPLACE INTO notes (id, title, content, subject, tags, createdAt, updatedAt, isFavorite, isArchived)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [note.id, note.title, note.content, note.subject, JSON.stringify(note.tags), note.createdAt, note.updatedAt, note.isFavorite ? 1 : 0, note.isArchived ? 1 : 0]
    );
}

export async function deleteNote(id: string): Promise<void> {
    const database = getDb();
    await database.runAsync('DELETE FROM notes WHERE id = ?', [id]);
}

export async function searchNotes(query: string): Promise<Note[]> {
    const database = getDb();
    const rows = await database.getAllAsync<any>(
        `SELECT * FROM notes WHERE isArchived = 0 AND (title LIKE ? OR content LIKE ?) ORDER BY updatedAt DESC`,
        [`%${query}%`, `%${query}%`]
    );
    return rows.map(row => ({
        ...row,
        tags: JSON.parse(row.tags || '[]'),
        isFavorite: Boolean(row.isFavorite),
        isArchived: Boolean(row.isArchived),
    }));
}

// ================== TASKS ==================
export async function getAllTasks(): Promise<Task[]> {
    const database = getDb();
    const rows = await database.getAllAsync<any>('SELECT * FROM tasks ORDER BY dueDate ASC, createdAt DESC');
    return rows.map(row => ({
        ...row,
        completed: Boolean(row.completed),
        recurring: row.recurring ? JSON.parse(row.recurring) : undefined,
    }));
}

export async function saveTask(task: Task): Promise<void> {
    const database = getDb();
    await database.runAsync(
        `INSERT OR REPLACE INTO tasks (id, text, completed, category, priority, dueDate, recurring, linkedExamId, createdAt, completedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [task.id, task.text, task.completed ? 1 : 0, task.category, task.priority, task.dueDate || null, task.recurring ? JSON.stringify(task.recurring) : null, task.linkedExamId || null, task.createdAt, task.completedAt || null]
    );
}

export async function deleteTask(id: string): Promise<void> {
    const database = getDb();
    await database.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
}

export async function getTasksByCategory(category: 'daily' | 'weekly' | 'exam'): Promise<Task[]> {
    const database = getDb();
    const rows = await database.getAllAsync<any>('SELECT * FROM tasks WHERE category = ? ORDER BY dueDate ASC', [category]);
    return rows.map(row => ({
        ...row,
        completed: Boolean(row.completed),
        recurring: row.recurring ? JSON.parse(row.recurring) : undefined,
    }));
}

// ================== EXAM SCHEDULE ==================
export async function getAllExamSchedules(): Promise<ExamSchedule[]> {
    const database = getDb();
    const rows = await database.getAllAsync<any>('SELECT * FROM exam_schedules ORDER BY examDate ASC');
    return rows.map(row => ({
        ...row,
        chapters: JSON.parse(row.chapters || '[]'),
    }));
}

export async function saveExamSchedule(exam: ExamSchedule): Promise<void> {
    const database = getDb();
    await database.runAsync(
        `INSERT OR REPLACE INTO exam_schedules (id, subjectName, examDate, chapters, totalSyllabus, completedSyllabus, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [exam.id, exam.subjectName, exam.examDate, JSON.stringify(exam.chapters), exam.totalSyllabus, exam.completedSyllabus, exam.createdAt]
    );
}

export async function deleteExamSchedule(id: string): Promise<void> {
    const database = getDb();
    await database.runAsync('DELETE FROM exam_schedules WHERE id = ?', [id]);
}

// ================== FLASHCARDS ==================
export async function getAllFlashcardDecks(): Promise<FlashcardDeck[]> {
    const database = getDb();
    return await database.getAllAsync<FlashcardDeck>('SELECT * FROM flashcard_decks ORDER BY createdAt DESC');
}

export async function saveFlashcardDeck(deck: FlashcardDeck): Promise<void> {
    const database = getDb();
    await database.runAsync(
        `INSERT OR REPLACE INTO flashcard_decks (id, name, subject, noteId, cardCount, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
        [deck.id, deck.name, deck.subject, deck.noteId || null, deck.cardCount, deck.createdAt]
    );
}

export async function getFlashcardsByDeck(deckId: string): Promise<Flashcard[]> {
    const database = getDb();
    return await database.getAllAsync<Flashcard>('SELECT * FROM flashcards WHERE deckId = ?', [deckId]);
}

export async function saveFlashcard(card: Flashcard): Promise<void> {
    const database = getDb();
    await database.runAsync(
        `INSERT OR REPLACE INTO flashcards (id, deckId, front, back, easeFactor, interval, repetitions, nextReview, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [card.id, card.deckId, card.front, card.back, card.easeFactor, card.interval, card.repetitions, card.nextReview, card.createdAt]
    );
}

export async function getDueFlashcards(deckId: string): Promise<Flashcard[]> {
    const database = getDb();
    const now = Date.now();
    return await database.getAllAsync<Flashcard>(
        'SELECT * FROM flashcards WHERE deckId = ? AND nextReview <= ? ORDER BY nextReview ASC',
        [deckId, now]
    );
}

// ================== STUDY SESSIONS ==================
export async function saveStudySession(session: StudySession): Promise<void> {
    const database = getDb();
    await database.runAsync(
        `INSERT INTO study_sessions (id, subject, duration, type, timestamp) VALUES (?, ?, ?, ?, ?)`,
        [session.id, session.subject, session.duration, session.type, session.timestamp]
    );
}

export async function getStudySessions(days: number = 30): Promise<StudySession[]> {
    const database = getDb();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return await database.getAllAsync<StudySession>(
        'SELECT * FROM study_sessions WHERE timestamp > ? ORDER BY timestamp DESC',
        [cutoff]
    );
}

// ================== WEAK TOPICS ==================
export async function getWeakTopics(): Promise<WeakTopic[]> {
    const database = getDb();
    return await database.getAllAsync<WeakTopic>('SELECT * FROM weak_topics ORDER BY wrongCount DESC');
}

export async function addWeakTopic(topic: WeakTopic): Promise<void> {
    const database = getDb();
    const existing = await database.getFirstAsync<WeakTopic>(
        'SELECT * FROM weak_topics WHERE topic = ? AND subject = ?',
        [topic.topic, topic.subject]
    );

    if (existing) {
        await database.runAsync(
            'UPDATE weak_topics SET wrongCount = wrongCount + 1, lastAttempt = ? WHERE id = ?',
            [topic.lastAttempt, existing.id]
        );
    } else {
        await database.runAsync(
            'INSERT INTO weak_topics (id, topic, subject, wrongCount, lastAttempt) VALUES (?, ?, ?, ?, ?)',
            [topic.id, topic.topic, topic.subject, topic.wrongCount, topic.lastAttempt]
        );
    }
}

export async function removeWeakTopic(id: string): Promise<void> {
    const database = getDb();
    await database.runAsync('DELETE FROM weak_topics WHERE id = ?', [id]);
}

// ================== QUIZ SESSIONS ==================
export async function saveQuizSession(session: QuizSession): Promise<void> {
    const database = getDb();
    await database.runAsync(
        `INSERT INTO quiz_sessions (id, noteId, subject, questions, answers, score, completedAt, weakTopics)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [session.id, session.noteId || null, session.subject, JSON.stringify(session.questions), JSON.stringify(session.answers), session.score, session.completedAt, JSON.stringify(session.weakTopics)]
    );
}

export async function getQuizSessions(limit: number = 50): Promise<QuizSession[]> {
    const database = getDb();
    const rows = await database.getAllAsync<any>(
        'SELECT * FROM quiz_sessions ORDER BY completedAt DESC LIMIT ?',
        [limit]
    );
    return rows.map(row => ({
        ...row,
        questions: JSON.parse(row.questions),
        answers: JSON.parse(row.answers),
        weakTopics: JSON.parse(row.weakTopics || '[]'),
    }));
}
