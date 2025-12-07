// Note Editor Screen - Full note editing experience
import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Save, Trash2, Star, Eye, Edit3, Sparkles, MoreVertical } from 'lucide-react-native';
import { useNotesStore, useStreakStore } from '../../src/stores';
import { COLORS, SUBJECTS } from '../../src/constants';
import Markdown from 'react-native-markdown-display';

export default function NoteEditorScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const notes = useNotesStore(state => state.notes);
    const updateNote = useNotesStore(state => state.updateNote);
    const deleteNote = useNotesStore(state => state.deleteNote);
    const recordStudyDay = useStreakStore(state => state.recordStudyDay);

    const note = notes.find(n => n.id === id);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [subject, setSubject] = useState('General');
    const [isFavorite, setIsFavorite] = useState(false);
    const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (note) {
            setTitle(note.title);
            setContent(note.content);
            setSubject(note.subject);
            setIsFavorite(note.isFavorite);
        }
    }, [note?.id]);

    // Auto-save with debounce
    useEffect(() => {
        if (!note || !hasChanges) return;

        const timer = setTimeout(async () => {
            await updateNote({
                ...note,
                title,
                content,
                subject,
                isFavorite,
            });
            setHasChanges(false);
            recordStudyDay(); // Record activity
        }, 1500);

        return () => clearTimeout(timer);
    }, [title, content, subject, isFavorite, hasChanges]);

    const handleChange = useCallback((field: 'title' | 'content' | 'subject', value: string) => {
        if (field === 'title') setTitle(value);
        else if (field === 'content') setContent(value);
        else if (field === 'subject') setSubject(value);
        setHasChanges(true);
    }, []);

    const handleToggleFavorite = useCallback(() => {
        setIsFavorite(prev => !prev);
        setHasChanges(true);
    }, []);

    const handleDelete = useCallback(async () => {
        if (!note) return;
        await deleteNote(note.id);
        router.back();
    }, [note, deleteNote, router]);

    if (!note) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.notFound}>
                    <Text style={styles.notFoundText}>Note not found</Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backLink}>Go back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={COLORS.light.text} />
                </TouchableOpacity>

                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={handleToggleFavorite} style={styles.headerButton}>
                        <Star size={22} color={isFavorite ? '#f59e0b' : COLORS.light.textMuted} fill={isFavorite ? '#f59e0b' : 'transparent'} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push({ pathname: '/modals/ai-chat', params: { noteId: id } })}
                        style={styles.headerButton}
                    >
                        <Sparkles size={22} color={COLORS.light.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
                        <Trash2 size={22} color={COLORS.light.error} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Title Input */}
            <View style={styles.titleContainer}>
                <TextInput
                    style={styles.titleInput}
                    value={title}
                    onChangeText={(v) => handleChange('title', v)}
                    placeholder="Note Title"
                    placeholderTextColor={COLORS.light.textMuted}
                />
                <View style={styles.subjectBadge}>
                    <Text style={styles.subjectText}>{subject}</Text>
                </View>
            </View>

            {/* View Mode Toggle */}
            <View style={styles.modeToggle}>
                <TouchableOpacity
                    style={[styles.modeButton, viewMode === 'edit' && styles.modeButtonActive]}
                    onPress={() => setViewMode('edit')}
                >
                    <Edit3 size={16} color={viewMode === 'edit' ? '#fff' : COLORS.light.textSecondary} />
                    <Text style={[styles.modeText, viewMode === 'edit' && styles.modeTextActive]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.modeButton, viewMode === 'preview' && styles.modeButtonActive]}
                    onPress={() => setViewMode('preview')}
                >
                    <Eye size={16} color={viewMode === 'preview' ? '#fff' : COLORS.light.textSecondary} />
                    <Text style={[styles.modeText, viewMode === 'preview' && styles.modeTextActive]}>Preview</Text>
                </TouchableOpacity>
            </View>

            {/* Content Area */}
            <KeyboardAvoidingView
                style={styles.contentContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={100}
            >
                {viewMode === 'edit' ? (
                    <TextInput
                        style={styles.contentInput}
                        value={content}
                        onChangeText={(v) => handleChange('content', v)}
                        placeholder="Start writing in Markdown..."
                        placeholderTextColor={COLORS.light.textMuted}
                        multiline
                        textAlignVertical="top"
                    />
                ) : (
                    <ScrollView style={styles.previewContainer} showsVerticalScrollIndicator={false}>
                        <Markdown style={markdownStyles}>
                            {content || '*Empty note*'}
                        </Markdown>
                    </ScrollView>
                )}
            </KeyboardAvoidingView>

            {/* Save Indicator */}
            {hasChanges && (
                <View style={styles.saveIndicator}>
                    <Text style={styles.saveText}>Saving...</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.light.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.light.border,
        backgroundColor: COLORS.light.surface,
    },
    backButton: { padding: 8 },
    headerActions: { flexDirection: 'row', gap: 8 },
    headerButton: { padding: 8, borderRadius: 8 },
    titleContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: COLORS.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.light.border,
    },
    titleInput: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.light.text,
        marginBottom: 8,
    },
    subjectBadge: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.light.primary + '15',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    subjectText: { fontSize: 12, color: COLORS.light.primary, fontWeight: '600' },
    modeToggle: {
        flexDirection: 'row',
        padding: 8,
        gap: 8,
        backgroundColor: COLORS.light.surfaceVariant,
    },
    modeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    modeButtonActive: { backgroundColor: COLORS.light.primary },
    modeText: { fontSize: 14, fontWeight: '600', color: COLORS.light.textSecondary },
    modeTextActive: { color: '#fff' },
    contentContainer: { flex: 1 },
    contentInput: {
        flex: 1,
        padding: 20,
        fontSize: 16,
        lineHeight: 24,
        color: COLORS.light.text,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    previewContainer: { flex: 1, padding: 20 },
    saveIndicator: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: COLORS.light.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    saveText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
    notFoundText: { fontSize: 16, color: COLORS.light.textSecondary },
    backLink: { fontSize: 16, color: COLORS.light.primary, fontWeight: '600' },
});

const markdownStyles = {
    body: { color: COLORS.light.text, fontSize: 16, lineHeight: 26 },
    heading1: { fontSize: 28, fontWeight: '800' as const, color: COLORS.light.text, marginVertical: 12 },
    heading2: { fontSize: 24, fontWeight: '700' as const, color: COLORS.light.text, marginVertical: 10 },
    heading3: { fontSize: 20, fontWeight: '600' as const, color: COLORS.light.text, marginVertical: 8 },
    paragraph: { marginVertical: 8 },
    strong: { fontWeight: '700' as const },
    em: { fontStyle: 'italic' as const },
    code_inline: {
        backgroundColor: COLORS.light.surfaceVariant,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    code_block: {
        backgroundColor: COLORS.light.surfaceVariant,
        padding: 16,
        borderRadius: 12,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 14,
    },
    blockquote: {
        backgroundColor: COLORS.light.primary + '10',
        borderLeftWidth: 4,
        borderLeftColor: COLORS.light.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginVertical: 8,
    },
    list_item: { marginVertical: 4 },
    bullet_list_icon: { color: COLORS.light.primary },
};
