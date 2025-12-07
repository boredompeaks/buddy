// Home Screen - Today's Plan & Dashboard
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flame, BookOpen, CheckCircle2, Clock, ChevronRight, Sparkles, Target } from 'lucide-react-native';
import { useNotesStore, useTasksStore, useExamStore, useStreakStore } from '../../src/stores';
import { COLORS } from '../../src/constants';
import { format, differenceInDays } from 'date-fns';

export default function HomeScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);

    const notes = useNotesStore(state => state.notes);
    const loadNotes = useNotesStore(state => state.loadNotes);
    const tasks = useTasksStore(state => state.tasks);
    const loadTasks = useTasksStore(state => state.loadTasks);
    const exams = useExamStore(state => state.exams);
    const streak = useStreakStore(state => state.streak);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([loadNotes(), loadTasks()]);
        setRefreshing(false);
    }, []);

    // Today's tasks
    const todaysTasks = useMemo(() => {
        return tasks.filter(t => t.category === 'daily' && !t.completed);
    }, [tasks]);

    // Completed today
    const completedToday = useMemo(() => {
        const today = new Date().setHours(0, 0, 0, 0);
        return tasks.filter(t => t.completedAt && t.completedAt >= today).length;
    }, [tasks]);

    // Upcoming exams (next 30 days)
    const upcomingExams = useMemo(() => {
        const now = Date.now();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        return exams
            .filter(e => e.examDate > now && e.examDate < now + thirtyDays)
            .sort((a, b) => a.examDate - b.examDate)
            .slice(0, 3);
    }, [exams]);

    // Recent notes
    const recentNotes = useMemo(() => {
        return notes.slice(0, 5);
    }, [notes]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Good {getTimeOfDay()}</Text>
                        <Text style={styles.title}>Today's Plan</Text>
                    </View>
                    <TouchableOpacity style={styles.streakBadge}>
                        <Flame size={20} color={streak.currentStreak > 0 ? '#f59e0b' : COLORS.light.textMuted} />
                        <Text style={[styles.streakText, streak.currentStreak > 0 && styles.streakActive]}>
                            {streak.currentStreak}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <CheckCircle2 size={24} color={COLORS.light.success} />
                        <Text style={styles.statValue}>{completedToday}</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Target size={24} color={COLORS.light.primary} />
                        <Text style={styles.statValue}>{todaysTasks.length}</Text>
                        <Text style={styles.statLabel}>Pending</Text>
                    </View>
                    <View style={styles.statCard}>
                        <BookOpen size={24} color={COLORS.light.secondary} />
                        <Text style={styles.statValue}>{notes.length}</Text>
                        <Text style={styles.statLabel}>Notes</Text>
                    </View>
                </View>

                {/* Today's Tasks */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Today's Tasks</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/routine')}>
                            <Text style={styles.seeAll}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    {todaysTasks.length === 0 ? (
                        <View style={styles.emptyState}>
                            <CheckCircle2 size={32} color={COLORS.light.success} />
                            <Text style={styles.emptyText}>All tasks completed! 🎉</Text>
                        </View>
                    ) : (
                        todaysTasks.slice(0, 4).map(task => (
                            <TouchableOpacity key={task.id} style={styles.taskItem}>
                                <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(task.priority) }]} />
                                <Text style={styles.taskText} numberOfLines={1}>{task.text}</Text>
                                <ChevronRight size={18} color={COLORS.light.textMuted} />
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Upcoming Exams */}
                {upcomingExams.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Upcoming Exams</Text>
                            <TouchableOpacity onPress={() => router.push('/(tabs)/routine')}>
                                <Text style={styles.seeAll}>See All</Text>
                            </TouchableOpacity>
                        </View>
                        {upcomingExams.map(exam => (
                            <View key={exam.id} style={styles.examCard}>
                                <View style={styles.examInfo}>
                                    <Text style={styles.examSubject}>{exam.subjectName}</Text>
                                    <Text style={styles.examDate}>{format(exam.examDate, 'MMM d, yyyy')}</Text>
                                </View>
                                <View style={styles.examCountdown}>
                                    <Text style={styles.countdownNumber}>
                                        {differenceInDays(exam.examDate, Date.now())}
                                    </Text>
                                    <Text style={styles.countdownLabel}>days</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Recent Notes */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Notes</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/notes')}>
                            <Text style={styles.seeAll}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    {recentNotes.length === 0 ? (
                        <View style={styles.emptyState}>
                            <BookOpen size={32} color={COLORS.light.textMuted} />
                            <Text style={styles.emptyText}>No notes yet</Text>
                        </View>
                    ) : (
                        recentNotes.map(note => (
                            <TouchableOpacity
                                key={note.id}
                                style={styles.noteItem}
                                onPress={() => router.push(`/note/${note.id}`)}
                            >
                                <View style={styles.noteInfo}>
                                    <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
                                    <Text style={styles.noteSubject}>{note.subject}</Text>
                                </View>
                                <ChevronRight size={18} color={COLORS.light.textMuted} />
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* AI Study Assistant CTA */}
                <TouchableOpacity
                    style={styles.aiCta}
                    onPress={() => router.push('/modals/ai-chat')}
                >
                    <Sparkles size={24} color="#fff" />
                    <View style={styles.aiCtaText}>
                        <Text style={styles.aiCtaTitle}>AI Study Assistant</Text>
                        <Text style={styles.aiCtaSubtitle}>Ask doubts, generate quizzes, and more</Text>
                    </View>
                    <ChevronRight size={24} color="#fff" />
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

function getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
}

function getPriorityColor(priority: string): string {
    switch (priority) {
        case 'high': return COLORS.light.error;
        case 'medium': return COLORS.light.warning;
        case 'low': return COLORS.light.success;
        default: return COLORS.light.textMuted;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.light.background,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    greeting: {
        fontSize: 14,
        color: COLORS.light.textSecondary,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.light.text,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.light.surface,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    streakText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.light.textMuted,
    },
    streakActive: {
        color: '#f59e0b',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.light.surface,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.light.text,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.light.textSecondary,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.light.text,
    },
    seeAll: {
        fontSize: 14,
        color: COLORS.light.primary,
        fontWeight: '600',
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.light.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
    },
    priorityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    taskText: {
        flex: 1,
        fontSize: 15,
        color: COLORS.light.text,
    },
    examCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.light.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    examInfo: {
        flex: 1,
    },
    examSubject: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.light.text,
    },
    examDate: {
        fontSize: 13,
        color: COLORS.light.textSecondary,
        marginTop: 2,
    },
    examCountdown: {
        alignItems: 'center',
        backgroundColor: COLORS.light.primary + '15',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    countdownNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.light.primary,
    },
    countdownLabel: {
        fontSize: 11,
        color: COLORS.light.primary,
    },
    noteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.light.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    noteInfo: {
        flex: 1,
    },
    noteTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.light.text,
    },
    noteSubject: {
        fontSize: 12,
        color: COLORS.light.textSecondary,
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        padding: 32,
        gap: 8,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.light.textSecondary,
    },
    aiCta: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.light.primary,
        padding: 20,
        borderRadius: 16,
        gap: 16,
        marginTop: 8,
    },
    aiCtaText: {
        flex: 1,
    },
    aiCtaTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    aiCtaSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
});
