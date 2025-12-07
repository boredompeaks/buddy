// Study Hub Tab Screen
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brain, FileQuestion, FileText, BarChart3, Sparkles, ChevronRight, Camera, Edit3 } from 'lucide-react-native';
import { COLORS } from '../../src/constants';
import { useMemo } from 'react';

// Import stores for real stats
import { useNotesStore } from '../../src/stores';

export default function StudyScreen() {
    const router = useRouter();

    // Get real data for stats
    const notes = useNotesStore(state => state.notes);

    // Calculate stats from stored data
    const stats = useMemo(() => {
        // These would ideally come from proper tracking stores
        // For now, derive what we can from available data
        return {
            cardsReviewed: 0, // Would come from flashcard sessions
            quizzesTaken: 0,  // Would come from quiz sessions
            avgScore: 0,      // Would come from quiz sessions
        };
    }, []);

    const studyOptions = [
        {
            id: 'flashcards',
            title: 'Flashcards',
            description: 'Review with spaced repetition',
            icon: Brain,
            color: COLORS.light.primary,
            route: '/(tabs)/study/flashcards',
        },
        {
            id: 'quiz',
            title: 'Quiz Mode',
            description: 'Test your knowledge',
            icon: FileQuestion,
            color: COLORS.light.secondary,
            route: '/(tabs)/study/quiz',
        },
        {
            id: 'papers',
            title: 'Practice Papers',
            description: 'Generate exam papers',
            icon: FileText,
            color: COLORS.light.accent,
            route: '/(tabs)/study/paper-generator', // Fixed: was /modals/paper-generator
        },
        {
            id: 'analytics',
            title: 'Analytics',
            description: 'Track your progress',
            icon: BarChart3,
            color: '#10b981',
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
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Study Hub</Text>
                    <Text style={styles.subtitle}>Choose how you want to study</Text>
                </View>

                {/* Study Options */}
                <View style={styles.optionsGrid}>
                    {studyOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                            <TouchableOpacity
                                key={option.id}
                                style={styles.optionCard}
                                onPress={() => router.push(option.route as any)}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
                                    <Icon size={28} color={option.color} />
                                </View>
                                <Text style={styles.optionTitle}>{option.title}</Text>
                                <Text style={styles.optionDescription}>{option.description}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Advanced Tools Section */}
                <Text style={styles.sectionTitle}>AI Tools</Text>
                {advancedTools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                        <TouchableOpacity
                            key={tool.id}
                            style={styles.toolCard}
                            onPress={() => router.push(tool.route as any)}
                        >
                            <View style={[styles.toolIcon, { backgroundColor: COLORS.light.primary + '20' }]}>
                                <Icon size={24} color={COLORS.light.primary} />
                            </View>
                            <View style={styles.toolContent}>
                                <Text style={styles.toolTitle}>{tool.title}</Text>
                                <Text style={styles.toolDescription}>{tool.description}</Text>
                            </View>
                            <ChevronRight size={20} color={COLORS.light.textMuted} />
                        </TouchableOpacity>
                    );
                })}

                {/* Quick Stats */}
                <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>Your Progress</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{notes.length}</Text>
                            <Text style={styles.statLabel}>Notes Created</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{stats.quizzesTaken}</Text>
                            <Text style={styles.statLabel}>Quizzes Taken</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{stats.avgScore}%</Text>
                            <Text style={styles.statLabel}>Avg Score</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.light.background },
    content: { padding: 20 },
    header: { marginBottom: 24 },
    title: { fontSize: 28, fontWeight: '800', color: COLORS.light.text },
    subtitle: { fontSize: 15, color: COLORS.light.textSecondary, marginTop: 4 },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    optionCard: {
        width: '48%',
        backgroundColor: COLORS.light.surface,
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    optionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.light.text, marginBottom: 4 },
    optionDescription: { fontSize: 12, color: COLORS.light.textSecondary, textAlign: 'center' },
    deepStudyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.light.surface,
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
        gap: 16,
        borderWidth: 2,
        borderColor: COLORS.light.primary + '30',
    },
    deepStudyIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: COLORS.light.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deepStudyContent: { flex: 1 },
    deepStudyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.light.text },
    deepStudyDescription: { fontSize: 13, color: COLORS.light.textSecondary, marginTop: 4 },
    // Tool card styles for Advanced Tools section
    toolCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.light.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
        gap: 14,
    },
    toolIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toolContent: { flex: 1 },
    toolTitle: { fontSize: 15, fontWeight: '600', color: COLORS.light.text },
    toolDescription: { fontSize: 12, color: COLORS.light.textSecondary, marginTop: 2 },
    statsSection: { marginTop: 8 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.light.text, marginBottom: 12 },
    statsRow: { flexDirection: 'row', gap: 12 },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.light.surface,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    statValue: { fontSize: 24, fontWeight: '700', color: COLORS.light.primary },
    statLabel: { fontSize: 11, color: COLORS.light.textSecondary, marginTop: 4, textAlign: 'center' },
});
