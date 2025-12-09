// Paper Generator Screen - Generate exam papers (ICSE/CBSE/Custom)
// Enhanced with Multi-Note Context and Focus Topics
import { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, Clock, Target, AlertTriangle, Download, Share2, Sparkles, BookOpen, Save, Printer } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Markdown from 'react-native-markdown-display';
import { useNotesStore } from '../../../src/stores';
import { generateExamPaper } from '../../../src/services/ai';
import { COLORS, EXAM_PATTERNS } from '../../../src/constants';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { useHaptics } from '../../../src/hooks/useHaptics';

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
    const router = useRouter();
    const colors = useThemeColors();
    const haptics = useHaptics();
    const notes = useNotesStore(state => state.notes);
    const addNote = useNotesStore(state => state.addNote);

    // Derived state: Available subjects from notes
    const subjects = useMemo(() => Array.from(new Set(notes.map(n => n.subject).filter(Boolean))).sort(), [notes]);

    const [state, setState] = useState<GeneratorState>('config');
    const [config, setConfig] = useState<PaperConfig>(DEFAULT_CONFIG);
    const [generatedPaper, setGeneratedPaper] = useState('');

    const handleGenerate = async () => {
        if (!config.subject) {
            Alert.alert('Missing Subject', 'Please select a subject first.');
            return;
        }

        setState('loading');
        try {
            // NEW: Gather ALL notes for the selected subject
            const subjectNotes = notes
                .filter(n => n.subject === config.subject)
                .map(n => `Title: ${n.title}\n${n.content}`)
                .join('\n\n---\n\n');

            if (subjectNotes.length < 50) {
                throw new Error('Not enough note content for this subject.');
            }

            const paper = await generateExamPaper(subjectNotes, config);
            setGeneratedPaper(paper);
            setState('result');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to generate paper. Please try again.');
            setState('error');
        }
    };

    const copyToClipboard = async () => {
        await Clipboard.setStringAsync(generatedPaper);
        Alert.alert('Copied', 'Exam paper copied to clipboard');
    };

    // Config View
    if (state === 'config') {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <LinearGradient
                    colors={[colors.primary, colors.primary + '80']}
                    style={styles.headerGradient}
                />
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <ArrowLeft size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitleWhite}>Exam Generator</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 20 }}>
                        <View style={[styles.card, { backgroundColor: colors.surface }]}>

                            {/* Subject Selection */}
                            <Text style={[styles.label, { color: colors.text }]}>Subject</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                                {subjects.map(sub => (
                                    <TouchableOpacity
                                        key={sub}
                                        style={[
                                            styles.chip,
                                            {
                                                backgroundColor: config.subject === sub ? colors.primary : colors.surfaceHighlight,
                                                borderColor: config.subject === sub ? colors.primary : colors.border
                                            }
                                        ]}
                                        onPress={() => setConfig(prev => ({ ...prev, subject: sub }))}
                                    >
                                        <Text style={[styles.chipText, { color: config.subject === sub ? '#FFF' : colors.text }]}>{sub}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Focus Topics (NEW) */}
                            <Text style={[styles.label, { color: colors.text, marginTop: 24 }]}>Focus Topics (Optional)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                placeholder="e.g. Thermodynamics, calculus, Organic Chem..."
                                placeholderTextColor={colors.textMuted}
                                value={config.focus}
                                onChangeText={t => setConfig(prev => ({ ...prev, focus: t }))}
                            />

                            {/* Marks & Pattern */}
                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.label, { color: colors.text, marginTop: 24 }]}>Total Marks</Text>
                                    <View style={styles.optionsGrid}>
                                        {MARK_OPTIONS.map(mark => (
                                            <TouchableOpacity
                                                key={mark}
                                                style={[
                                                    styles.smallChip,
                                                    { backgroundColor: config.totalMarks === mark ? colors.secondary : colors.surfaceHighlight }
                                                ]}
                                                onPress={() => setConfig(prev => ({ ...prev, totalMarks: mark }))}
                                            >
                                                <Text style={{ color: config.totalMarks === mark ? '#FFF' : colors.text }}>{mark}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>

                            {/* Pattern Selection */}
                            <Text style={[styles.label, { color: colors.text, marginTop: 24 }]}>Board Pattern</Text>
                            <View style={styles.patternList}>
                                {Object.values(EXAM_PATTERNS).map(pat => (
                                    <TouchableOpacity
                                        key={pat.id}
                                        style={[
                                            styles.patternCard,
                                            {
                                                backgroundColor: config.pattern === pat.id ? colors.primary + '10' : colors.surfaceHighlight,
                                                borderColor: config.pattern === pat.id ? colors.primary : 'transparent'
                                            }
                                        ]}
                                        onPress={() => setConfig(prev => ({ ...prev, pattern: pat.id }))}
                                    >
                                        <View style={styles.patternHeader}>
                                            <Text style={[styles.patternName, { color: colors.text }]}>{pat.name}</Text>
                                            {config.pattern === pat.id && <Sparkles size={16} color={colors.primary} />}
                                        </View>
                                        <Text style={[styles.patternDetail, { color: colors.textSecondary }]}>{pat.duration} • {pat.totalMarks} Marks</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.generateButton, { backgroundColor: colors.primary, opacity: config.subject ? 1 : 0.5 }]}
                                onPress={handleGenerate}
                                disabled={!config.subject}
                            >
                                <FileText size={20} color="#FFF" />
                                <Text style={styles.generateButtonText}>Generate Paper</Text>
                            </TouchableOpacity>

                        </View>
                    </ScrollView>
                </SafeAreaView>
            </View>
        );
    }

    // Result View
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient
                colors={[colors.primary, colors.primary + '80']}
                style={styles.headerGradient}
            />
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setState('config')} style={styles.backButton}>
                        <ArrowLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitleWhite}>Generated Paper</Text>
                    <TouchableOpacity onPress={copyToClipboard}>
                        <Share2 size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {state === 'loading' ? (
                    <View style={styles.centerContent}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.loadingText, { color: colors.text }]}>Designing your exam paper...</Text>
                        <Text style={[styles.loadingSub, { color: colors.textSecondary }]}>Analyzing all {config.subject} notes...</Text>
                    </View>
                ) : state === 'result' ? (
                    <ScrollView contentContainerStyle={{ padding: 20 }}>
                        <View style={[styles.paperCard, { backgroundColor: colors.surface }]}>
                            <Markdown style={{
                                body: { color: colors.text, fontSize: 16 },
                                heading1: { color: colors.primary, marginBottom: 10 },
                                heading2: { color: colors.text, marginTop: 10, marginBottom: 5 },
                                strong: { color: colors.primary, fontWeight: '700' },
                            }}>
                                {generatedPaper}
                            </Markdown>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.success }]}
                                onPress={async () => {
                                    haptics.success();
                                    try {
                                        const note = await addNote({
                                            title: `${config.subject} Paper - ${new Date().toLocaleDateString()}`,
                                            content: generatedPaper,
                                            subject: config.subject,
                                        });
                                        Alert.alert('Saved!', 'Paper saved to Notes under Papers/Generated category.');
                                    } catch (e) {
                                        Alert.alert('Error', 'Failed to save note.');
                                    }
                                }}
                            >
                                <Save size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>Save to Notes</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                                onPress={async () => {
                                    haptics.medium();
                                    try {
                                        // Convert markdown to basic HTML
                                        const convertMarkdownToHtml = (md: string): string => {
                                            return md
                                                // Headers
                                                .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                                                .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                                                .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                                                // Bold
                                                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                                // Line breaks
                                                .replace(/\n/g, '<br/>');
                                        };

                                        const html = `
                                            <html>
                                            <head>
                                                <style>
                                                    body { font-family: Georgia, serif; padding: 40px; line-height: 1.6; }
                                                    h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
                                                    h2 { color: #1e293b; margin-top: 20px; }
                                                    h3 { color: #334155; margin-top: 15px; }
                                                    strong { color: #4f46e5; }
                                                </style>
                                            </head>
                                            <body>
                                                ${convertMarkdownToHtml(generatedPaper)}
                                            </body>
                                            </html>
                                        `;
                                        const { uri } = await Print.printToFileAsync({ html });
                                        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Exam Paper' });
                                    } catch (e) {
                                        Alert.alert('Error', 'Failed to export PDF.');
                                    }
                                }}
                            >
                                <Printer size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>Export PDF</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                ) : (
                    <View style={styles.centerContent}>
                        <AlertTriangle size={48} color={colors.error} />
                        <Text style={{ marginTop: 10, color: colors.text }}>Something went wrong.</Text>
                        <TouchableOpacity onPress={() => setState('config')} style={{ marginTop: 20 }}>
                            <Text style={{ color: colors.primary }}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
    headerTitleWhite: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    backButton: { padding: 8 },

    card: { borderRadius: 20, padding: 24, shadowOpacity: 0.1, shadowRadius: 10 },
    label: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
    horizontalScroll: { flexDirection: 'row', marginBottom: 10 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
    chipText: { fontWeight: '600' },

    input: { padding: 12, borderRadius: 12, borderWidth: 1, fontSize: 16 },

    row: { flexDirection: 'row', gap: 20 },
    optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    smallChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },

    patternList: { gap: 10 },
    patternCard: { padding: 16, borderRadius: 12, borderWidth: 1 },
    patternHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    patternName: { fontSize: 16, fontWeight: '600' },
    patternDetail: { fontSize: 12, marginTop: 4 },

    generateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, marginTop: 32, gap: 8 },
    generateButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

    centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: 16, fontSize: 18, fontWeight: '600' },
    loadingSub: { marginTop: 8, fontSize: 14 },
    paperCard: { padding: 20, borderRadius: 16, minHeight: 500 },
    actionButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
    actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 8 },
    actionButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
