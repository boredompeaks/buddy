// AI Service - Groq for light tasks, Gemini for complex tasks
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_CONFIG, STORAGE_KEYS } from '../constants';
import { QuizQuestion, ChatMessage, Flashcard } from '../types';
import * as SecureStore from 'expo-secure-store';

let groqClient: Groq | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

// ================== TIMEOUT HELPER ==================
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

class TimeoutError extends Error {
    constructor(message = 'Request timed out') {
        super(message);
        this.name = 'TimeoutError';
    }
}

/**
 * Wraps a promise with a timeout. Rejects if the promise doesn't resolve within the specified time.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) => {
            setTimeout(() => reject(new TimeoutError(`AI request timed out after ${timeoutMs / 1000}s`)), timeoutMs);
        }),
    ]);
}

// ================== JSON EXTRACTION & VALIDATION ==================

/**
 * Extracts JSON from AI response text that may be wrapped in markdown code blocks.
 * Handles common AI response patterns:
 * - ```json ... ```
 * - ```javascript ... ```
 * - Preamble text like "Here is the JSON:" followed by JSON
 * - Truncated JSON (attempts to repair by closing brackets)
 */
function extractJSON<T>(text: string, fallback: T): T {
    if (!text || typeof text !== 'string') return fallback;

    let cleaned = text.trim();

    // Remove markdown code blocks
    const codeBlockMatch = cleaned.match(/```(?:json|javascript|js)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
        cleaned = codeBlockMatch[1].trim();
    }

    // Find the first JSON array or object
    const jsonStartMatch = cleaned.match(/[\[{]/);
    if (jsonStartMatch && jsonStartMatch.index !== undefined) {
        cleaned = cleaned.substring(jsonStartMatch.index);
    }

    // Try to parse as-is first
    try {
        return JSON.parse(cleaned) as T;
    } catch (e) {
        // Attempt to repair truncated JSON
        const repairedJSON = repairTruncatedJSON(cleaned);
        try {
            return JSON.parse(repairedJSON) as T;
        } catch (e2) {
            console.warn('JSON extraction failed, using fallback:', text.substring(0, 100));
            return fallback;
        }
    }
}

/**
 * Attempts to repair truncated JSON by closing open brackets/braces
 */
function repairTruncatedJSON(json: string): string {
    let repaired = json.trim();

    // Remove trailing incomplete elements (e.g., trailing comma, incomplete key)
    repaired = repaired.replace(/,\s*$/, '');
    repaired = repaired.replace(/,\s*"[^"]*$/, '');

    // Count open vs closed brackets/braces
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;
    const openBraces = (repaired.match(/{/g) || []).length;
    const closeBraces = (repaired.match(/}/g) || []).length;

    // Close unclosed structures
    for (let i = 0; i < openBraces - closeBraces; i++) {
        repaired += '}';
    }
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
        repaired += ']';
    }

    return repaired;
}

/**
 * Validates a quiz question object has the required fields
 */
function validateQuizQuestion(obj: any): obj is QuizQuestion {
    return (
        obj &&
        typeof obj === 'object' &&
        typeof obj.question === 'string' &&
        Array.isArray(obj.options) &&
        obj.options.length >= 2 &&
        typeof obj.correctAnswer === 'number' &&
        obj.correctAnswer >= 0 &&
        obj.correctAnswer < obj.options.length
    );
}

/**
 * Validates a flashcard object has the required fields
 */
function validateFlashcard(obj: any): boolean {
    return (
        obj &&
        typeof obj === 'object' &&
        typeof obj.front === 'string' &&
        obj.front.length > 0 &&
        typeof obj.back === 'string' &&
        obj.back.length > 0
    );
}

// ================== CLIENT INITIALIZATION ==================
async function getGroqClient(): Promise<Groq> {
    if (groqClient) return groqClient;

    const apiKey = await SecureStore.getItemAsync(STORAGE_KEYS.GROQ_API_KEY);
    if (!apiKey) {
        throw new Error('Groq API key not configured. Please add it in Settings.');
    }

    groqClient = new Groq({ apiKey, dangerouslyAllowBrowser: true });
    return groqClient;
}

async function getGeminiClient(): Promise<GoogleGenerativeAI> {
    if (geminiClient) return geminiClient;

    const apiKey = await SecureStore.getItemAsync(STORAGE_KEYS.GEMINI_API_KEY);
    if (!apiKey) {
        throw new Error('Gemini API key not configured. Please add it in Settings.');
    }

    geminiClient = new GoogleGenerativeAI(apiKey);
    return geminiClient;
}

// ================== GROQ FUNCTIONS (Fast, Light Tasks) ==================

/**
 * Chat with AI about doubts - uses Groq for fast responses
 * Enhanced with context-aware grounding per Neural Link spec.
 */
export async function chatWithAI(
    messages: ChatMessage[],
    noteContent?: string,
    noteTitle?: string
): Promise<string> {
    try {
        const groq = await getGroqClient();

        // Context-Aware System Prompt (Neural Link Spec)
        const systemPrompt = noteContent
            ? `You are a strict but helpful tutor.

## GROUNDING RULES:
1. The student is studying: "${noteTitle || 'Untitled Note'}"
2. Your PRIMARY source of truth is the NOTE_CONTEXT below.
3. Answer their questions based on the notes FIRST.
4. If the explanation requires information NOT in the notes, provide it in a SEPARATE section at the end titled "## 📚 Relevant Extra Info".
5. Use clear markdown formatting with headers, bullet points, and bold keywords.
6. If you cannot answer from the notes, say "This isn't covered in your notes, but here's what I know..." and put it in the Extra Info section.

## NOTE_CONTEXT:
---
${noteContent.substring(0, 10000)}
---`
            : 'You are a helpful study assistant. Answer clearly and use markdown for formatting. Be concise but thorough.';

        const response = await withTimeout(groq.chat.completions.create({
            model: AI_CONFIG.groq.model,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({
                    role: m.role === 'user' ? 'user' as const : 'assistant' as const,
                    content: m.text,
                })),
            ],
            max_tokens: 3000, // Increased for detailed explanations
            temperature: 0.6, // Slightly more focused
        }));

        return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    } catch (error) {
        console.error('Chat error:', error);
        throw error;
    }
}


/**
 * Generate quiz questions from note content - uses Groq
 * Enhanced with 40% Competency-Based (Board-style Tricky) questions.
 */
export async function generateQuiz(
    content: string,
    count: number = 10,
    difficulty: 'easy' | 'medium' | 'hard' | 'board' = 'board'
): Promise<QuizQuestion[]> {
    // Input validation
    const safeCount = Math.max(1, Math.min(20, count)); // Cap at 1-20 questions
    const safeContent = content?.substring(0, 15000) || '';

    if (safeContent.length < 50) {
        throw new Error('Content is too short to generate meaningful quiz questions.');
    }

    try {
        const groq = await getGroqClient();

        // Competency-Based Prompt Engineering (Board Exam Style)
        const trickyCount = difficulty === 'board' ? Math.ceil(safeCount * 0.4) : 0;

        const response = await withTimeout(groq.chat.completions.create({
            model: AI_CONFIG.groq.model,
            messages: [
                {
                    role: 'system',
                    content: `You are an expert Board Exam Question Paper Setter.

## RULES:
1. Create ${safeCount} MCQs from the content.
2. **DIFFICULTY MIX**: ${trickyCount} questions MUST be "competency-based" (tricky). The rest can be standard.
3. **COMPETENCY QUESTIONS** (the tricky ${trickyCount}):
   - Use "Assertion-Reasoning" format: "Assertion (A): ... Reason (R): ..."
   - Use PLAUSIBLE DISTRACTORS (common student misconceptions as wrong options)
   - Test APPLICATION, not just memorization
4. Each question MUST have 4 options.
5. Include a "trapExplanation" field explaining WHY the wrong options are traps.

Return ONLY valid JSON. No markdown.`,
                },
                {
                    role: 'user',
                    content: `Generate ${safeCount} MCQs (${trickyCount} tricky, ${safeCount - trickyCount} standard) from this content.

JSON Format (EXACT):
[{
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": 0,
  "explanation": "Why the correct answer is right...",
  "trapExplanation": "Why students might pick wrong options...",
  "difficulty": "easy|medium|hard",
  "isCompetencyBased": true|false
}]

Content:
${safeContent}`,
                },
            ],
            max_tokens: 6000, // Increased for detailed explanations
            temperature: 0.6,
        }), 90000); // 90s for complex quiz generation

        const text = response.choices[0]?.message?.content || '[]';

        // Use extractJSON to handle markdown wrappers and truncated JSON
        const parsed = extractJSON<any>(text, { questions: [] });
        const rawQuestions = Array.isArray(parsed) ? parsed : parsed.questions || [];

        // Validate and filter only well-formed questions
        const validQuestions = rawQuestions.filter(validateQuizQuestion);

        if (validQuestions.length === 0) {
            console.warn('No valid quiz questions generated, raw response:', text.substring(0, 200));
            throw new Error('AI returned invalid quiz format. Please try again.');
        }

        return validQuestions;
    } catch (error) {
        console.error('Quiz generation error:', error);
        throw error;
    }
}


/**
 * Generate summary of content - uses Groq
 */
export async function generateSummary(content: string): Promise<string> {
    try {
        const groq = await getGroqClient();

        const response = await withTimeout(groq.chat.completions.create({
            model: AI_CONFIG.groq.model,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert at summarizing academic content. Create clear, concise summaries.',
                },
                {
                    role: 'user',
                    content: `Summarize the following study notes into a concise paragraph, highlighting key concepts:\n\n${content.substring(0, 10000)}`,
                },
            ],
            max_tokens: 1024,
            temperature: 0.5,
        }));

        return response.choices[0]?.message?.content || 'Could not generate summary.';
    } catch (error) {
        console.error('Summary error:', error);
        throw error;
    }
}

/**
 * Classify subject of content - uses Groq
 */
export async function classifySubject(content: string): Promise<string> {
    try {
        const groq = await getGroqClient();
        const subjects = ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'History', 'Geography', 'English', 'Computer Science', 'Economics', 'General'];

        const response = await withTimeout(groq.chat.completions.create({
            model: AI_CONFIG.groq.model,
            messages: [
                {
                    role: 'user',
                    content: `Classify this content into ONE of these subjects: ${subjects.join(', ')}. Return ONLY the subject name, nothing else.\n\nContent: ${content.substring(0, 2000)}`,
                },
            ],
            max_tokens: 20,
            temperature: 0,
        }), 15000); // 15s for simple classification

        const result = response.choices[0]?.message?.content?.trim() || 'General';
        return subjects.find(s => s.toLowerCase() === result.toLowerCase()) || 'General';
    } catch (error) {
        console.error('Classification error:', error);
        return 'General';
    }
}

// ================== GEMINI FUNCTIONS (Complex Tasks) ==================

/**
 * Generate detailed notes from PDF - uses Gemini (multimodal)
 */
export async function generateNotesFromPDF(pdfBase64: string): Promise<string> {
    try {
        const gemini = await getGeminiClient();
        const model = gemini.getGenerativeModel({ model: AI_CONFIG.gemini.flashModel });

        const result = await withTimeout(model.generateContent([
            {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64,
                },
            },
            {
                text: `Generate comprehensive study notes from this document.

Format requirements:
1. Use Markdown formatting
2. Include a Table of Contents
3. Break down into Key Concepts with bullet points
4. Highlight keywords in **bold**
5. Include a "Frequently Asked Questions" section
6. Ensure 100% coverage of the material`,
            },
        ]), 90000); // 90s for PDF synthesis

        return result.response.text() || 'Failed to generate notes.';
    } catch (error) {
        console.error('PDF synthesis error:', error);
        throw error;
    }
}

/**
 * Generate exam paper - uses Gemini Pro for high quality
 */
export async function generateExamPaper(
    content: string,
    config: { subject: string; pattern: string; totalMarks: number; focus?: string }
): Promise<string> {
    try {
        const gemini = await getGeminiClient();
        const model = gemini.getGenerativeModel({ model: AI_CONFIG.gemini.proModel });

        const result = await withTimeout(model.generateContent(`Create a strictly formatted exam question paper.

Subject: ${config.subject}
Pattern: ${config.pattern}
Total Marks: ${config.totalMarks}
Focus Area: ${config.focus || 'Entire syllabus'}

Study Material:
${content.substring(0, 25000)}

Requirements:
1. Follow standard ${config.pattern} paper layout
2. Include mark allocation for each question [2], [4] etc.
3. Include an Answer Key at the end
4. Use Markdown formatting
5. Ensure questions test understanding, not just memorization`), 90000); // 90s for paper generation

        return result.response.text() || 'Failed to generate paper.';
    } catch (error) {
        console.error('Paper generation error:', error);
        throw error;
    }
}

/**
 * Grade answer sheet - uses Gemini Pro for image analysis + reasoning
 * Enhanced with "Ruthless Board Examiner" persona.
 */
export async function gradeAnswerSheet(
    images: string[],
    questionPaper: string,
    referenceNotes: string
): Promise<string> {
    try {
        const gemini = await getGeminiClient();
        const model = gemini.getGenerativeModel({ model: AI_CONFIG.gemini.proModel });

        const imageParts = images.map(img => ({
            inlineData: {
                mimeType: 'image/jpeg',
                data: img.includes('base64,') ? img.split('base64,')[1] : img,
            },
        }));

        const result = await withTimeout(model.generateContent([
            ...imageParts,
            {
                text: `You are a STRICT BOARD EXAMINER (Ruthless Grader).

Your goal is to simulate a harsh board correction environment to prepare the student for reality.

GRADING ALGORITHM:
1. **Keywords**: No marks if key scientific/technical terms are missing.
2. **Formatting**: Deduct marks for messy handwriting or poor structure.
3. **Vague Answers**: Zero marks for "beating around the bush".
4. **Diagrams**: Deduct if required diagrams are missing/poorly labeled.

INPUTS:
- Question Paper: ${questionPaper}
- Reference Notes (Truth): ${referenceNotes.substring(0, 5000)}
- Student Answers: (See images)

OUTPUT FORMAT (Markdown):
# Answer Sheet Analysis

## 📊 Scorecard
| Question | Marks | Remarks (Why did you cut marks?) |
|----------|-------|----------------------------------|
| Q1       | 1/2   | Missing keyword "Photosynthesis" |
| ...      | ...   | ...                              |
| **Total**| **X/Y** | **(Percentage)**               |

## 🔪 The Ruthless Review
- **Major Flaws**: (List 3 critical mistakes)
- **Formatting Issues**: (Handwriting, spacing, diagrams)
- **Examiner's Verdict**: (Pass/Fail/Needs Serious Work)

## 💡 Model Answers (For failed questions)
(Provide correct answers for the question where student lost most marks)`,
            },
        ]), 120000); // 120s for grading with images

        return result.response.text() || 'Failed to grade answers.';
    } catch (error) {
        console.error('Grading error:', error);
        throw error;
    }
}

/**
 * Generate study plan based on exam schedule - uses Gemini
 * Enhanced with Intelligent Scheduler (Gap Analysis & Constraints)
 */
export async function generateStudyPlan(
    exams: { subject: string; date: number; chapters: string[] }[],
    weakTopics: string[],
    availableHoursPerDay: number = 4,
    constraints?: { blockedTimes: string[]; preferredTimes: string[] }
): Promise<string> {
    try {
        const gemini = await getGeminiClient();
        const model = gemini.getGenerativeModel({ model: AI_CONFIG.gemini.flashModel }); // Use Flash for speed

        const examInfo = exams.map(e => ({
            subject: e.subject,
            daysLeft: Math.ceil((e.date - Date.now()) / (1000 * 60 * 60 * 24)),
            chapters: e.chapters,
            priority: Math.ceil((e.date - Date.now()) / (1000 * 60 * 60 * 24)) < 3 ? 'CRITICAL' : 'NORMAL'
        }));

        const result = await withTimeout(model.generateContent(`Act as an Elite Exam Strategist. Create a high-performance 7-day study schedule.

## INPUTS:
- **Upcoming Exams**: ${JSON.stringify(examInfo, null, 2)}
- **Weak Areas (Gap Analysis)**: ${weakTopics.join(', ') || 'None identifying, focus on equal distribution'}
- **Constraints**: 
  - Study Time: ${availableHoursPerDay} hrs/day
  - Blocked Times: ${constraints?.blockedTimes?.join(', ') || 'None'}

## STRATEGY RULES:
1. **Spaced Repetition**: Don't cram one subject all day. Interleave subjects.
2. **Gap Analysis**: Allocate double time to "Weak Areas".
3. **Proximity Bias**: Exams happening in < 3 days get 70% of the day's slot.
4. **Burnout Prevention**: Include 10-min breaks every hour.

## OUTPUT FORMAT (Markdown):
# 📅 7-Day Battle Plan

## Strategy Overview
(Explain the logic: "Focusing heavily on Math due to exam in 2 days...")

## Daily Schedule
### Day 1 (Date)
- [Time] **Subject**: Topic (Reasoning)
- [Time] **Break**
...

### Day 2...
...`), 60000); // 60s for study plan

        return result.response.text() || 'Failed to generate study plan.';
    } catch (error) {
        console.error('Study plan error:', error);
        throw error;
    }
}

/**
 * Parse exam schedule from image - uses Gemini Flash
 */
export async function parseExamSchedule(imageBase64: string): Promise<{ subject: string; date: number }[]> {
    try {
        const gemini = await getGeminiClient();
        const model = gemini.getGenerativeModel({ model: AI_CONFIG.gemini.flashModel });

        const result = await withTimeout(model.generateContent([
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageBase64.includes('base64,') ? imageBase64.split('base64,')[1] : imageBase64,
                },
            },
            {
                text: `Extract exam schedule from this image.
                
Return ONLY a valid JSON array of objects with "subject" (string) and "date" (timestamp in milliseconds).
If the year is missing, assume current year.
Format: [{"subject": "Math", "date": 1715644800000}]`,
            },
        ]), 30000); // 30s timeout

        const text = result.response.text();
        const parsed = extractJSON<{ subject: string; date: number }[]>(text, []);

        if (!Array.isArray(parsed) || parsed.length === 0) {
            throw new Error('Could not extract valid exams from image.');
        }

        return parsed.filter(e => e.subject && e.date);
    } catch (error) {
        console.error('Exam parsing error:', error);
        throw error;
    }
}
export async function generateFlashcards(
    content: string,
    count: number = 20
): Promise<{ front: string; back: string }[]> {
    // Input validation
    const safeCount = Math.max(1, Math.min(30, count)); // Cap at 1-30 cards
    const safeContent = content?.substring(0, 10000) || '';

    if (safeContent.length < 50) {
        throw new Error('Content is too short to generate meaningful flashcards.');
    }

    try {
        const groq = await getGroqClient();

        const response = await withTimeout(groq.chat.completions.create({
            model: AI_CONFIG.groq.model,
            messages: [
                {
                    role: 'system',
                    content: 'Generate flashcards for studying. Return ONLY valid JSON array.',
                },
                {
                    role: 'user',
                    content: `Generate ${safeCount} flashcards from this content. Each card has a question (front) and answer (back).

Return ONLY a JSON array in this exact format (no markdown, no explanation):
[{"front": "Question?", "back": "Answer"}]

Content:
${safeContent}`,
                },
            ],
            max_tokens: 4096,
            temperature: 0.5,
        }), 60000); // 60s for flashcard generation

        const text = response.choices[0]?.message?.content || '[]';

        // Use extractJSON to handle markdown wrappers and truncated JSON
        const parsed = extractJSON<any>(text, { flashcards: [] });
        const rawCards = Array.isArray(parsed) ? parsed : parsed.flashcards || [];

        // Validate and filter only well-formed flashcards
        const validCards = rawCards.filter(validateFlashcard);

        if (validCards.length === 0) {
            console.warn('No valid flashcards generated, raw response:', text.substring(0, 200));
            throw new Error('AI returned invalid flashcard format. Please try again.');
        }

        return validCards;
    } catch (error) {
        console.error('Flashcard generation error:', error);
        throw error;
    }
}

// ================== SCHEDULE NARRATOR ==================

interface ScheduleSlotInfo {
    type: string;
    subject: string | null;
    start: string;
    end: string;
}

interface ScheduleDayInfo {
    date: string;
    slots: ScheduleSlotInfo[];
    friction_notes?: string[];
}

/**
 * Generates AI commentary for a study schedule.
 * Provides motivational, actionable guidance based on today's plan.
 */
export async function narrateSchedule(schedule: ScheduleDayInfo[]): Promise<string> {
    try {
        const groq = await getGroqClient();

        // Build a summary of today's schedule for the AI
        const today = new Date().toISOString().split('T')[0];
        const todaySchedule = schedule.find(d => d.date === today);

        if (!todaySchedule || todaySchedule.slots.length === 0) {
            return "No study sessions scheduled for today. Consider adding exams and notes to generate a personalized plan!";
        }

        const slotsSummary = todaySchedule.slots.map(s =>
            `${s.start}-${s.end}: ${s.type.toUpperCase()} ${s.subject || 'General'}`
        ).join('\n');

        const frictionContext = todaySchedule.friction_notes?.length
            ? `\nNote: ${todaySchedule.friction_notes.join('. ')}`
            : '';

        const response = await withTimeout(groq.chat.completions.create({
            model: AI_CONFIG.groq.model,
            messages: [
                {
                    role: 'system',
                    content: `You are MindVault's study coach. Generate a brief, encouraging commentary (2-3 sentences max) about the user's study schedule. Be specific about subjects and times. Focus on motivation and practical tips. No greetings or sign-offs.`,
                },
                {
                    role: 'user',
                    content: `Today's study schedule:\n${slotsSummary}${frictionContext}\n\nProvide a brief motivational insight about this plan.`,
                },
            ],
            max_tokens: 150,
            temperature: 0.7,
        }), 15000);

        return response.choices[0]?.message?.content?.trim() || 'Your schedule is set. Focus and conquer!';
    } catch (error) {
        console.error('Schedule narration error:', error);
        // Return a default message instead of throwing
        return 'Your study plan is ready. Stay focused and tackle each session with intention!';
    }
}

