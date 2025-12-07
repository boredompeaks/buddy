// AI Service - Groq for light tasks, Gemini for complex tasks
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_CONFIG } from '../constants';
import { QuizQuestion, ChatMessage } from '../types';
import * as SecureStore from 'expo-secure-store';

let groqClient: Groq | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

// ================== CLIENT INITIALIZATION ==================
async function getGroqClient(): Promise<Groq> {
    if (groqClient) return groqClient;

    const apiKey = await SecureStore.getItemAsync('groq_api_key');
    if (!apiKey) {
        throw new Error('Groq API key not configured. Please add it in Settings.');
    }

    groqClient = new Groq({ apiKey, dangerouslyAllowBrowser: true });
    return groqClient;
}

async function getGeminiClient(): Promise<GoogleGenerativeAI> {
    if (geminiClient) return geminiClient;

    const apiKey = await SecureStore.getItemAsync('gemini_api_key');
    if (!apiKey) {
        throw new Error('Gemini API key not configured. Please add it in Settings.');
    }

    geminiClient = new GoogleGenerativeAI(apiKey);
    return geminiClient;
}

// ================== GROQ FUNCTIONS (Fast, Light Tasks) ==================

/**
 * Chat with AI about doubts - uses Groq for fast responses
 */
export async function chatWithAI(
    messages: ChatMessage[],
    noteContent?: string
): Promise<string> {
    try {
        const groq = await getGroqClient();

        const systemPrompt = noteContent
            ? `You are a helpful tutor. The student is studying the following notes:\n---\n${noteContent.substring(0, 8000)}\n---\nAnswer their questions based on these notes. Use markdown for formatting.`
            : 'You are a helpful study assistant. Answer clearly and use markdown for formatting.';

        const response = await groq.chat.completions.create({
            model: AI_CONFIG.groq.model,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({
                    role: m.role === 'user' ? 'user' as const : 'assistant' as const,
                    content: m.text,
                })),
            ],
            max_tokens: 2048,
            temperature: 0.7,
        });

        return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    } catch (error) {
        console.error('Chat error:', error);
        throw error;
    }
}

/**
 * Generate quiz questions from note content - uses Groq
 */
export async function generateQuiz(
    content: string,
    count: number = 10
): Promise<QuizQuestion[]> {
    try {
        const groq = await getGroqClient();

        const response = await groq.chat.completions.create({
            model: AI_CONFIG.groq.model,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert quiz generator. Create multiple choice questions from the given content. Return valid JSON only.',
                },
                {
                    role: 'user',
                    content: `Generate ${count} multiple choice quiz questions from this content. Each question should have 4 options, a correct answer index (0-3), and an explanation.

Return ONLY valid JSON array in this format:
[{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "...", "difficulty": "medium"}]

Content:
${content.substring(0, 12000)}`,
                },
            ],
            max_tokens: 4096,
            temperature: 0.5,
            response_format: { type: 'json_object' },
        });

        const text = response.choices[0]?.message?.content || '[]';
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : parsed.questions || [];
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

        const response = await groq.chat.completions.create({
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
        });

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

        const response = await groq.chat.completions.create({
            model: AI_CONFIG.groq.model,
            messages: [
                {
                    role: 'user',
                    content: `Classify this content into ONE of these subjects: ${subjects.join(', ')}. Return ONLY the subject name, nothing else.\n\nContent: ${content.substring(0, 2000)}`,
                },
            ],
            max_tokens: 20,
            temperature: 0,
        });

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

        const result = await model.generateContent([
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
        ]);

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

        const result = await model.generateContent(`Create a strictly formatted exam question paper.

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
5. Ensure questions test understanding, not just memorization`);

        return result.response.text() || 'Failed to generate paper.';
    } catch (error) {
        console.error('Paper generation error:', error);
        throw error;
    }
}

/**
 * Grade answer sheet - uses Gemini Pro for image analysis + reasoning
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

        const result = await model.generateContent([
            ...imageParts,
            {
                text: `You are a strict examiner. Grade the handwritten answers in the images.

Question Paper:
${questionPaper || 'Standard assessment'}

Reference Material:
${referenceNotes.substring(0, 5000)}

OUTPUT FORMAT (Markdown):
1. **Summary Table**: Question No | Marks Obtained | Max Marks
2. **Total Score**: X / Y
3. **Detailed Corrections**: For each wrong answer, explain WHY and what's missing
4. **Areas for Improvement**: Bullet points`,
            },
        ]);

        return result.response.text() || 'Failed to grade answers.';
    } catch (error) {
        console.error('Grading error:', error);
        throw error;
    }
}

/**
 * Generate study plan based on exam schedule - uses Gemini
 */
export async function generateStudyPlan(
    exams: { subject: string; date: number; chapters: string[] }[],
    weakTopics: string[],
    availableHoursPerDay: number = 4
): Promise<string> {
    try {
        const gemini = await getGeminiClient();
        const model = gemini.getGenerativeModel({ model: AI_CONFIG.gemini.flashModel });

        const examInfo = exams.map(e => ({
            subject: e.subject,
            daysLeft: Math.ceil((e.date - Date.now()) / (1000 * 60 * 60 * 24)),
            chapters: e.chapters,
        }));

        const result = await model.generateContent(`Create a daily study plan for the next 7 days.

Upcoming Exams:
${JSON.stringify(examInfo, null, 2)}

Weak Topics to Focus On:
${weakTopics.join(', ') || 'None identified'}

Available Study Time: ${availableHoursPerDay} hours per day

OUTPUT FORMAT (Markdown):
For each day, provide:
- Date
- Topics to cover with time allocation
- Priority reasoning

Focus on weak areas and subjects with closer exam dates.`);

        return result.response.text() || 'Failed to generate study plan.';
    } catch (error) {
        console.error('Study plan error:', error);
        throw error;
    }
}

/**
 * Generate flashcards from content - uses Groq for speed
 */
export async function generateFlashcards(
    content: string,
    count: number = 20
): Promise<{ front: string; back: string }[]> {
    try {
        const groq = await getGroqClient();

        const response = await groq.chat.completions.create({
            model: AI_CONFIG.groq.model,
            messages: [
                {
                    role: 'system',
                    content: 'Generate flashcards for studying. Return valid JSON only.',
                },
                {
                    role: 'user',
                    content: `Generate ${count} flashcards from this content. Each card has a question (front) and answer (back).

Return ONLY valid JSON array:
[{"front": "Question?", "back": "Answer"}]

Content:
${content.substring(0, 10000)}`,
                },
            ],
            max_tokens: 4096,
            temperature: 0.5,
            response_format: { type: 'json_object' },
        });

        const text = response.choices[0]?.message?.content || '[]';
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : parsed.flashcards || [];
    } catch (error) {
        console.error('Flashcard generation error:', error);
        throw error;
    }
}
