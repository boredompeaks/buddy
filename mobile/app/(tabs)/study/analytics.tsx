// Analytics Dashboard - Study progress visualization
import { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Target, Clock, Award, BookOpen, Brain, Calendar } from 'lucide-react-native';
import { useNotesStore, useTasksStore, useExamStore, useStreakStore } from '../../../src/stores';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subtitle?: string;
    color: string;
    bgColor: string;
    textColor: string;
    subtextColor: string;
}

function StatCard({ icon, label, value, subtitle, color, bgColor, textColor, subtextColor }: StatCardProps) {
    return (
        <View style={[styles.statCard, { backgroundColor: bgColor, borderLeftColor: color }]}>
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                {icon}
            </View>
            <View style={styles.statInfo}>
                <Text style={[styles.statLabel, { color: subtextColor }]}>{label}</Text>
                <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
                {subtitle && <Text style={[styles.statSubtitle, { color: subtextColor }]}>{subtitle}</Text>}
            </View>
        </View>
    );
}

interface ProgressBarProps {
    label: string;
    value: number;
    maxValue: number;
    color: string;
    textColor: string;
    subtextColor: string;
    bgColor: string;
}

function ProgressBar({ label, value, maxValue, color, textColor, subtextColor, bgColor }: ProgressBarProps) {
    const percentage = maxValue > 0 ? Math.min(100, Math.round((value / maxValue) * 100)) : 0;
    return (
        <View style={styles.progressItem}>
            <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: textColor }]}>{label}</Text>
                <Text style={[styles.progressValue, { color: subtextColor }]}>{percentage}%</Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: bgColor }]}>
                <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
}

export default function AnalyticsScreen() {
    const colors = useThemeColors();

    const notes = useNotesStore(state => state.notes);
    const tasks = useTasksStore(state => state.tasks);
    const exams = useExamStore(state => state.exams);
    const streak = useStreakStore(state => state.streak);

    // Calculate analytics with memoization - ALL REAL DATA
    const stats = useMemo(() => {
        const now = Date.now();
        const sevenDaysAgo = subDays(new Date(), 7);

        // Notes stats
        const totalNotes = notes.length;
        const recentNotes = notes.filter(n =>
            isWithinInterval(new Date(n.createdAt), {
                start: startOfDay(sevenDaysAgo),
                end: endOfDay(new Date()),
            })
        ).length;
        const totalWords = notes.reduce((sum, n) => sum + (n.content?.split(/\s+/).length ?? 0), 0);
        const favoriteNotes = notes.filter(n => n.isFavorite).length;

        // Tasks stats
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.completed).length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const pendingHighPriority = tasks.filter(t => !t.completed && t.priority === 'high').length;

        // Exams stats
        const upcomingExams = exams.filter(e => e.examDate > now).length;
        const completedExams = exams.filter(e => e.examDate <= now).length;
        const avgSyllabusProgress = exams.length > 0
            ? Math.round(exams.reduce((sum, e) => sum + (e.completedSyllabus / e.totalSyllabus) * 100, 0) / exams.length)
            : 0;

        // Subject distribution
        const subjectCounts: Record<string, number> = {};
        notes.forEach(n => {
            const subject = n.subject || 'General';
            subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
        });
        const topSubjects = Object.entries(subjectCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return {
            totalNotes,
            recentNotes,
            totalWords,
            favoriteNotes,
            totalTasks,
            completedTasks,
            completionRate,
            pendingHighPriority,
            upcomingExams,
            completedExams,
            avgSyllabusProgress,
            topSubjects,
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
        };
    }, [notes, tasks, exams, streak]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Track your study progress</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {/* Streak Section */}
                <View style={[styles.streakCard, { backgroundColor: colors.warning + '20' }]}>
                    <View style={styles.streakMain}>
                        <Award size={32} color={colors.warning} />
                        <View style={styles.streakInfo}>
                            <Text style={[styles.streakValue, { color: colors.text }]}>{stats.currentStreak}</Text>
                            <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>Day Streak</Text>
                        </View>
                    </View>
                    <View style={styles.streakBest}>
                        <Text style={[styles.streakBestLabel, { color: colors.textSecondary }]}>Best Streak</Text>
                        <Text style={[styles.streakBestValue, { color: colors.text }]}>{stats.longestStreak} days</Text>
                    </View>
                </View>

                {/* Quick Stats */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
                <View style={styles.statsGrid}>
                    <StatCard
                        icon={<BookOpen size={20} color={colors.primary} />}
                        label="Total Notes"
                        value={stats.totalNotes}
                        subtitle={`${stats.recentNotes} this week`}
                        color={colors.primary}
                        bgColor={colors.surface}
                        textColor={colors.text}
                        subtextColor={colors.textSecondary}
                    />
                    <StatCard
                        icon={<Target size={20} color={colors.success} />}
                        label="Tasks Done"
                        value={`${stats.completedTasks}/${stats.totalTasks}`}
                        subtitle={`${stats.completionRate}% complete`}
                        color={colors.success}
                        bgColor={colors.surface}
                        textColor={colors.text}
                        subtextColor={colors.textSecondary}
                    />
                    <StatCard
                        icon={<Calendar size={20} color={colors.warning} />}
                        label="Upcoming Exams"
                        value={stats.upcomingExams}
                        subtitle={`${stats.avgSyllabusProgress}% prepared`}
                        color={colors.warning}
                        bgColor={colors.surface}
                        textColor={colors.text}
                        subtextColor={colors.textSecondary}
                    />
                    <StatCard
                        icon={<Brain size={20} color={colors.secondary} />}
                        label="Words Written"
                        value={stats.totalWords >= 1000 ? `${(stats.totalWords / 1000).toFixed(1)}K` : stats.totalWords}
                        color={colors.secondary}
                        bgColor={colors.surface}
                        textColor={colors.text}
                        subtextColor={colors.textSecondary}
                    />
                </View>

                {/* Subject Distribution */}
                {stats.topSubjects.length > 0 && (
                    <>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Subject Distribution</Text>
                        <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
                            {stats.topSubjects.map(([subject, count], index) => (
                                <ProgressBar
                                    key={subject}
                                    label={subject}
                                    value={count}
                                    maxValue={stats.totalNotes}
                                    color={[colors.primary, colors.secondary, colors.accent, colors.warning, colors.success][index] ?? colors.primary}
                                    textColor={colors.text}
                                    subtextColor={colors.textSecondary}
                                    bgColor={colors.border}
                                />
                            ))}
                        </View>
                    </>
                )}

                {/* Insights */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Insights</Text>
                <View style={[styles.insightsCard, { backgroundColor: colors.surface }]}>
                    {stats.pendingHighPriority > 0 && (
                        <View style={styles.insightItem}>
                            <View style={[styles.insightDot, { backgroundColor: colors.error }]} />
                            <Text style={[styles.insightText, { color: colors.text }]}>
                                {stats.pendingHighPriority} high-priority task{stats.pendingHighPriority > 1 ? 's' : ''} pending
                            </Text>
                        </View>
                    )}
                    {stats.upcomingExams > 0 && (
                        <View style={styles.insightItem}>
                            <View style={[styles.insightDot, { backgroundColor: colors.warning }]} />
                            <Text style={[styles.insightText, { color: colors.text }]}>
                                {stats.upcomingExams} exam{stats.upcomingExams > 1 ? 's' : ''} coming up
                            </Text>
                        </View>
                    )}
                    {stats.currentStreak >= 7 && (
                        <View style={styles.insightItem}>
                            <View style={[styles.insightDot, { backgroundColor: colors.success }]} />
                            <Text style={[styles.insightText, { color: colors.text }]}>
                                Great job! You've maintained a {stats.currentStreak}-day streak!
                            </Text>
                        </View>
                    )}
                    {stats.favoriteNotes > 0 && (
                        <View style={styles.insightItem}>
                            <View style={[styles.insightDot, { backgroundColor: colors.primary }]} />
                            <Text style={[styles.insightText, { color: colors.text }]}>
                                {stats.favoriteNotes} favorite note{stats.favoriteNotes > 1 ? 's' : ''} for quick access
                            </Text>
                        </View>
                    )}
                    {stats.topSubjects.length === 0 && stats.pendingHighPriority === 0 && stats.upcomingExams === 0 && (
                        <Text style={[styles.noInsightsText, { color: colors.textSecondary }]}>
                            Start adding notes and tasks to see personalized insights!
                        </Text>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 20, paddingBottom: 12 },
    headerTitle: { fontSize: 28, fontWeight: '800' },
    headerSubtitle: { fontSize: 14, marginTop: 4 },
    content: { padding: 20, paddingTop: 8 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 12 },
    streakCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 20 },
    streakMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    streakInfo: {},
    streakValue: { fontSize: 36, fontWeight: '800' },
    streakLabel: { fontSize: 14, fontWeight: '600' },
    streakBest: { alignItems: 'flex-end' },
    streakBestLabel: { fontSize: 12 },
    streakBestValue: { fontSize: 16, fontWeight: '700' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: { width: (SCREEN_WIDTH - 52) / 2, padding: 16, borderRadius: 16, borderLeftWidth: 4, flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    statInfo: { flex: 1 },
    statLabel: { fontSize: 12, marginBottom: 2 },
    statValue: { fontSize: 20, fontWeight: '700' },
    statSubtitle: { fontSize: 11, marginTop: 2 },
    progressCard: { padding: 16, borderRadius: 16, gap: 16 },
    progressItem: {},
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    progressLabel: { fontSize: 14, fontWeight: '500' },
    progressValue: { fontSize: 13, fontWeight: '600' },
    progressBarBg: { height: 8, borderRadius: 4 },
    progressBarFill: { height: '100%', borderRadius: 4 },
    insightsCard: { padding: 16, borderRadius: 16, gap: 12 },
    insightItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    insightDot: { width: 8, height: 8, borderRadius: 4 },
    insightText: { fontSize: 14, flex: 1 },
    noInsightsText: { fontSize: 14, textAlign: 'center', padding: 12 },
});
