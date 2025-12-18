// Note Editor Screen - Full note editing experience with Dark Mode & Embeds
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2, Star, Eye, Edit3, Sparkles, Image as ImageIcon, FileText, MoreVertical } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Markdown from 'react-native-markdown-display';

import { useNotesStore, useStreakStore } from '../../src/stores';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { SUBJECTS } from '../../src/constants';

export default function NoteEditorScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const colors = useThemeColors();
    const styles = useMemo(() => makeStyles(colors), [colors]);

    const notes = useNotesStore(state => state.notes);
    const updateNote = useNotesStore(state => state.updateNote);
    const deleteNote = useNotesStore(state => state.deleteNote);
    const recordStudyDay = useStreakStore(state => state.recordStudyDay);

    const note = notes.find(n => n.id === id);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [subject, setSubject] = useState('General');
    const [isFavorite, setIsFavorite] = useState(false);
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
    const [hasChanges, setHasChanges] = useState(false);
    const [selection, setSelection] = useState({ start: 0, end: 0 });

    // Refs for flush-on-unmount
    const pendingStateRef = useRef({ title: '', content: '', subject: '', isFavorite: false });
    const hasChangesRef = useRef(false);
    const isSavingRef = useRef(false);

    useEffect(() => {
        if (note) {
            setTitle(note.title);
            setContent(note.content);
            setSubject(note.subject);
            setIsFavorite(note.isFavorite);
            pendingStateRef.current = { title: note.title, content: note.content, subject: note.subject, isFavorite: note.isFavorite };
            hasChangesRef.current = false;
        }
    }, [note?.id]);

    useEffect(() => {
        pendingStateRef.current = { title, content, subject, isFavorite };
        hasChangesRef.current = hasChanges;
    }, [title, content, subject, isFavorite, hasChanges]);

    // Flush pending changes on unmount
    useEffect(() => {
        return () => {
            if (hasChangesRef.current && note && !isSavingRef.current) {
                isSavingRef.current = true;
                const { title, content, subject, isFavorite } = pendingStateRef.current;
                updateNote({
                    ...note,
                    title: title || 'Untitled',
                    content,
                    subject,
                    isFavorite,
                }).catch(err => console.warn('Flush save failed:', err));
            }
        };
    }, [note, updateNote]);

    // Auto-save
    useEffect(() => {
        if (!note || !hasChanges) return;

        const timer = setTimeout(async () => {
            isSavingRef.current = true;
            try {
                await updateNote({
                    ...note,
                    title,
                    content,
                    subject,
                    isFavorite,
                });
                setHasChanges(false);
                hasChangesRef.current = false;
                recordStudyDay();
            } finally {
                isSavingRef.current = false;
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [title, content, subject, isFavorite, hasChanges, note, updateNote, recordStudyDay]);

    // Hardware Back Button
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (hasChangesRef.current && !isSavingRef.current) {
                    handleManualSave();
                }
                return false;
            };
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [])
    );

    const handleManualSave = useCallback(async () => {
        if (!note || isSavingRef.current) return;
        isSavingRef.current = true;
        try {
            await updateNote({
                ...note,
                title: title || 'Untitled',
                content,
                subject,
                isFavorite,
            });
            setHasChanges(false);
            hasChangesRef.current = false;
        } finally {
            isSavingRef.current = false;
        }
    }, [note, title, content, subject, isFavorite, updateNote]);

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
        Alert.alert(
            'Delete Note',
            'Are you sure you want to delete this note? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteNote(note.id);
                        router.back();
                    }
                }
            ]
        );
    }, [note, deleteNote, router]);

    // Embed Functions
    const insertText = (text: string) => {
        const newContent = content.substring(0, selection.start) + text + content.substring(selection.end);
        setContent(newContent);
        setHasChanges(true);
    };

    const handleImagePick = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
            });
            if (!result.canceled && result.assets[0].uri) {
                insertText(`\n![Image](${result.assets[0].uri})\n`);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleDocumentPick = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'text/plain'],
                copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                insertText(`\n[${result.assets[0].name}](${result.assets[0].uri})\n`);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick document');
        }
    };

    const markdownStyles = useMemo(() => ({
        body: { color: colors.text, fontSize: 16, lineHeight: 26 },
        heading1: { fontSize: 28, fontWeight: '800' as const, color: colors.text, marginVertical: 12 },
        heading2: { fontSize: 24, fontWeight: '700' as const, color: colors.text, marginVertical: 10 },
        heading3: { fontSize: 20, fontWeight: '600' as const, color: colors.text, marginVertical: 8 },
        paragraph: { marginVertical: 8 },
        strong: { fontWeight: '700' as const, color: colors.text },
        em: { fontStyle: 'italic' as const },
        code_inline: {
            backgroundColor: colors.surfaceVariant,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            color: colors.primary,
        },
        code_block: {
            backgroundColor: colors.surfaceVariant,
            padding: 16,
            borderRadius: 12,
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            fontSize: 14,
            color: colors.text,
        },
        blockquote: {
            backgroundColor: colors.primary + '10',
            borderLeftWidth: 4,
            borderLeftColor: colors.primary,
            paddingHorizontal: 16,
            paddingVertical: 8,
            marginVertical: 8,
            color: colors.textSecondary,
        },
        list_item: { marginVertical: 4 },
        bullet_list_icon: { color: colors.primary },
    }), [colors]);

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
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={handleToggleFavorite} style={styles.headerButton}>
                        <Star size={22} color={isFavorite ? '#f59e0b' : colors.textMuted} fill={isFavorite ? '#f59e0b' : 'transparent'} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push({ pathname: '/modals/ai-chat', params: { noteId: id } })}
                        style={styles.headerButton}
                    >
                        <Sparkles size={22} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
                        <Trash2 size={22} color={colors.error} />
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
                    placeholderTextColor={colors.textMuted}
                />
                <View style={styles.subjectBadge}>
                    <Text style={styles.subjectText}>{subject}</Text>
                </View>
            </View>

            {/* Mode & Toolbar */}
            <View style={styles.toolbarContainer}>
                <View style={styles.modeToggle}>
                    <TouchableOpacity
                        style={[styles.modeButton, viewMode === 'edit' && styles.modeButtonActive]}
                        onPress={() => setViewMode('edit')}
                    >
                        <Edit3 size={16} color={viewMode === 'edit' ? '#fff' : colors.textSecondary} />
                        <Text style={[styles.modeText, viewMode === 'edit' && styles.modeTextActive]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.modeButton, viewMode === 'preview' && styles.modeButtonActive]}
                        onPress={() => setViewMode('preview')}
                    >
                        <Eye size={16} color={viewMode === 'preview' ? '#fff' : colors.textSecondary} />
                        <Text style={[styles.modeText, viewMode === 'preview' && styles.modeTextActive]}>Preview</Text>
                    </TouchableOpacity>
                </View>
                {/* Embed Tools */}
                {viewMode === 'edit' && (
                    <View style={styles.embedTools}>
                        <TouchableOpacity onPress={handleImagePick} style={styles.toolButton}>
                            <ImageIcon size={20} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDocumentPick} style={styles.toolButton}>
                            <FileText size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                )}
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
                        placeholderTextColor={colors.textMuted}
                        multiline
                        textAlignVertical="top"
                        onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
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

const makeStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    backButton: { padding: 8 },
    headerActions: { flexDirection: 'row', gap: 8 },
    headerButton: { padding: 8, borderRadius: 8 },
    titleContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    titleInput: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    subjectBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.primary + '15',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    subjectText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
    toolbarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 8,
        backgroundColor: colors.surfaceVariant,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modeToggle: {
        flexDirection: 'row',
        gap: 8,
        flex: 1,
    },
    modeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 6,
    },
    modeButtonActive: { backgroundColor: colors.primary },
    modeText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    modeTextActive: { color: '#fff' },
    embedTools: {
        flexDirection: 'row',
        gap: 4,
    },
    toolButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.surface,
    },
    contentContainer: { flex: 1 },
    contentInput: {
        flex: 1,
        padding: 20,
        fontSize: 16,
        lineHeight: 24,
        color: colors.text,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    previewContainer: { flex: 1, padding: 20 },
    saveIndicator: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    saveText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
    notFoundText: { fontSize: 16, color: colors.textSecondary },
    backLink: { fontSize: 16, color: colors.primary, fontWeight: '600' },
});
