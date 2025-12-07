// Home Screen - Today's Plan & Dashboard
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flame, BookOpen, CheckCircle2, Clock, ChevronRight, Sparkles, Target, Plus, Calendar, FileText } from 'lucide-react-native';
import { useNotesStore, useTasksStore, useExamStore, useStreakStore } from '../../src/stores';
import { useThemeColors } from '../../hooks/useThemeColors';
import { format, differenceInDays } from 'date-fns';

export default function HomeScreen() {
    const router = useRouter();
    const colors = useThemeColors();
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
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar barStyle={colors.text === '#1e293b' ? 'dark-content' : 'light-content'} />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.greeting, { color: colors.textSecondary }]}>Good {getTimeOfDay()}</Text>
                        <Text style={[styles.title, { color: colors.text }]}>Today's Plan</Text>
                    </View>
                    <TouchableOpacity style={[styles.streakBadge, { backgroundColor: colors.surface }]}>
                        <Flame size={20} color={streak.currentStreak > 0 ? '#f59e0b' : colors.textMuted} />
                        <Text style={[styles.streakText, { color: streak.currentStreak > 0 ? '#f59e0b' : colors.textMuted }]}>
                            {streak.currentStreak}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsScroll} contentContainerStyle={styles.quickActionsContent}>
                    <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.surface }]} onPress={() => router.push('/(tabs)/routine')}>
                        <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + '20' }]}>
                            <Plus size={20} color={colors.primary} />
                        </View>
                        <Text style={[styles.quickActionText, { color: colors.text }]}>Add Task</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.surface }]} onPress={() => router.push('/(tabs)/notes')}>
                        <View style={[styles.quickActionIcon, { backgroundColor: colors.secondary + '20' }]}>
                            <FileText size={20} color={colors.secondary} />
                        </View>
                        <Text style={[styles.quickActionText, { color: colors.text }]}>New Note</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.quickAction, { backgroundColor: colors.surface }]} onPress={() => router.push('/modals/ai-chat')}>
                        <View style={[styles.quickActionIcon, { backgroundColor: colors.accent + '20' }]}>
                            <Sparkles size={20} color={colors.accent} />
                        </View>
                        <Text style={[styles.quickActionText, { color: colors.text }]}>AI Chat</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                        <CheckCircle2 size={24} color={colors.success} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{completedToday}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                        <Target size={24} color={colors.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{todaysTasks.length}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                        <BookOpen size={24} color={colors.secondary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{notes.length}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Notes</Text>
                    </View>
                </View>

                {/* Today's Tasks */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Tasks</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/routine')}>
                            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    {todaysTasks.length === 0 ? (
                        <View style={styles.emptyState}>
                            <CheckCircle2 size={32} color={colors.success} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>All tasks completed! 🎉</Text>
                        </View>
                    ) : (
                        todaysTasks.slice(0, 4).map(task => (
                            <TouchableOpacity key={task.id} style={[styles.taskItem, { backgroundColor: colors.surface }]}>
                                <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(task.priority, colors) }]} />
                                <Text style={[styles.taskText, { color: colors.text }]} numberOfLines={1}>{task.text}</Text>
                                <ChevronRight size={18} color={colors.textMuted} />
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Upcoming Exams */}
                {upcomingExams.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Exams</Text>
                            <TouchableOpacity onPress={() => router.push('/(tabs)/routine')}>
                                <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
                            </TouchableOpacity>
                        </View>
                        {upcomingExams.map(exam => (
                            <View key={exam.id} style={[styles.examCard, { backgroundColor: colors.surface }]}>
                                <View style={styles.examInfo}>
                                    <Text style={[styles.examSubject, { color: colors.text }]}>{exam.subjectName}</Text>
                                    <Text style={[styles.examDate, { color: colors.textSecondary }]}>{format(exam.examDate, 'MMM d, yyyy')}</Text>
                                </View>
                                <View style={[styles.examCountdown, { backgroundColor: colors.primary + '15' }]}>
                                    <Text style={[styles.countdownNumber, { color: colors.primary }]}>
                                        {differenceInDays(exam.examDate, Date.now())}
                                    </Text>
                                    <Text style={[styles.countdownLabel, { color: colors.primary }]}>days</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Recent Notes */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Notes</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/notes')}>
                            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    {recentNotes.length === 0 ? (
                        <View style={styles.emptyState}>
                            <BookOpen size={32} color={colors.textMuted} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No notes yet</Text>
                        </View>
                    ) : (
                        recentNotes.map(note => (
                            <TouchableOpacity
                                key={note.id}
                                style={[styles.noteItem, { backgroundColor: colors.surface }]}
                                onPress={() => router.push(`/note/${note.id}`)}
                            >
                                <View style={styles.noteInfo}>
                                    <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>{note.title}</Text>
                                    <Text style={[styles.noteSubject, { color: colors.textSecondary }]}>{note.subject}</Text>
                                </View>
                                <ChevronRight size={18} color={colors.textMuted} />
                            </TouchableOpacity>
                        ))
                    )}
                </View>
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

function getPriorityColor(priority: string, colors: any): string {
    switch (priority) {
        case 'high': return colors.error;
        case 'medium': return colors.warning;
        case 'low': return colors.success;
        default: return colors.textMuted;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        marginBottom: 20,
    },
    greeting: {
        fontSize: 14,
        fontWeight: '500',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    streakText: {
        fontSize: 16,
        fontWeight: '700',
    },
    quickActionsScroll: {
        marginBottom: 24,
        marginHorizontal: -20,
    },
    quickActionsContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
    quickAction: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        gap: 8,
        minWidth: 110,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    quickActionIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickActionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
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
    },
    seeAll: {
        fontSize: 14,
        fontWeight: '600',
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    priorityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    taskText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    examCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    examInfo: {
        flex: 1,
    },
    examSubject: {
        fontSize: 16,
        fontWeight: '600',
    },
    examDate: {
        fontSize: 13,
        marginTop: 2,
    },
    examCountdown: {
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    countdownNumber: {
        fontSize: 18,
        fontWeight: '700',
    },
    countdownLabel: {
        fontSize: 10,
    },
    noteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    noteInfo: {
        flex: 1,
    },
    noteTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    noteSubject: {
        fontSize: 12,
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        padding: 32,
        gap: 8,
    },
    emptyText: {
        fontSize: 14,
    },
});