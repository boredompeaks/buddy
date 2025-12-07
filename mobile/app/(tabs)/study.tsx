// Study Hub Tab Screen
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brain, FileQuestion, FileText, BarChart3, Sparkles, ChevronRight } from 'lucide-react-native';
import { COLORS } from '../../src/constants';

export default function StudyScreen() {
    const router = useRouter();

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
            route: '/modals/paper-generator',
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

                {/* AI Deep Study */}
                <TouchableOpacity
                    style={styles.deepStudyCard}
                    onPress={() => router.push('/modals/deep-study')}
                >
                    <View style={styles.deepStudyIcon}>
                        <Sparkles size={28} color="#fff" />
                    </View>
                    <View style={styles.deepStudyContent}>
                        <Text style={styles.deepStudyTitle}>Deep Study Mode</Text>
                        <Text style={styles.deepStudyDescription}>
                            Generate notes from PDFs, create exam papers, grade your answers
                        </Text>
                    </View>
                    <ChevronRight size={24} color={COLORS.light.primary} />
                </TouchableOpacity>

                {/* Quick Stats Placeholder */}
                <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>Your Progress</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>0</Text>
                            <Text style={styles.statLabel}>Cards Reviewed</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>0</Text>
                            <Text style={styles.statLabel}>Quizzes Taken</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>0%</Text>
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
