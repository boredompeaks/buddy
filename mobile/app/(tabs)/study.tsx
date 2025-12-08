// Study Hub Tab Screen
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brain, FileQuestion, FileText, BarChart3, Sparkles, ChevronRight, Camera, Edit3, GraduationCap } from 'lucide-react-native';
import { useMemo } from 'react';
import { useNotesStore, useStudyStatsStore } from '../../src/stores';
import { useThemeColors } from '../../hooks/useThemeColors';

export default function StudyScreen() {
    const router = useRouter();
    const colors = useThemeColors();

    // Get real data for stats
    const notes = useNotesStore(state => state.notes);
    const studyStats = useStudyStatsStore(state => state.stats);
    const getAverageScore = useStudyStatsStore(state => state.getAverageScore);

    // Calculate stats from stored data - NOW REAL
    const stats = useMemo(() => {
        return {
            cardsReviewed: studyStats.flashcardsReviewed,
            quizzesTaken: studyStats.quizzesTaken,
            avgScore: getAverageScore(),
        };
    }, [studyStats, getAverageScore]);

    const studyOptions = [
        {
            id: 'flashcards',
            title: 'Flashcards',
            description: 'Review with spaced repetition',
            icon: Brain,
            color: colors.primary,
            route: '/(tabs)/study/flashcards',
        },
        {
            id: 'quiz',
            title: 'Quiz Mode',
            description: 'Test your knowledge',
            icon: FileQuestion,
            color: colors.secondary,
            route: '/(tabs)/study/quiz',
        },
        {
            id: 'papers',
            title: 'Practice Papers',
            description: 'Generate exam papers',
            icon: FileText,
            color: colors.accent,
            route: '/(tabs)/study/paper-generator',
        },
        {
            id: 'analytics',
            title: 'Analytics',
            description: 'Track your progress',
            icon: BarChart3,
            color: '#10b981', // Keep generic green or map to theme success
            route: '/(tabs)/study/analytics',
        },
    ];

    // Additional study tools
    const advancedTools = [
        {
            id: 'grading',
            title: 'Answer Grading',
            description: 'Grade your handwritten answers with AI',
            icon: Camera,
            route: '/(tabs)/study/answer-grading',
        },
        {
            id: 'summary',
            title: 'AI Summary',
            description: 'Generate summaries from your notes',
            icon: Edit3,
            route: '/modals/ai-chat',
        },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar barStyle={colors.text === '#1e293b' ? 'dark-content' : 'light-content'} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Study Hub</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Choose how you want to study</Text>
                </View>

                {/* Study Options */}
                <View style={styles.optionsGrid}>
                    {studyOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                            <TouchableOpacity
                                key={option.id}
                                style={[styles.optionCard, { backgroundColor: colors.surface }]}
                                onPress={() => router.push(option.route as any)}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
                                    <Icon size={28} color={option.color} />
                                </View>
                                <Text style={[styles.optionTitle, { color: colors.text }]}>{option.title}</Text>
                                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>{option.description}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Advanced Tools Section */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Tools</Text>
                {advancedTools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                        <TouchableOpacity
                            key={tool.id}
                            style={[styles.toolCard, { backgroundColor: colors.surface }]}
                            onPress={() => router.push(tool.route as any)}
                        >
                            <View style={[styles.toolIcon, { backgroundColor: colors.primary + '20' }]}>
                                <Icon size={24} color={colors.primary} />
                            </View>
                            <View style={styles.toolContent}>
                                <Text style={[styles.toolTitle, { color: colors.text }]}>{tool.title}</Text>
                                <Text style={[styles.toolDescription, { color: colors.textSecondary }]}>{tool.description}</Text>
                            </View>
                            <ChevronRight size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    );
                })}

                {/* Quick Stats */}
                <View style={styles.statsSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Progress</Text>
                    <View style={styles.statsRow}>
                        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.statValue, { color: colors.primary }]}>{notes.length}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Notes Created</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.quizzesTaken}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Quizzes Taken</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.avgScore}%</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Score</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20 },
    header: { marginBottom: 24 },
    title: { fontSize: 28, fontWeight: '800' },
    subtitle: { fontSize: 15, marginTop: 4 },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    optionCard: {
        width: '48%', // Approx half with gap
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 4, // Spacing for shadow
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    optionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
    optionDescription: { fontSize: 12, textAlign: 'center', lineHeight: 16 },
    // Tool card styles
    toolCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    toolIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toolContent: { flex: 1 },
    toolTitle: { fontSize: 16, fontWeight: '600' },
    toolDescription: { fontSize: 13, marginTop: 2 },
    statsSection: { marginTop: 12 },
    sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
    statsRow: { flexDirection: 'row', gap: 12 },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statValue: { fontSize: 24, fontWeight: '700' },
    statLabel: { fontSize: 11, marginTop: 4, textAlign: 'center', fontWeight: '500' },
});