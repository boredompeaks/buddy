// Scheduler Store - Zustand store for adaptive study scheduling
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    generateAdaptiveSchedule,
    updateFriction as updateFrictionCalc,
    ScheduleDay,
    ScheduleSummary,
    ScheduleSlot,
    UserFriction,
    Chapter,
    Exam,
    TimeBlocker,
    SchedulerConfig,
    TaskOutcome,
} from '../services/scheduler';
import { narrateSchedule } from '../services/ai';
import { format } from 'date-fns';

const SCHEDULER_STORAGE_KEY = 'mindvault_scheduler';
const FRICTION_STORAGE_KEY = 'mindvault_friction';
const BLOCKERS_STORAGE_KEY = 'mindvault_time_blockers';

interface SchedulerState {
    schedule: ScheduleDay[];
    summary: ScheduleSummary | null;
    friction: UserFriction;
    blockers: TimeBlocker[];
    isLoading: boolean;
    error: string | null;
    lastGenerated: string | null;

    // Actions
    loadSchedule: () => Promise<void>;
    generateSchedule: (exams: Exam[], chapters: Chapter[], config?: SchedulerConfig) => Promise<void>;
    markSlotCompleted: (date: string, slotIndex: number) => Promise<void>;
    addBlocker: (blocker: TimeBlocker) => Promise<void>;
    removeBlocker: (date: string, start: string) => Promise<void>;
    updateFriction: (outcomes: TaskOutcome[]) => Promise<void>;
    getTodaySchedule: () => ScheduleDay | null;
    getSlotsBySubject: (subject: string) => ScheduleSlot[];
    clearSchedule: () => Promise<void>;
}

const defaultFriction: UserFriction = {
    avg_overrun: 0,
    quiz_error_rate: 0,
    revision_frequency: 0,
};

export const useSchedulerStore = create<SchedulerState>((set, get) => ({
    schedule: [],
    summary: null,
    friction: defaultFriction,
    blockers: [],
    isLoading: false,
    error: null,
    lastGenerated: null,

    loadSchedule: async () => {
        set({ isLoading: true, error: null });
        try {
            // Load schedule
            const savedSchedule = await AsyncStorage.getItem(SCHEDULER_STORAGE_KEY);
            if (savedSchedule) {
                try {
                    const parsed = JSON.parse(savedSchedule);
                    set({
                        schedule: parsed.schedule || [],
                        summary: parsed.summary || null,
                        lastGenerated: parsed.lastGenerated || null,
                    });
                } catch {
                    await AsyncStorage.removeItem(SCHEDULER_STORAGE_KEY);
                }
            }

            // Load friction
            const savedFriction = await AsyncStorage.getItem(FRICTION_STORAGE_KEY);
            if (savedFriction) {
                try {
                    const parsed = JSON.parse(savedFriction);
                    set({ friction: { ...defaultFriction, ...parsed } });
                } catch {
                    await AsyncStorage.removeItem(FRICTION_STORAGE_KEY);
                }
            }

            // Load blockers
            const savedBlockers = await AsyncStorage.getItem(BLOCKERS_STORAGE_KEY);
            if (savedBlockers) {
                try {
                    set({ blockers: JSON.parse(savedBlockers) });
                } catch {
                    await AsyncStorage.removeItem(BLOCKERS_STORAGE_KEY);
                }
            }

            set({ isLoading: false });
        } catch (error) {
            console.error('Failed to load scheduler data:', error);
            set({ isLoading: false, error: 'Failed to load schedule' });
        }
    },

    generateSchedule: async (exams, chapters, config = {}) => {
        set({ isLoading: true, error: null });
        try {
            const { friction, blockers } = get();

            const fullConfig: SchedulerConfig = {
                mode: 'assisted',
                daily_max_hours: 4,
                min_reviews: 20,
                slot_minutes: 30,
                mini_slot_minutes: 15,
                day_start: '06:00',
                day_end: '22:00',
                today: format(new Date(), 'yyyy-MM-dd'),
                date_dampener: 'log',
                focus_weight: 0.7,
                ...config,
            };

            const result = generateAdaptiveSchedule(exams, chapters, friction, blockers, fullConfig);

            // Separate schedule days from summary
            const scheduleDays: ScheduleDay[] = [];
            let summary: ScheduleSummary | null = null;

            for (const item of result) {
                if ('summary' in item) {
                    summary = item.summary;
                } else {
                    scheduleDays.push(item);
                }
            }

            // Generate AI commentary for the schedule
            try {
                const commentary = await narrateSchedule(scheduleDays);
                const today = format(new Date(), 'yyyy-MM-dd');
                const todayIndex = scheduleDays.findIndex(d => d.date === today);
                if (todayIndex >= 0) {
                    scheduleDays[todayIndex] = {
                        ...scheduleDays[todayIndex],
                        ai_commentary: commentary,
                    };
                }
            } catch (narrateError) {
                console.warn('Failed to generate AI commentary:', narrateError);
            }

            const now = format(new Date(), 'yyyy-MM-dd HH:mm');

            // Save to storage
            await AsyncStorage.setItem(SCHEDULER_STORAGE_KEY, JSON.stringify({
                schedule: scheduleDays,
                summary,
                lastGenerated: now,
            }));

            set({
                schedule: scheduleDays,
                summary,
                lastGenerated: now,
                isLoading: false,
            });
        } catch (error) {
            console.error('Failed to generate schedule:', error);
            set({ isLoading: false, error: 'Failed to generate schedule' });
        }
    },

    markSlotCompleted: async (date, slotIndex) => {
        const { schedule } = get();
        const updatedSchedule = schedule.map(day => {
            if (day.date === date && day.slots[slotIndex]) {
                return {
                    ...day,
                    slots: day.slots.map((slot, i) =>
                        i === slotIndex ? { ...slot, completed: true } : slot
                    ),
                };
            }
            return day;
        });

        await AsyncStorage.setItem(SCHEDULER_STORAGE_KEY, JSON.stringify({
            schedule: updatedSchedule,
            summary: get().summary,
            lastGenerated: get().lastGenerated,
        }));

        set({ schedule: updatedSchedule });
    },

    addBlocker: async (blocker) => {
        const { blockers } = get();
        const updated = [...blockers, blocker];
        await AsyncStorage.setItem(BLOCKERS_STORAGE_KEY, JSON.stringify(updated));
        set({ blockers: updated });
    },

    removeBlocker: async (date, start) => {
        const { blockers } = get();
        const updated = blockers.filter(b => !(b.date === date && b.start === start));
        await AsyncStorage.setItem(BLOCKERS_STORAGE_KEY, JSON.stringify(updated));
        set({ blockers: updated });
    },

    updateFriction: async (outcomes) => {
        const { friction } = get();
        const updated = updateFrictionCalc(friction, outcomes);
        await AsyncStorage.setItem(FRICTION_STORAGE_KEY, JSON.stringify(updated));
        set({ friction: updated });
    },

    getTodaySchedule: () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        return get().schedule.find(day => day.date === today) || null;
    },

    getSlotsBySubject: (subject) => {
        const { schedule } = get();
        const slots: ScheduleSlot[] = [];
        for (const day of schedule) {
            for (const slot of day.slots) {
                if (slot.subject === subject) {
                    slots.push(slot);
                }
            }
        }
        return slots;
    },

    clearSchedule: async () => {
        await AsyncStorage.removeItem(SCHEDULER_STORAGE_KEY);
        set({ schedule: [], summary: null, lastGenerated: null });
    },
}));
