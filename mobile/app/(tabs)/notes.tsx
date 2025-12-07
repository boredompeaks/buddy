// Notes Tab Screen
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Pressable } from 'react-native';
import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search, FolderOpen, Star, X } from 'lucide-react-native';
import { useNotesStore } from '../../src/stores';
import { useThemeColors } from '../../hooks/useThemeColors';
import { format } from 'date-fns';

export default function NotesScreen() {
    const router = useRouter();
    const colors = useThemeColors();
    const notes = useNotesStore(state => state.notes);
    const searchQuery = useNotesStore(state => state.searchQuery);
    const setSearchQuery = useNotesStore(state => state.setSearchQuery);
    const selectedSubject = useNotesStore(state => state.selectedSubject);
    const setSelectedSubject = useNotesStore(state => state.setSelectedSubject);
    const addNote = useNotesStore(state => state.addNote);

    const searchInputRef = useRef<TextInput>(null);

    const filteredNotes = useMemo(() => {
        let result = notes;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(n =>
                n.title.toLowerCase().includes(query) ||
                n.content.toLowerCase().includes(query)
            );
        }
        if (selectedSubject) {
            result = result.filter(n => n.subject === selectedSubject);
        }
        return result;
    }, [notes, searchQuery, selectedSubject]);

    // Group by subject
    const subjects = useMemo(() => {
        const counts: Record<string, number> = {};
        notes.forEach(n => {
            counts[n.subject] = (counts[n.subject] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [notes]);

    const handleCreateNote = async () => {
        try {
            const note = await addNote({ title: 'Untitled Note', subject: selectedSubject || 'General' });
            router.push(`/note/${note.id}`);
        } catch (error) {
            console.error("Failed to create note:", error);
            // Optionally show an alert here
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Notes</Text>
                <TouchableOpacity 
                    style={[styles.addButton, { backgroundColor: colors.primary }]} 
                    onPress={handleCreateNote}
                >
                    <Plus size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Search */}
            <Pressable 
                style={[styles.searchContainer, { backgroundColor: colors.surface }]}
                onPress={() => searchInputRef.current?.focus()}
            >
                <Search size={20} color={colors.textMuted} />
                <TextInput
                    ref={searchInputRef}
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search notes..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <X size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                )}
            </Pressable>

            {/* Subject Filter */}
            <FlatList
                horizontal
                data={[null, ...subjects.map(s => s[0])]}
                keyExtractor={(item) => item || 'all'}
                showsHorizontalScrollIndicator={false}
                style={styles.filterList}
                contentContainerStyle={styles.filterContent}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.filterChip, 
                            { backgroundColor: selectedSubject === item ? colors.primary : colors.surface }
                        ]}
                        onPress={() => setSelectedSubject(item)}
                    >
                        <Text style={[
                            styles.filterText, 
                            { color: selectedSubject === item ? '#fff' : colors.textSecondary }
                        ]}>
                            {item || 'All'}
                        </Text>
                    </TouchableOpacity>
                )}
            />

            {/* Notes List */}
            <FlatList
                data={filteredNotes}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <FolderOpen size={48} color={colors.textMuted} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No notes yet</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Tap + to create your first note</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.noteCard, { backgroundColor: colors.surface }]}
                        onPress={() => router.push(`/note/${item.id}`)}
                    >
                        <View style={styles.noteHeader}>
                            <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                            {item.isFavorite && <Star size={16} color="#f59e0b" fill="#f59e0b" />}
                        </View>
                        <Text style={[styles.notePreview, { color: colors.textSecondary }]} numberOfLines={2}>
                            {item.content || 'Empty note'}
                        </Text>
                        <View style={styles.noteMeta}>
                            <Text style={[styles.noteSubject, { color: colors.primary, backgroundColor: colors.primary + '15' }]}>{item.subject}</Text>
                            <Text style={[styles.noteDate, { color: colors.textMuted }]}>{format(item.updatedAt, 'MMM d')}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    title: { fontSize: 28, fontWeight: '800' },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        paddingHorizontal: 16,
        borderRadius: 16,
        gap: 12,
        height: 52,
    },
    searchInput: { flex: 1, fontSize: 16, height: '100%' },
    filterList: { maxHeight: 50, marginTop: 16 },
    filterContent: { paddingHorizontal: 20, gap: 8 },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 8,
    },
    filterText: { fontSize: 14, fontWeight: '600' },
    listContent: { padding: 20, paddingTop: 16 },
    noteCard: {
        padding: 20,
        borderRadius: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    noteTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
    notePreview: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
    noteMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    noteSubject: {
        fontSize: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        fontWeight: '600',
    },
    noteDate: { fontSize: 12, fontWeight: '500' },
    emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyTitle: { fontSize: 20, fontWeight: '700' },
    emptySubtitle: { fontSize: 16 },
});