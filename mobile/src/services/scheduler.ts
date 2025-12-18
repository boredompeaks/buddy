// Adaptive Study Scheduler - Ported from Python Algorithm
// Implements SM-2 integration, interleaving, personal difficulty, and time slot management

import {
    format,
    parseISO,
    differenceInDays,
    addDays,
    isAfter,
    isBefore,
    startOfDay,
} from 'date-fns';

// =========================
// Types
// =========================

export interface TimeBlocker {
    date: string; // ISO date
    start: string; // HH:MM
    end: string; // HH:MM
    reason?: string;
}

export interface Chapter {
    chapter_id: string;
    subject: string;
    estimated_hours: number;
    default_difficulty: number; // 0-1
    exam_weight: number;
    question_density: number; // 0-1
    noteId?: string; // Link to note for deep navigation
}

export interface Exam {
    subject: string;
    date: string; // ISO date
    weight: number;
}

export interface UserFriction {
    avg_overrun: number; // 0-1
    quiz_error_rate: number; // 0-1
    revision_frequency: number; // 0-1
}

export interface ScheduleSlot {
    start: string; // HH:MM
    end: string; // HH:MM
    chapter_id: string | null;
    subject: string | null;
    noteId?: string; // For deep linking
    type: 'study' | 'review' | 'mini_review' | 'break' | 'buffer';
    cards: number | null;
    reason: string;
    completed?: boolean; // For checklist tracking
}

export interface ScheduleDay {
    date: string;
    total_hours: number;
    slots: ScheduleSlot[];
    friction_notes: string[];
    ai_commentary?: string; // AI narrator comment
    warning?: string;
}

export interface ScheduleSummary {
    today: string;
    total_coverage: number;
    risk_chapters: string[];
    remaining_hours_total: number;
    mode: string;
    history_suggestions: Record<string, string>;
}

export interface SchedulerConfig {
    mode?: 'base' | 'assisted' | 'power';
    daily_max_hours?: number;
    min_reviews?: number;
    slot_minutes?: number;
    mini_slot_minutes?: number;
    day_start?: string; // HH:MM
    day_end?: string; // HH:MM
    target_completion_date?: string; // ISO date, fallback if no exams
    date_dampener?: 'log' | 'floor3' | 'implicit';
    focus_weight?: number;
    today?: string; // ISO date
    history?: Record<string, string>; // chapter_id -> last study date
}

// =========================
// Utility Functions
// =========================

function clamp(x: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, x));
}

function safeFloat(value: unknown, defaultVal: number = 0, lo?: number, hi?: number): number {
    let x: number;
    if (value === null || value === undefined) {
        x = defaultVal;
    } else if (typeof value === 'string') {
        const s = value.trim();
        x = s === '' ? defaultVal : parseFloat(s);
        if (isNaN(x)) x = defaultVal;
    } else if (typeof value === 'number') {
        x = isNaN(value) ? defaultVal : value;
    } else {
        x = defaultVal;
    }
    if (lo !== undefined) x = Math.max(lo, x);
    if (hi !== undefined) x = Math.min(hi, x);
    return x;
}

function safeInt(value: unknown, defaultVal: number = 0, lo?: number, hi?: number): number {
    return Math.round(safeFloat(value, defaultVal, lo, hi));
}

function parseTimeStr(t: string): { hour: number; minute: number } {
    const [hh, mm] = t.trim().split(':');
    return {
        hour: safeInt(hh, 0, 0, 23),
        minute: safeInt(mm, 0, 0, 59),
    };
}

function timeToMinutes(t: string): number {
    const { hour, minute } = parseTimeStr(t);
    return hour * 60 + minute;
}

function minutesToTime(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// =========================
// Core Calculations
// =========================

export function personalDifficulty(chapter: Chapter, friction: UserFriction): number {
    const avgOverrun = safeFloat(friction.avg_overrun, 0, 0, 1);
    const quizError = safeFloat(friction.quiz_error_rate, 0, 0, 1);
    const revFreq = safeFloat(friction.revision_frequency, 0, 0, 1);
    const base = safeFloat(chapter.default_difficulty, 0.5, 0, 1);

    const pd = base + avgOverrun * 0.3 + quizError * 0.4 + revFreq * 0.3;
    return clamp(pd, 0, 1);
}

export function computeSM2Cards(
    personalDiff: number,
    minReviews: number,
    durationMinutes: number,
    baseSlotMinutes: number
): number {
    const pd = Math.max(personalDiff, 0.000001);
    const scale = clamp(durationMinutes / Math.max(baseSlotMinutes, 1), 0.25, 1);
    const cards = Math.round((1 / pd) * minReviews * scale);
    return safeInt(cards, 10, 6, 50);
}

// =========================
// Time Slot Builder
// =========================

interface Slot {
    start: number; // minutes from midnight
    end: number;
    duration: number;
    isMini: boolean;
}

function mergeIntervals(intervals: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
    if (intervals.length === 0) return [];
    const sorted = [...intervals].sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number }> = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
        const last = merged[merged.length - 1];
        const curr = sorted[i];
        if (curr.start <= last.end) {
            last.end = Math.max(last.end, curr.end);
        } else {
            merged.push(curr);
        }
    }
    return merged;
}

export function buildTimeSlots(
    day: string,
    blockers: TimeBlocker[],
    dayStart: string,
    dayEnd: string,
    slotMinutes: number,
    miniSlotMinutes: number
): Slot[] {
    const startMins = timeToMinutes(dayStart);
    const endMins = timeToMinutes(dayEnd);

    if (endMins <= startMins) {
        throw new Error('day_end must be after day_start');
    }

    // Get blockers for this day
    const dayBlockers: Array<{ start: number; end: number }> = [];
    for (const b of blockers) {
        if (b.date !== day) continue;
        const bStart = Math.max(timeToMinutes(b.start), startMins);
        const bEnd = Math.min(timeToMinutes(b.end), endMins);
        if (bEnd > bStart) {
            dayBlockers.push({ start: bStart, end: bEnd });
        }
    }

    const merged = mergeIntervals(dayBlockers);

    // Find free intervals
    const free: Array<{ start: number; end: number }> = [];
    let cursor = startMins;
    for (const block of merged) {
        if (block.start > cursor) {
            free.push({ start: cursor, end: block.start });
        }
        cursor = Math.max(cursor, block.end);
    }
    if (cursor < endMins) {
        free.push({ start: cursor, end: endMins });
    }

    // Build slots
    const slots: Slot[] = [];
    for (const { start, end } of free) {
        const duration = end - start;
        if (duration <= 0) continue;

        const fullCount = Math.floor(duration / slotMinutes);
        const remainder = duration - fullCount * slotMinutes;

        let cur = start;
        for (let i = 0; i < fullCount; i++) {
            const next = cur + slotMinutes;
            slots.push({ start: cur, end: next, duration: slotMinutes, isMini: false });
            cur = next;
        }

        if (remainder >= miniSlotMinutes) {
            slots.push({ start: cur, end: cur + remainder, duration: remainder, isMini: true });
        }
    }

    return slots;
}

// =========================
// Priority Scoring
// =========================

function daysDenom(daysToExam: number, dampener: string): number {
    const d = Math.max(daysToExam, 1);
    // Exponential ramp-up for implicit deadlines (< 14 days)
    if (dampener === 'implicit' && d < 14) {
        return Math.max(d * 0.5, 0.5);
    }
    if (dampener === 'floor3') {
        return Math.max(d, 3);
    }
    // Log dampening
    return Math.log(d + 1) + 1;
}

interface PriorityResult {
    priority: number;
    reason: string;
    personalDiff: number;
}

export function computeChapterPriority(
    chapter: Chapter,
    exam: Exam | null, // Null allowed for implicit pacing
    targetDate: string,
    day: string,
    friction: UserFriction,
    config: SchedulerConfig,
    remainingHours: number,
    history: Record<string, string>
): PriorityResult {
    const focusWeight = safeFloat(config.focus_weight, 0.7, 0, 5);
    const pd = personalDifficulty(chapter, friction);

    // Use exam date if available, otherwise target date
    const deadline = exam?.date || targetDate;
    const deadlineDate = parseISO(deadline);
    const dayDate = parseISO(day);
    const daysToDeadline = Math.max(differenceInDays(deadlineDate, dayDate), 0);

    const chExamWeight = safeFloat(chapter.exam_weight, 1, 0, 5);
    const exWeight = exam ? safeFloat(exam.weight, 1, 0, 5) : 1;

    // Use implicit dampener if no hard exam date
    const dampener = exam ? (config.date_dampener || 'log') : 'implicit';
    const denom = daysDenom(Math.max(daysToDeadline, 1), dampener);

    // Core priority
    let priority = (pd * chExamWeight * exWeight) / denom * focusWeight;

    // Close deadline boost
    let closeBoost = 1;
    if (daysToDeadline <= 3) {
        closeBoost = 1.5;
        priority *= closeBoost;
    } else if (daysToDeadline <= 10 && !exam) {
        // Soft deadline approach
        closeBoost = 1.2;
        priority *= closeBoost;
    }

    // Incompleteness boost
    const est = Math.max(safeFloat(chapter.estimated_hours, 1, 0), 0.000001);
    const completion = clamp(1 - (remainingHours / est), 0, 1);
    const incompletenessBoost = 0.5 + (1 - completion);
    priority *= incompletenessBoost;

    // Question density boost
    const qd = clamp(safeFloat(chapter.question_density, 0.5, 0, 1), 0, 1);
    const qdBoost = 0.85 + 0.3 * qd;
    priority *= qdBoost;

    // History spacing penalty (disabled close to deadline)
    let histPen = 1;
    if (daysToDeadline > 3 && history[chapter.chapter_id]) {
        try {
            const lastDate = parseISO(history[chapter.chapter_id]);
            const ds = differenceInDays(dayDate, lastDate);
            if (ds <= 0) histPen = 0.7;
            else if (ds === 1) histPen = 0.85;
            else if (ds === 2) histPen = 0.95;
        } catch {
            histPen = 1;
        }
        priority *= histPen;
    }

    const reason = `priority=${priority.toFixed(3)} (diff=${pd.toFixed(2)}, days=${daysToDeadline}, denom=${denom.toFixed(2)}, close=${closeBoost}, incomp=${incompletenessBoost.toFixed(2)}, qd=${qdBoost.toFixed(2)}, hist=${histPen})`;

    return { priority, reason, personalDiff: pd };
}

// =========================
// Interleaving Picker
// =========================

interface Candidate {
    chapter_id: string;
    subject: string;
    chapter: Chapter;
    exam: Exam | null;
    priority: number;
    reason: string;
    pd: number;
    alloc_minutes: number;
}

function pickNextCandidate(
    candidates: Candidate[],
    lastSubject: string | null,
    lastChapterId: string | null
): Candidate | null {
    const best = (filterFn: (c: Candidate) => boolean): Candidate | null => {
        let b: Candidate | null = null;
        for (const c of candidates) {
            if (c.alloc_minutes <= 0) continue;
            if (!filterFn(c)) continue;
            if (!b || c.priority > b.priority) b = c;
        }
        return b;
    };

    // Tier 1: Different chapter AND different subject
    let pick = best(c => c.chapter_id !== lastChapterId && (lastSubject === null || c.subject !== lastSubject));
    if (pick) return pick;

    // Tier 2: Different chapter
    pick = best(c => c.chapter_id !== lastChapterId);
    if (pick) return pick;

    // Tier 3: Anything with allocation
    return best(() => true);
}

// =========================
// Main Scheduler
// =========================

export function generateAdaptiveSchedule(
    exams: Exam[],
    chapters: Chapter[],
    friction: UserFriction,
    blockers: TimeBlocker[],
    config: SchedulerConfig = {}
): (ScheduleDay | { summary: ScheduleSummary })[] {
    if (chapters.length > 500) {
        throw new Error('Too many chapters: must be < 500');
    }

    const mode = config.mode || 'base';
    const dailyMaxHours = safeFloat(config.daily_max_hours, 4, 0, 24);
    const minReviews = safeInt(config.min_reviews, 20, 0, 500);
    const slotMinutes = safeInt(config.slot_minutes, 30, 15, 120);
    const miniSlotMinutes = safeInt(config.mini_slot_minutes, 15, 10, slotMinutes);
    const dayStart = config.day_start || '06:00';
    const dayEnd = config.day_end || '22:00';
    const today = config.today || format(new Date(), 'yyyy-MM-dd');
    const history = config.history || {};

    // Determine the planning horizon
    // If no exams, fallback to target date or default 3 months
    const fallbackDate = config.target_completion_date || format(addDays(new Date(), 90), 'yyyy-MM-dd');

    // Sort valid exams
    const validExams = exams.filter(e => e.subject && e.date);
    validExams.sort((a, b) => a.date.localeCompare(b.date));

    // Determine max date: max(last exam date, target completion date)
    const lastExamDate = validExams.length > 0 ? validExams[validExams.length - 1].date : today;
    const maxExamDate = isAfter(parseISO(fallbackDate), parseISO(lastExamDate)) ? fallbackDate : lastExamDate;

    // Validate if any work is needed - but with pacing mode, we always have work if chapters exist
    if (chapters.length === 0) {
        return [{ summary: { today, total_coverage: 0, risk_chapters: [], remaining_hours_total: 0, mode, history_suggestions: {} } }];
    }

    const examsBySubject: Record<string, Exam[]> = {};
    for (const ex of validExams) {
        if (!examsBySubject[ex.subject]) examsBySubject[ex.subject] = [];
        examsBySubject[ex.subject].push(ex);
    }

    // Initialize remaining hours
    const remainingHours: Record<string, number> = {};
    let totalEstimated = 0;
    for (const ch of chapters) {
        remainingHours[ch.chapter_id] = ch.estimated_hours;
        totalEstimated += ch.estimated_hours;
    }

    const schedule: ScheduleDay[] = [];
    const suggestedHistory: Record<string, string> = {};
    let totalPlannedStudy = 0;

    let currentDay = today;
    while (currentDay <= maxExamDate) {
        let slots: Slot[];
        try {
            slots = buildTimeSlots(currentDay, blockers, dayStart, dayEnd, slotMinutes, miniSlotMinutes);
        } catch {
            schedule.push({
                date: currentDay,
                total_hours: 0,
                slots: [],
                friction_notes: [],
                warning: 'Invalid time configuration',
            });
            currentDay = format(addDays(parseISO(currentDay), 1), 'yyyy-MM-dd');
            continue;
        }

        const capMinutes = Math.round(dailyMaxHours * 60);
        const usableSlots: Slot[] = [];
        let used = 0;
        for (const s of slots) {
            if (used + s.duration > capMinutes) break;
            usableSlots.push(s);
            used += s.duration;
        }

        const dayDict: ScheduleDay = {
            date: currentDay,
            total_hours: 0,
            slots: [],
            friction_notes: [],
        };

        if (usableSlots.length === 0) {
            dayDict.warning = 'No slots; defer to tomorrow';
            schedule.push(dayDict);
            currentDay = format(addDays(parseISO(currentDay), 1), 'yyyy-MM-dd');
            continue;
        }

        // Score chapters
        const scored: Candidate[] = [];
        let totalRemaining = 0;

        for (const ch of chapters) {
            const rem = remainingHours[ch.chapter_id] || 0;
            totalRemaining += rem;

            if (rem <= 0.000001) continue;

            const exams = examsBySubject[ch.subject] || [];
            // Find exam or use fallback date
            const exam = exams.find(e => e.date >= currentDay) || null;

            // If no exam and no fallback target (unlikely due to utility setup), skip
            // The computeChapterPriority function handles the null exam case by using fallbackDate

            const { priority, reason, personalDiff } = computeChapterPriority(
                ch, exam, fallbackDate, currentDay, friction, config, rem, history
            );

            if (priority <= 0) continue;

            scored.push({
                chapter_id: ch.chapter_id,
                subject: ch.subject,
                chapter: ch,
                exam,
                priority,
                reason,
                pd: personalDiff,
                alloc_minutes: 0,
            });
        }

        // --- PRACTICE PAPER INJECTION ---
        // If > 90% total coverage and reasonable slot availability, suggest a paper
        // Check if we have high-mastery subjects
        const totalProgress = 1 - (totalRemaining / Math.max(totalEstimated, 1));
        if (totalProgress > 0.9 && usableSlots.length >= 2) { // Need at least 2 slots (approx 1h)
            // Pick subject with most finished chapters
            // Simulating an "Practice Paper" candidate
            const candidates = Object.keys(examsBySubject).map(subj => ({
                chapter_id: `PAPER_${subj}`,
                subject: subj,
                chapter: {
                    chapter_id: `PAPER_${subj}`,
                    subject: subj,
                    estimated_hours: 1.5,
                    default_difficulty: 0.5,
                    exam_weight: 1.5,
                    question_density: 1
                },
                exam: examsBySubject[subj][0] || null,
                priority: 2.0, // High priority boost
                reason: 'Practice Paper: Syllabus > 90% completed',
                pd: 0.5,
                alloc_minutes: 0
            }));

            // Only add if not already added
            for (const c of candidates) {
                if (Math.random() > 0.7) { // 30% chance to inject paper per day to avoid spam
                    scored.push(c);
                }
            }
        }

        scored.sort((a, b) => b.priority - a.priority);

        if (scored.length === 0) {
            // Fill with reviews only
            if (mode !== 'base') {
                for (const s of usableSlots) {
                    const cards = safeInt(minReviews * (s.duration / slotMinutes), 10, 6, 50);
                    dayDict.slots.push({
                        start: minutesToTime(s.start),
                        end: minutesToTime(s.end),
                        chapter_id: null,
                        subject: null,
                        type: s.isMini ? 'mini_review' : 'review',
                        cards,
                        reason: 'Light review (no remaining chapters)',
                    });
                }
            }
            dayDict.total_hours = used / 60;
            schedule.push(dayDict);
            currentDay = format(addDays(parseISO(currentDay), 1), 'yyyy-MM-dd');
            continue;
        }

        // Allocate minutes proportionally
        const totalPriority = scored.reduce((sum, x) => sum + x.priority, 0) || 1;
        for (const x of scored) {
            const shareMinutes = Math.round((x.priority / totalPriority) * capMinutes);
            const remMinutes = Math.round((remainingHours[x.chapter_id] || 0) * 60);
            const capChMinutes = Math.max(
                Math.round(x.chapter.estimated_hours * clamp(x.chapter.question_density, 0, 1) * 60),
                slotMinutes
            );
            x.alloc_minutes = Math.max(0, Math.min(shareMinutes, remMinutes, capChMinutes));
        }

        // Ensure top candidates have at least one slot
        const mainSlotsCount = usableSlots.filter(s => !s.isMini).length;
        if (mainSlotsCount > 0) {
            for (let i = 0; i < Math.min(5, scored.length); i++) {
                if (scored[i].alloc_minutes <= 0 && (remainingHours[scored[i].chapter_id] || 0) > 0.000001) {
                    scored[i].alloc_minutes = slotMinutes;
                }
            }
        }

        // Build schedule slots with interleaving
        const outSlots: ScheduleSlot[] = [];
        const studiedToday: string[] = [];
        let lastSubject: string | null = null;
        let lastChapter: string | null = null;

        for (const s of usableSlots) {
            if (s.isMini) {
                // Mini slots: review
                if (mode !== 'base') {
                    const targetId = studiedToday.length > 0 ? studiedToday[studiedToday.length - 1] : scored[0]?.chapter_id;
                    const target = scored.find(x => x.chapter_id === targetId) || scored[0];
                    if (target) {
                        const cards = computeSM2Cards(target.pd, minReviews, s.duration, slotMinutes);
                        outSlots.push({
                            start: minutesToTime(s.start),
                            end: minutesToTime(s.end),
                            chapter_id: target.chapter_id,
                            subject: target.subject,
                            noteId: target.chapter.noteId,
                            type: 'mini_review',
                            cards,
                            reason: `Mini review; ${target.reason}`,
                        });
                    }
                } else {
                    outSlots.push({
                        start: minutesToTime(s.start),
                        end: minutesToTime(s.end),
                        chapter_id: null,
                        subject: null,
                        type: 'break',
                        cards: null,
                        reason: 'Dead-air gap (base mode)',
                    });
                }
                continue;
            }

            // Main study slot
            const pick = pickNextCandidate(scored, lastSubject, lastChapter);
            if (!pick || pick.alloc_minutes <= 0) {
                if (mode !== 'base' && scored[0]) {
                    const cards = computeSM2Cards(scored[0].pd, minReviews, s.duration, slotMinutes);
                    outSlots.push({
                        start: minutesToTime(s.start),
                        end: minutesToTime(s.end),
                        chapter_id: scored[0].chapter_id,
                        subject: scored[0].subject,
                        noteId: scored[0].chapter.noteId,
                        type: 'review',
                        cards,
                        reason: `Fallback review; ${scored[0].reason}`,
                    });
                } else {
                    outSlots.push({
                        start: minutesToTime(s.start),
                        end: minutesToTime(s.end),
                        chapter_id: null,
                        subject: null,
                        type: 'buffer',
                        cards: null,
                        reason: 'Buffer (no alloc remaining)',
                    });
                }
                continue;
            }

            // Apply study time
            pick.alloc_minutes = Math.max(0, pick.alloc_minutes - s.duration);
            remainingHours[pick.chapter_id] = Math.max(0, (remainingHours[pick.chapter_id] || 0) - s.duration / 60);
            totalPlannedStudy += s.duration / 60;

            if (!studiedToday.includes(pick.chapter_id)) {
                studiedToday.push(pick.chapter_id);
            }
            suggestedHistory[pick.chapter_id] = currentDay;

            outSlots.push({
                start: minutesToTime(s.start),
                end: minutesToTime(s.end),
                chapter_id: pick.chapter_id,
                subject: pick.subject,
                noteId: pick.chapter.noteId,
                type: 'study',
                cards: null,
                reason: `Interleaved; ${pick.reason}`,
            });

            lastSubject = pick.subject;
            lastChapter = pick.chapter_id;
        }

        dayDict.slots = outSlots;
        dayDict.total_hours = used / 60;

        // Friction notes
        if (safeFloat(friction.avg_overrun, 0, 0, 1) >= 0.2) {
            dayDict.friction_notes.push('High overrun: keep buffers, reduce context switching');
        }
        if (safeFloat(friction.quiz_error_rate, 0, 0, 1) >= 0.25) {
            dayDict.friction_notes.push('High quiz error: add more worked examples');
        }

        schedule.push(dayDict);
        currentDay = format(addDays(parseISO(currentDay), 1), 'yyyy-MM-dd');
    }

    // Summary
    const riskChapters = chapters
        .filter(ch => (remainingHours[ch.chapter_id] || 0) > 0.000001)
        .map(ch => ch.chapter_id)
        .slice(0, 50);

    const totalCoverage = totalEstimated > 0.000001
        ? clamp(totalPlannedStudy / totalEstimated, 0, 1)
        : 0;

    return [
        ...schedule,
        {
            summary: {
                today,
                total_coverage: Math.round(totalCoverage * 1000) / 1000,
                risk_chapters: riskChapters,
                remaining_hours_total: Math.round(Object.values(remainingHours).reduce((a, b) => a + b, 0) * 100) / 100,
                mode,
                history_suggestions: suggestedHistory,
            },
        },
    ];
}

// =========================
// Friction Updater
// =========================

export interface TaskOutcome {
    predicted_hours?: number;
    actual_hours?: number;
    postponed?: boolean;
    quiz_error_rate?: number;
    revision_done?: boolean;
    revision_early?: boolean;
}

export function updateFriction(friction: UserFriction, outcomes: TaskOutcome[]): UserFriction {
    let avgOverrun = safeFloat(friction.avg_overrun, 0, 0, 1);
    let quizError = safeFloat(friction.quiz_error_rate, 0, 0, 1);
    let revFreq = safeFloat(friction.revision_frequency, 0, 0, 1);

    if (outcomes.length === 0) {
        return { avg_overrun: avgOverrun, quiz_error_rate: quizError, revision_frequency: revFreq };
    }

    let overrunHits = 0, underHits = 0, postponeHits = 0;
    const quizSamples: number[] = [];
    let revDone = 0, revEarly = 0;

    for (const o of outcomes) {
        const pred = safeFloat(o.predicted_hours, 0, 0);
        const act = safeFloat(o.actual_hours, 0, 0);

        if (pred > 0.000001) {
            if (act > pred * 1.2 && (act - pred) > 0.25) overrunHits++;
            else if (act < pred * 0.8 && (pred - act) > 0.25) underHits++;
        }

        if (o.postponed) postponeHits++;

        if (o.quiz_error_rate !== undefined) {
            quizSamples.push(clamp(safeFloat(o.quiz_error_rate, 0, 0, 1), 0, 1));
        }

        if (o.revision_done) revDone++;
        if (o.revision_early) revEarly++;
    }

    const n = Math.max(outcomes.length, 1);

    avgOverrun += (overrunHits / n) * 0.08;
    avgOverrun -= (underHits / n) * 0.05;
    avgOverrun += (postponeHits / n) * 0.05;
    avgOverrun = clamp(avgOverrun, 0, 1);

    if (quizSamples.length > 0) {
        const observed = quizSamples.reduce((a, b) => a + b, 0) / quizSamples.length;
        quizError = clamp(0.8 * quizError + 0.2 * observed, 0, 1);
    }

    revFreq += (revEarly / n) * 0.06;
    revFreq += (revDone / n) * 0.03;
    revFreq -= ((n - revDone) / n) * 0.02;
    revFreq = clamp(revFreq, 0, 1);

    return { avg_overrun: avgOverrun, quiz_error_rate: quizError, revision_frequency: revFreq };
}

// =========================
// Export Utilities
// =========================

export function scheduleToJSON(schedule: (ScheduleDay | { summary: ScheduleSummary })[]): string {
    return JSON.stringify(schedule, null, 2);
}

export function scheduleToICS(schedule: ScheduleDay[], calendarName: string = 'Study Planner'): string {
    const now = format(new Date(), "yyyyMMdd'T'HHmmss");
    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//MindVaultScheduler//EN',
        'CALSCALE:GREGORIAN',
        `X-WR-CALNAME:${calendarName}`,
    ];

    for (const day of schedule) {
        if (!day.slots) continue;
        const dateStr = day.date.replace(/-/g, '');

        for (const slot of day.slots) {
            const startTime = slot.start.replace(':', '') + '00';
            const endTime = slot.end.replace(':', '') + '00';
            const summary = `${slot.type.charAt(0).toUpperCase() + slot.type.slice(1)}: ${slot.subject || 'General'} ${slot.chapter_id || ''}`.trim();
            const desc = slot.reason.replace(/\n/g, ' ');
            const uid = `${dateStr}-${startTime}-${Math.random().toString(36).slice(2)}`;

            lines.push(
                'BEGIN:VEVENT',
                `UID:${uid}`,
                `DTSTAMP:${now}`,
                `DTSTART:${dateStr}T${startTime}`,
                `DTEND:${dateStr}T${endTime}`,
                `SUMMARY:${summary}`,
                `DESCRIPTION:${desc}`,
                'END:VEVENT'
            );
        }
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
}
