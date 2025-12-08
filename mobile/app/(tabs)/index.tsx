// Home Screen - Today's Plan & Dashboard
// Enhanced with LinearGradient, Glassmorphism, and Reanimated Animations
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flame, BookOpen, CheckCircle2, ChevronRight, Sparkles, Target, Plus, Brain, FileText } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNotesStore, useTasksStore, useExamStore, useStreakStore } from '../../src/stores';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useResponsiveLayout } from '../../src/hooks/useResponsiveLayout';
import { format, differenceInDays } from 'date-fns';

export default function HomeScreen() {
    const router = useRouter();
    const colors = useThemeColors();
    const { numColumns, gap, containerPadding, isLandscape } = useResponsiveLayout();
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
        return [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
    }, [notes]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header Background */}
            <LinearGradient
                colors={[colors.primary, colors.primary + '80']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.headerGradient, { height: isLandscape ? 120 : 180 }]}
            />

            <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
                <ScrollView
                    contentContainerStyle={[styles.content, { padding: containerPadding }]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header Content */}
                    <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.headerContent}>
                        <View>
                            <Text style={styles.greeting}>Welcome back,</Text>
                            <Text style={styles.username}>Student</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.streakBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                            onPress={() => router.push('/(tabs)/profile')}
                        >
                            <Flame size={20} color="#FFD700" fill="#FFD700" />
                            <Text style={styles.streakText}>{streak.currentStreak} Day Streak</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Main Grid */}
                    <View style={[styles.grid, { gap }]}>

                        {/* 1. Quick Progress (2 cols on tablet) */}
                        <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.card, { backgroundColor: colors.surface, flex: numColumns > 1 ? 1 : undefined }]}>
                            <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                                <View style={styles.cardIconRow}>
                                    <Target size={20} color={colors.primary} />
                                    <Text style={[styles.cardTitle, { color: colors.text }]}>Today's Focus</Text>
                                </View>
                                <Text style={[styles.countBadge, { color: colors.textSecondary }]}>{todaysTasks.length} tasks</Text>
                            </View>
                            {todaysTasks.length > 0 ? (
                                todaysTasks.slice(0, 3).map(task => (
                                    <View key={task.id} style={styles.taskItem}>
                                        <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
                                        <Text style={[styles.taskText, { color: colors.text }]} numberOfLines={1}>{task.text}</Text>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.emptyState}>
                                    <CheckCircle2 size={32} color={colors.success} />
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>All caught up!</Text>
                                </View>
                            )}
                            <TouchableOpacity style={styles.cardAction} onPress={() => router.push('/(tabs)/routine')}>
                                <Text style={[styles.cardActionText, { color: colors.primary }]}>View Schedule</Text>
                                <ChevronRight size={16} color={colors.primary} />
                            </TouchableOpacity>
                        </Animated.View>

                        {/* 2. Quick Actions (Always visible) */}
                        <View style={[styles.actionGrid, { flex: numColumns > 1 ? 1 : undefined }]}>
                            <Animated.View entering={FadeInDown.delay(300).springify()}>
                                <TouchableOpacity
                                    style={[styles.actionCard, { backgroundColor: colors.primary }]}
                                    onPress={() => router.push({ pathname: '/(tabs)/notes', params: { action: 'new' } })}
                                >
                                    <Plus size={24} color="#FFF" />
                                    <Text style={styles.actionTextWhite}>New Note</Text>
                                </TouchableOpacity>
                            </Animated.View>

                            <Animated.View entering={FadeInDown.delay(350).springify()}>
                                <TouchableOpacity
                                    style={[styles.actionCard, { backgroundColor: colors.surface }]}
                                    onPress={() => router.push('/(tabs)/study/quiz')}
                                >
                                    <Brain size={24} color={colors.primary} />
                                    <Text style={[styles.actionText, { color: colors.text }]}>Quick Quiz</Text>
                                </TouchableOpacity>
                            </Animated.View>

                            <Animated.View entering={FadeInDown.delay(400).springify()}>
                                <TouchableOpacity
                                    style={[styles.actionCard, { backgroundColor: colors.surface }]}
                                    onPress={() => router.push('/(tabs)/study/paper-generator')}
                                >
                                    <FileText size={24} color={colors.secondary} />
                                    <Text style={[styles.actionText, { color: colors.text }]}>Exam Paper</Text>
                                </TouchableOpacity>
                            </Animated.View>

                            <Animated.View entering={FadeInDown.delay(450).springify()}>
                                <TouchableOpacity
                                    style={[styles.actionCard, { backgroundColor: colors.surface }]}
                                    onPress={() => router.push('/modals/ai-chat')}
                                >
                                    <Sparkles size={24} color={colors.accent} />
                                    <Text style={[styles.actionText, { color: colors.text }]}>Ask AI</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </View>

                    </View>

                    {/* 3. Upcoming Exams (Full width) */}
                    {upcomingExams.length > 0 && (
                        <Animated.View entering={FadeInDown.delay(500).springify()} style={[styles.section, { marginTop: gap }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Exams</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                                {upcomingExams.map(exam => {
                                    const daysLeft = differenceInDays(exam.examDate, Date.now());
                                    return (
                                        <View key={exam.id} style={[styles.examCard, { backgroundColor: colors.surface }]}>
                                            <View style={[styles.examDateBox, { backgroundColor: daysLeft <= 3 ? colors.error + '15' : colors.primary + '15' }]}>
                                                <Text style={[styles.examDateText, { color: daysLeft <= 3 ? colors.error : colors.primary }]}>{format(exam.examDate, 'dd')}</Text>
                                                <Text style={[styles.examMonthText, { color: dateColor(daysLeft) }]}>{format(exam.examDate, 'MMM')}</Text>
                                            </View>
                                            <View style={styles.examInfo}>
                                                <Text style={[styles.examSubject, { color: colors.text }]}>{exam.subjectName}</Text>
                                                <Text style={[styles.examDays, { color: colors.textSecondary }]}>
                                                    {daysLeft <= 0 ? (daysLeft === 0 ? 'Today!' : 'Passed') : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days left`}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </Animated.View>
                    )}

                    {/* 4. Recent Notes */}
                    <Animated.View entering={FadeInDown.delay(600).springify()} style={[styles.section, { marginTop: gap }]}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Notes</Text>
                            <TouchableOpacity onPress={() => router.push('/(tabs)/notes')}>
                                <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
                            </TouchableOpacity>
                        </View>
                        {recentNotes.length > 0 ? (
                            recentNotes.map(note => (
                                <TouchableOpacity
                                    key={note.id}
                                    style={[styles.noteItem, { backgroundColor: colors.surface }]}
                                    onPress={() => router.push({ pathname: '/(tabs)/notes', params: { id: note.id } })}
                                >
                                    <View style={[styles.noteIcon, { backgroundColor: colors.surfaceHighlight }]}>
                                        <BookOpen size={20} color={colors.primary} />
                                    </View>
                                    <View style={styles.noteContent}>
                                        <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>{note.title}</Text>
                                        <Text style={[styles.noteSub, { color: colors.textSecondary }]}>{note.subject} • {format(note.updatedAt, 'MMM d')}</Text>
                                    </View>
                                    <ChevronRight size={18} color={colors.textMuted} />
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={[styles.emptyBox, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No notes yet. Start creating!</Text>
                            </View>
                        )}
                    </Animated.View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );

    function dateColor(days: number) {
        if (days <= 3) return colors.error;
        if (days <= 7) return colors.warning;
        return colors.primary;
    }
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 0,
    },
    content: { paddingBottom: 24 },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    greeting: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
    username: { fontSize: 24, fontWeight: '700', color: '#FFF' },
    streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    streakText: { color: '#FFF', fontWeight: '600', fontSize: 13 },

    grid: { flexDirection: 'row', flexWrap: 'wrap' },

    card: {
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        minHeight: 160,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, marginBottom: 12 },
    cardIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { fontSize: 16, fontWeight: '700' },
    countBadge: { fontSize: 12 },
    taskItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    bullet: { width: 6, height: 6, borderRadius: 3 },
    taskText: { fontSize: 14, flex: 1 },
    emptyState: { alignItems: 'center', padding: 16, gap: 8 },
    emptyText: { fontSize: 14 },
    cardAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 'auto', paddingTop: 12, gap: 4 },
    cardActionText: { fontSize: 14, fontWeight: '600' },

    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignContent: 'stretch' },
    actionCard: {
        flex: 1,
        minWidth: '45%',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    actionText: { fontSize: 13, fontWeight: '600' },
    actionTextWhite: { fontSize: 13, fontWeight: '600', color: '#FFF' },

    section: { marginBottom: 8 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '700' },
    seeAll: { fontSize: 14, fontWeight: '600' },

    examCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        gap: 12,
        minWidth: 160,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    examDateBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    examDateText: { fontSize: 16, fontWeight: '700' },
    examMonthText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
    examInfo: { flex: 1 },
    examSubject: { fontSize: 14, fontWeight: '700' },
    examDays: { fontSize: 12 },

    noteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
        gap: 12,
    },
    noteIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    noteContent: { flex: 1 },
    noteTitle: { fontSize: 15, fontWeight: '600' },
    noteSub: { fontSize: 12 },
    emptyBox: { padding: 24, alignItems: 'center', borderRadius: 12 },
});