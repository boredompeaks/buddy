// Paper Generator Screen - Generate exam papers (ICSE/CBSE/Custom)
import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, Clock, Target, AlertTriangle, Download, Share2, Sparkles } from 'lucide-react-native';
import { useNotesStore } from '../../../src/stores';
import { generateExamPaper } from '../../../src/services/ai';
import { COLORS, EXAM_PATTERNS } from '../../../src/constants';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';

type GeneratorState = 'config' | 'loading' | 'result' | 'error';

interface PaperConfig {
    subject: string;
    pattern: string;
    totalMarks: number;
    focus: string;
}

const DEFAULT_CONFIG: PaperConfig = {
    subject: '',
    pattern: 'icse-2024',
    totalMarks: 80,
    focus: '',
};

const MARK_OPTIONS = [40, 60, 80, 100];

export default function PaperGeneratorScreen() {
    const { noteId, subject: prefilledSubject } = useLocalSearchParams<{ noteId?: string; subject?: string }>();
    const router = useRouter();

    const notes = useNotesStore(state => state.notes);
    const note = noteId ? notes.find(n => n.id === noteId) : null;

    const [state, setState] = useState<GeneratorState>('config');
    const [error, setError] = useState<string | null>(null);
    const [config, setConfig] = useState<PaperConfig>({
        ...DEFAULT_CONFIG,
        subject: prefilledSubject ?? note?.subject ?? '',
    });
    const [generatedPaper, setGeneratedPaper] = useState<string>('');
    const [copied, setCopied] = useState(false);

    // Defensive: validate content exists
    const hasContent = Boolean(note?.content && note.content.trim().length > 50);

    const handleGenerate = useCallback(async () => {
        // Defensive checks
        if (!config.subject.trim()) {
            setError('Please enter a subject name.');
            return;
        }

        if (!note?.content) {
            setError('No note content available to generate paper from.');
            return;
        }

        setState('loading');
        setError(null);

        try {
            const paper = await generateExamPaper(note.content, {
                subject: config.subject,
                pattern: config.pattern,
                totalMarks: config.totalMarks,
                focus: config.focus || undefined,
            });

            // Defensive: validate response
            if (!paper || typeof paper !== 'string' || paper.length < 100) {
                throw new Error('Invalid paper generated. Please try again.');
            }

            setGeneratedPaper(paper);
            setState('result');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to generate paper.';
            setError(message);
            setState('error');
        }
    }, [config, note?.content]);

    const handleCopy = useCallback(async () => {
        try {
            await Clipboard.setStringAsync(generatedPaper);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Silently fail - copy is non-critical
        }
    }, [generatedPaper]);

    const handleRetry = useCallback(() => {
        setState('config');
        setError(null);
    }, []);

    // Error state
    if (state === 'error') {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.centerContainer}>
                    <AlertTriangle size={48} color={COLORS.light.error} />
                    <Text style={styles.errorTitle}>Generation Failed</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.primaryBtn} onPress={handleRetry}>
                        <Text style={styles.primaryBtnText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Loading state
    if (state === 'loading') {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.light.primary} />
                    <Text style={styles.loadingText}>Generating exam paper...</Text>
                    <Text style={styles.loadingSubtext}>This may take up to 90 seconds</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Result state
    if (state === 'result') {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <ArrowLeft size={24} color={COLORS.light.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Generated Paper</Text>
                    <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
                        <Share2 size={20} color={copied ? COLORS.light.success : COLORS.light.primary} />
                    </TouchableOpacity>
                </View>

                {/* Paper Content */}
                <ScrollView style={styles.paperContainer} contentContainerStyle={styles.paperContent}>
                    <Markdown style={markdownStyles}>
                        {generatedPaper}
                    </Markdown>
                </ScrollView>

                {/* Actions */}
                <View style={styles.bottomActions}>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={handleRetry}>
                        <Text style={styles.secondaryBtnText}>Generate Another</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Config state (default)
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <ArrowLeft size={24} color={COLORS.light.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Generate Paper</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.configContent} showsVerticalScrollIndicator={false}>
                {/* Note Info */}
                {note && (
                    <View style={styles.noteCard}>
                        <FileText size={20} color={COLORS.light.primary} />
                        <View style={styles.noteInfo}>
                            <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
                            <Text style={styles.noteStats}>{note.content.split(' ').length} words</Text>
                        </View>
                    </View>
                )}

                {!hasContent && (
                    <View style={styles.warningCard}>
                        <AlertTriangle size={20} color={COLORS.light.warning} />
                        <Text style={styles.warningText}>
                            Note content appears too short. Results may be limited.
                        </Text>
                    </View>
                )}

                {/* Subject Input */}
                <Text style={styles.inputLabel}>Subject Name *</Text>
                <TextInput
                    style={styles.input}
                    value={config.subject}
                    onChangeText={(v) => setConfig(prev => ({ ...prev, subject: v }))}
                    placeholder="e.g., Physics, Mathematics, History"
                    placeholderTextColor={COLORS.light.textMuted}
                />

                {/* Pattern Selection */}
                <Text style={styles.inputLabel}>Exam Pattern</Text>
                <View style={styles.patternGrid}>
                    {Object.values(EXAM_PATTERNS).map((pattern: { id: string; name: string; board: string }) => (
                        <TouchableOpacity
                            key={pattern.id}
                            style={[styles.patternCard, config.pattern === pattern.id && styles.patternCardActive]}
                            onPress={() => setConfig(prev => ({ ...prev, pattern: pattern.id }))}
                        >
                            <Text style={[styles.patternName, config.pattern === pattern.id && styles.patternNameActive]}>
                                {pattern.name}
                            </Text>
                            <Text style={[styles.patternBoard, config.pattern === pattern.id && styles.patternBoardActive]}>
                                {pattern.board}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Total Marks */}
                <Text style={styles.inputLabel}>Total Marks</Text>
                <View style={styles.marksRow}>
                    {MARK_OPTIONS.map(marks => (
                        <TouchableOpacity
                            key={marks}
                            style={[styles.markOption, config.totalMarks === marks && styles.markOptionActive]}
                            onPress={() => setConfig(prev => ({ ...prev, totalMarks: marks }))}
                        >
                            <Text style={[styles.markText, config.totalMarks === marks && styles.markTextActive]}>
                                {marks}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Focus Area (Optional) */}
                <Text style={styles.inputLabel}>Focus Area (Optional)</Text>
                <TextInput
                    style={styles.input}
                    value={config.focus}
                    onChangeText={(v) => setConfig(prev => ({ ...prev, focus: v }))}
                    placeholder="e.g., Chapter 5-8, Thermodynamics"
                    placeholderTextColor={COLORS.light.textMuted}
                />

                {/* Generate Button */}
                <TouchableOpacity
                    style={[styles.generateBtn, !config.subject.trim() && styles.generateBtnDisabled]}
                    onPress={handleGenerate}
                    disabled={!config.subject.trim()}
                >
                    <Sparkles size={20} color="#fff" />
                    <Text style={styles.generateBtnText}>Generate Exam Paper</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.light.background },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
    loadingText: { fontSize: 18, fontWeight: '600', color: COLORS.light.text, marginTop: 16 },
    loadingSubtext: { fontSize: 14, color: COLORS.light.textSecondary },
    errorTitle: { fontSize: 20, fontWeight: '700', color: COLORS.light.text, marginTop: 12 },
    errorText: { fontSize: 14, color: COLORS.light.textSecondary, textAlign: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.light.border },
    headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.light.text },
    copyBtn: { padding: 8 },
    configContent: { padding: 20 },
    noteCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.light.surface, padding: 16, borderRadius: 16, marginBottom: 16 },
    noteInfo: { flex: 1 },
    noteTitle: { fontSize: 16, fontWeight: '600', color: COLORS.light.text },
    noteStats: { fontSize: 13, color: COLORS.light.textSecondary, marginTop: 2 },
    warningCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.light.warning + '15', padding: 16, borderRadius: 12, marginBottom: 16 },
    warningText: { flex: 1, fontSize: 14, color: COLORS.light.warning },
    inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.light.textSecondary, marginBottom: 8, marginTop: 16 },
    input: { backgroundColor: COLORS.light.surface, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, fontSize: 16, color: COLORS.light.text },
    patternGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    patternCard: { flex: 1, minWidth: '45%', backgroundColor: COLORS.light.surface, padding: 16, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
    patternCardActive: { borderColor: COLORS.light.primary, backgroundColor: COLORS.light.primary + '10' },
    patternName: { fontSize: 15, fontWeight: '600', color: COLORS.light.text },
    patternNameActive: { color: COLORS.light.primary },
    patternBoard: { fontSize: 12, color: COLORS.light.textSecondary, marginTop: 4 },
    patternBoardActive: { color: COLORS.light.primary },
    marksRow: { flexDirection: 'row', gap: 12 },
    markOption: { flex: 1, paddingVertical: 14, backgroundColor: COLORS.light.surface, borderRadius: 12, alignItems: 'center' },
    markOptionActive: { backgroundColor: COLORS.light.primary },
    markText: { fontSize: 16, fontWeight: '600', color: COLORS.light.text },
    markTextActive: { color: '#fff' },
    generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.light.primary, paddingVertical: 18, borderRadius: 16, marginTop: 32 },
    generateBtnDisabled: { opacity: 0.5 },
    generateBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    primaryBtn: { backgroundColor: COLORS.light.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 16 },
    primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    secondaryBtn: { flex: 1, paddingVertical: 16, backgroundColor: COLORS.light.surface, borderRadius: 12, alignItems: 'center' },
    secondaryBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.light.primary },
    paperContainer: { flex: 1 },
    paperContent: { padding: 20 },
    bottomActions: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.light.border },
});

const markdownStyles = {
    body: { color: COLORS.light.text, fontSize: 15, lineHeight: 24 },
    heading1: { fontSize: 22, fontWeight: '700' as const, marginVertical: 12, color: COLORS.light.text },
    heading2: { fontSize: 18, fontWeight: '600' as const, marginVertical: 10, color: COLORS.light.text },
    heading3: { fontSize: 16, fontWeight: '600' as const, marginVertical: 8, color: COLORS.light.text },
    strong: { fontWeight: '700' as const },
    code_block: { backgroundColor: COLORS.light.surfaceVariant, padding: 12, borderRadius: 8, fontSize: 13 },
    table: { borderWidth: 1, borderColor: COLORS.light.border },
    th: { padding: 8, backgroundColor: COLORS.light.surfaceVariant },
    td: { padding: 8, borderWidth: 1, borderColor: COLORS.light.border },
};
