// Daily Planner Screen - Interactive schedule with deep linking
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    ArrowLeft,
    Calendar,
    Clock,
    CheckCircle,
    Circle,
    BookOpen,
    Brain,
    Coffee,
    Sparkles,
    RefreshCw,
    ChevronRight,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { format } from 'date-fns';

import GlassLayout from '../../../src/components/GlassLayout';
import GlassCard from '../../../src/components/GlassCard';
import { useThemeColors } from '../../../src/hooks/useThemeColors';
import { useHaptics } from '../../../src/hooks/useHaptics';
import { useSchedulerStore } from '../../../src/stores/scheduler';
import { useNotesStore, useExamStore } from '../../../src/stores';
import { ScheduleSlot } from '../../../src/services/scheduler';

// Slot type icons and colors
const getSlotStyle = (type: string, colors: any) => {
    switch (type) {
        case 'study':
            return { icon: BookOpen, color: colors.primary, bg: colors.primary + '20' };
        case 'review':
        case 'mini_review':
            return { icon: Brain, color: colors.warning, bg: colors.warning + '20' };
        case 'break':
        case 'buffer':
            return { icon: Coffee, color: colors.textSecondary, bg: colors.surfaceHighlight };
        default:
            return { icon: Circle, color: colors.textMuted, bg: colors.surface };
    }
};

export default function DailyPlannerScreen() {
    const router = useRouter();
    const colors = useThemeColors();
    const haptics = useHaptics();

    const {
        schedule,
        summary,
        isLoading,
        lastGenerated,
        loadSchedule,
        getTodaySchedule,
        markSlotCompleted,
        generateSchedule,
    } = useSchedulerStore();

    const notes = useNotesStore(state => state.notes);
    const exams = useExamStore(state => state.exams);

    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const todaySchedule = schedule.find(d => d.date === selectedDate);

    useEffect(() => {
        loadSchedule();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadSchedule();
        setRefreshing(false);
    }, [loadSchedule]);

    const handleSlotPress = (slot: ScheduleSlot, index: number) => {
        haptics.selection();

        // If completed, toggle off - otherwise navigate
        if (slot.completed) {
            // Could toggle, but for now just acknowledge
            return;
        }

        // Deep link based on slot content
        if (slot.subject) {
            // Find notes for this subject/chapter
            const matchingNote = notes.find(n =>
                slot.noteId ? n.id === slot.noteId :
                    slot.chapter_id ? n.title.toLowerCase().includes(slot.chapter_id.toLowerCase()) :
                        n.subject === slot.subject
            );

            if (matchingNote) {
                router.push(`/note/${matchingNote.id}`);
            } else {
                // Navigate to notes filtered by subject
                router.push({
                    pathname: '/(tabs)/notes',
                    params: { filterSubject: slot.subject }
                });
            }
        }
    };

    const handleCompleteSlot = async (slot: ScheduleSlot, index: number) => {
        haptics.success();
        await markSlotCompleted(selectedDate, index);
    };

    const handleRegenerate = async () => {
        haptics.medium();

        // Convert exams from store to scheduler format
        // ExamSchedule uses subjectName and examDate (number), scheduler uses subject and date (string)
        const schedulerExams = exams.map(e => ({
            subject: e.subjectName,
            date: format(new Date(e.examDate), 'yyyy-MM-dd'),
            weight: 1,
        }));

        // Create chapters from notes
        const chapters = notes.map(n => ({
            chapter_id: n.id,
            subject: n.subject,
            estimated_hours: 2, // Default
            default_difficulty: 0.5,
            exam_weight: 1,
            question_density: 0.5,
            noteId: n.id,
        }));

        await generateSchedule(schedulerExams, chapters);
    };

    // Calculate progress
    const completedSlots = todaySchedule?.slots.filter(s => s.completed).length || 0;
    const totalSlots = todaySchedule?.slots.length || 0;
    const progress = totalSlots > 0 ? (completedSlots / totalSlots) * 100 : 0;

    return (
        <GlassLayout>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: colors.text }]}>Daily Planner</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {format(new Date(selectedDate), 'EEEE, MMM d')}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={handleRegenerate}
                    style={[styles.regenBtn, { backgroundColor: colors.primary + '20' }]}
                    disabled={isLoading}
                >
                    <RefreshCw size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Progress Card */}
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                    <GlassCard style={styles.progressCard} intensity={30}>
                        <View style={styles.progressHeader}>
                            <Text style={[styles.progressTitle, { color: colors.text }]}>
                                Today's Progress
                            </Text>
                            <Text style={[styles.progressPercent, { color: colors.primary }]}>
                                {Math.round(progress)}%
                            </Text>
                        </View>
                        <View style={[styles.progressBar, { backgroundColor: colors.surfaceHighlight }]}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${progress}%`, backgroundColor: colors.primary },
                                ]}
                            />
                        </View>
                        <Text style={[styles.progressSub, { color: colors.textSecondary }]}>
                            {completedSlots} of {totalSlots} tasks completed
                        </Text>
                    </GlassCard>
                </Animated.View>

                {/* AI Commentary */}
                {todaySchedule?.ai_commentary && (
                    <Animated.View entering={FadeInDown.delay(200).springify()}>
                        <GlassCard style={[styles.aiCard, { borderColor: colors.primary + '40' }]} intensity={20}>
                            <View style={styles.aiHeader}>
                                <Sparkles size={18} color={colors.primary} />
                                <Text style={[styles.aiTitle, { color: colors.primary }]}>AI Insight</Text>
                            </View>
                            <Text style={[styles.aiText, { color: colors.text }]}>
                                {todaySchedule.ai_commentary}
                            </Text>
                        </GlassCard>
                    </Animated.View>
                )}

                {/* Friction Notes */}
                {todaySchedule?.friction_notes && todaySchedule.friction_notes.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(250).springify()}>
                        <View style={styles.frictionNotes}>
                            {todaySchedule.friction_notes.map((note, i) => (
                                <Text key={i} style={[styles.frictionNote, { color: colors.warning }]}>
                                    ⚠️ {note}
                                </Text>
                            ))}
                        </View>
                    </Animated.View>
                )}

                {/* Schedule Slots */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                            Generating your schedule...
                        </Text>
                    </View>
                ) : !todaySchedule || todaySchedule.slots.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Calendar size={48} color={colors.textMuted} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Schedule Yet</Text>
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            Add exams and notes, then tap the refresh button to generate your personalized study plan.
                        </Text>
                        <TouchableOpacity
                            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                            onPress={handleRegenerate}
                        >
                            <Text style={styles.emptyBtnText}>Generate Schedule</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.slotsContainer}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            Today's Plan
                        </Text>
                        {todaySchedule.slots.map((slot, index) => {
                            const style = getSlotStyle(slot.type, colors);
                            const IconComponent = style.icon;

                            return (
                                <Animated.View
                                    key={`${slot.start}-${index}`}
                                    entering={FadeInDown.delay(300 + index * 50).springify()}
                                    layout={Layout.springify()}
                                >
                                    <TouchableOpacity
                                        onPress={() => handleSlotPress(slot, index)}
                                        activeOpacity={0.7}
                                    >
                                        <GlassCard
                                            style={[
                                                styles.slotCard,
                                                slot.completed && styles.slotCompleted,
                                            ]}
                                            intensity={20}
                                        >
                                            <View style={styles.slotTimeCol}>
                                                <Text style={[styles.slotTime, { color: colors.text }]}>
                                                    {slot.start}
                                                </Text>
                                                <View style={[styles.timeLine, { backgroundColor: style.color }]} />
                                                <Text style={[styles.slotTime, { color: colors.textSecondary }]}>
                                                    {slot.end}
                                                </Text>
                                            </View>

                                            <View style={[styles.slotIcon, { backgroundColor: style.bg }]}>
                                                <IconComponent size={20} color={style.color} />
                                            </View>

                                            <View style={styles.slotContent}>
                                                <View style={styles.slotHeader}>
                                                    <Text
                                                        style={[
                                                            styles.slotType,
                                                            { color: style.color },
                                                            slot.completed && styles.slotTextCompleted,
                                                        ]}
                                                    >
                                                        {slot.type.replace('_', ' ').toUpperCase()}
                                                    </Text>
                                                    {slot.cards && (
                                                        <Text style={[styles.cardsBadge, { color: colors.warning }]}>
                                                            {slot.cards} cards
                                                        </Text>
                                                    )}
                                                </View>
                                                {slot.subject && (
                                                    <Text
                                                        style={[
                                                            styles.slotSubject,
                                                            { color: colors.text },
                                                            slot.completed && styles.slotTextCompleted,
                                                        ]}
                                                    >
                                                        {slot.subject}
                                                        {slot.chapter_id ? ` - ${slot.chapter_id}` : ''}
                                                    </Text>
                                                )}
                                            </View>

                                            {/* Complete checkbox */}
                                            <TouchableOpacity
                                                onPress={() => handleCompleteSlot(slot, index)}
                                                style={styles.checkBtn}
                                            >
                                                {slot.completed ? (
                                                    <CheckCircle size={24} color={colors.success} />
                                                ) : (
                                                    <Circle size={24} color={colors.textMuted} />
                                                )}
                                            </TouchableOpacity>
                                        </GlassCard>
                                    </TouchableOpacity>
                                </Animated.View>
                            );
                        })}
                    </View>
                )}

                {/* Last Generated */}
                {lastGenerated && (
                    <Text style={[styles.lastGen, { color: colors.textMuted }]}>
                        Last updated: {lastGenerated}
                    </Text>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>
        </GlassLayout>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 12,
    },
    backBtn: { padding: 8 },
    title: { fontSize: 24, fontWeight: '700' },
    subtitle: { fontSize: 14, marginTop: 2 },
    regenBtn: {
        padding: 12,
        borderRadius: 12,
    },

    content: { padding: 20, paddingTop: 0 },

    progressCard: { padding: 20, marginBottom: 20 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    progressTitle: { fontSize: 16, fontWeight: '600' },
    progressPercent: { fontSize: 24, fontWeight: '800' },
    progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    progressSub: { marginTop: 8, fontSize: 12 },

    aiCard: { padding: 16, marginBottom: 20, borderWidth: 1, borderRadius: 16 },
    aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    aiTitle: { fontWeight: '600' },
    aiText: { fontSize: 14, lineHeight: 20 },

    frictionNotes: { marginBottom: 20, gap: 8 },
    frictionNote: { fontSize: 12, fontWeight: '500' },

    loadingContainer: { alignItems: 'center', paddingVertical: 60 },
    loadingText: { marginTop: 16, fontSize: 14 },

    emptyContainer: { alignItems: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 20 },
    emptyText: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 20 },
    emptyBtn: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    emptyBtnText: { color: '#fff', fontWeight: '600' },

    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    slotsContainer: { marginTop: 10 },

    slotCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
        gap: 12,
    },
    slotCompleted: { opacity: 0.6 },

    slotTimeCol: { alignItems: 'center', width: 50 },
    slotTime: { fontSize: 12, fontWeight: '600' },
    timeLine: { width: 2, height: 20, marginVertical: 4, borderRadius: 1 },

    slotIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },

    slotContent: { flex: 1 },
    slotHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    slotType: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    cardsBadge: { fontSize: 10, fontWeight: '600' },
    slotSubject: { fontSize: 16, fontWeight: '600', marginTop: 2 },
    slotTextCompleted: { textDecorationLine: 'line-through' },

    checkBtn: { padding: 4 },

    lastGen: { textAlign: 'center', fontSize: 11, marginTop: 20 },
});
