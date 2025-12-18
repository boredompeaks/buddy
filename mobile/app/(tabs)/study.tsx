// Study Hub Tab Screen - MindVault Modern Redesign
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Brain, FileQuestion, FileText, Camera, Edit3, Flame, Trophy } from 'lucide-react-native';
import { useMemo } from 'react';
import { LineChart } from 'react-native-gifted-charts'; // Ensure this package is installed
import { useNotesStore, useStudyStatsStore, useStreakStore } from '../../src/stores';
import { useThemeColors } from '../../hooks/useThemeColors';
import GlassLayout from '../../src/components/GlassLayout';
import GlassCard from '../../src/components/GlassCard';
import { COLORS } from '../../src/constants';

export default function StudyScreen() {
    const router = useRouter();
    const colors = useThemeColors();

    // Stores
    const streak = useStreakStore(state => state.streak.currentStreak);
    const notes = useNotesStore(state => state.notes);
    const studyStats = useStudyStatsStore(state => state.stats);
    const getAverageScore = useStudyStatsStore(state => state.getAverageScore);

    const stats = useMemo(() => ({
        avgScore: getAverageScore(),
        quizzesTaken: studyStats.quizzesTaken || 0,
    }), [studyStats, getAverageScore]);

    // Dummy Data for Learning Curve Graph (Replace with real historical data later)
    const chartData = [
        { value: 40, label: 'M' },
        { value: 65, label: 'T' },
        { value: 50, label: 'W' },
        { value: 80, label: 'T' },
        { value: 75, label: 'F' },
        { value: 90, label: 'S' },
        { value: 85, label: 'S' },
    ];

    const studyOptions = [
        {
            id: 'flashcards',
            title: 'Flashcards',
            icon: Brain,
            color: '#6366f1', // Indigo
            route: '/(tabs)/study/flashcards',
        },
        {
            id: 'quiz',
            title: 'Quiz Mode',
            icon: FileQuestion,
            color: '#8b5cf6', // Violet
            route: '/(tabs)/study/quiz',
        },
        {
            id: 'exam',
            title: 'Exam Mode',
            icon: Trophy, // Changed to Trophy/Timer placeholder
            color: '#ec4899', // Pink
            route: '/(tabs)/study/exam', // Updated route to new Exam Flow
        },
        {
            id: 'grading',
            title: 'Grader',
            icon: Camera,
            color: '#10b981', // Emerald
            route: '/(tabs)/study/answer-grading',
        },
    ];

    return (
        <GlassLayout>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Header with Streak */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.title, { color: colors.text }]}>Study Hub</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Ready to focus?</Text>
                    </View>
                    <GlassCard style={styles.streakBadge} intensity={40}>
                        <Flame size={20} color="#f59e0b" fill="#f59e0b" />
                        <Text style={[styles.streakText, { color: colors.text }]}>{streak}</Text>
                    </GlassCard>
                </View>

                {/* Main Graph Card */}
                <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/(tabs)/study/analytics' as any)}>
                    <GlassCard style={styles.chartCard} intensity={25}>
                        <View style={styles.chartHeader}>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Learning Curve</Text>
                            <Text style={[styles.cardValue, { color: colors.success }]}>+12%</Text>
                        </View>
                        <View style={styles.chartContainer}>
                            <LineChart
                                data={chartData}
                                color={colors.primary}
                                thickness={3}
                                dataPointsColor={colors.primary}
                                startFillColor={colors.primary}
                                endFillColor={colors.primary}
                                startOpacity={0.4}
                                endOpacity={0.0}
                                areaChart
                                curved
                                hideRules
                                hideYAxisText
                                hideAxesAndRules
                                height={120}
                                width={280} // Approx width
                                adjustToWidth
                            />
                        </View>
                    </GlassCard>
                </TouchableOpacity>

                {/* Main Tools Grid */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Tools</Text>
                <View style={styles.grid}>
                    {studyOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                            <GlassCard
                                key={option.id}
                                style={styles.gridCard}
                                onPress={() => router.push(option.route as any)}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
                                    <Icon size={28} color={option.color} />
                                </View>
                                <Text style={[styles.gridTitle, { color: colors.text }]}>{option.title}</Text>
                            </GlassCard>
                        );
                    })}
                </View>

                {/* Secondary Tools */}
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>Quick Actions</Text>
                <GlassCard
                    style={styles.actionRow}
                    onPress={() => router.push('/(tabs)/study/paper-generator')}
                >
                    <View style={[styles.iconCircle, { backgroundColor: COLORS.light.accent + '20' }]}>
                        <FileText size={20} color={COLORS.light.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.actionTitle, { color: colors.text }]}>Generate Paper</Text>
                        <Text style={[styles.actionSub, { color: colors.textSecondary }]}>Custom practice exams</Text>
                    </View>
                </GlassCard>

                <GlassCard
                    style={[styles.actionRow, { marginTop: 12 }]}
                    onPress={() => router.push('/modals/ai-chat')}
                >
                    <View style={[styles.iconCircle, { backgroundColor: COLORS.light.primary + '20' }]}>
                        <Edit3 size={20} color={COLORS.light.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.actionTitle, { color: colors.text }]}>AI Summary</Text>
                        <Text style={[styles.actionSub, { color: colors.textSecondary }]}>Summarize your notes</Text>
                    </View>
                </GlassCard>

                <View style={{ height: 100 }} />
            </ScrollView>
        </GlassLayout>
    );
}

const styles = StyleSheet.create({
    content: { padding: 20 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: { fontSize: 32, fontWeight: '800' },
    subtitle: { fontSize: 16, marginTop: 4 },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 6,
        borderRadius: 20,
    },
    streakText: { fontSize: 18, fontWeight: '700' },

    chartCard: {
        padding: 20,
        marginBottom: 30,
        borderRadius: 24,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardTitle: { fontSize: 18, fontWeight: '600' },
    cardValue: { fontSize: 16, fontWeight: '700' },
    chartContainer: {
        marginTop: 10,
        alignItems: 'center',
        overflow: 'hidden', // Clip chart within card
    },

    sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    gridCard: {
        width: '48%',
        padding: 20,
        alignItems: 'center',
        aspectRatio: 1, // Square cards
        justifyContent: 'center',
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    gridTitle: { fontSize: 16, fontWeight: '600' },

    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
        borderRadius: 20,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTitle: { fontSize: 16, fontWeight: '600' },
    actionSub: { fontSize: 13 },
});