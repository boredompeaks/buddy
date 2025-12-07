// Notes Tab Screen
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search, FolderOpen, Star, X } from 'lucide-react-native';
import { useNotesStore } from '../../src/stores';
import { COLORS, SUBJECTS } from '../../src/constants';
import { format } from 'date-fns';

export default function NotesScreen() {
    const router = useRouter();
    const notes = useNotesStore(state => state.notes);
    const searchQuery = useNotesStore(state => state.searchQuery);
    const setSearchQuery = useNotesStore(state => state.setSearchQuery);
    const selectedSubject = useNotesStore(state => state.selectedSubject);
    const setSelectedSubject = useNotesStore(state => state.setSelectedSubject);
    const addNote = useNotesStore(state => state.addNote);

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
        const note = await addNote({ title: 'Untitled Note', subject: selectedSubject || 'General' });
        router.push(`/note/${note.id}`);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Notes</Text>
                <TouchableOpacity style={styles.addButton} onPress={handleCreateNote}>
                    <Plus size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Search size={20} color={COLORS.light.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search notes..."
                    placeholderTextColor={COLORS.light.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <X size={18} color={COLORS.light.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

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
                        style={[styles.filterChip, selectedSubject === item && styles.filterChipActive]}
                        onPress={() => setSelectedSubject(item)}
                    >
                        <Text style={[styles.filterText, selectedSubject === item && styles.filterTextActive]}>
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
                        <FolderOpen size={48} color={COLORS.light.textMuted} />
                        <Text style={styles.emptyTitle}>No notes yet</Text>
                        <Text style={styles.emptySubtitle}>Tap + to create your first note</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.noteCard}
                        onPress={() => router.push(`/note/${item.id}`)}
                    >
                        <View style={styles.noteHeader}>
                            <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
                            {item.isFavorite && <Star size={16} color="#f59e0b" fill="#f59e0b" />}
                        </View>
                        <Text style={styles.notePreview} numberOfLines={2}>
                            {item.content || 'Empty note'}
                        </Text>
                        <View style={styles.noteMeta}>
                            <Text style={styles.noteSubject}>{item.subject}</Text>
                            <Text style={styles.noteDate}>{format(item.updatedAt, 'MMM d')}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.light.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    title: { fontSize: 28, fontWeight: '800', color: COLORS.light.text },
    addButton: {
        backgroundColor: COLORS.light.primary,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.light.surface,
        marginHorizontal: 20,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 12,
    },
    searchInput: { flex: 1, height: 48, fontSize: 16, color: COLORS.light.text },
    filterList: { maxHeight: 44, marginTop: 12 },
    filterContent: { paddingHorizontal: 20, gap: 8 },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: COLORS.light.surface,
        borderRadius: 20,
        marginRight: 8,
    },
    filterChipActive: { backgroundColor: COLORS.light.primary },
    filterText: { fontSize: 14, color: COLORS.light.textSecondary, fontWeight: '500' },
    filterTextActive: { color: '#fff' },
    listContent: { padding: 20, paddingTop: 16 },
    noteCard: {
        backgroundColor: COLORS.light.surface,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    noteTitle: { fontSize: 17, fontWeight: '600', color: COLORS.light.text, flex: 1 },
    notePreview: { fontSize: 14, color: COLORS.light.textSecondary, marginTop: 8, lineHeight: 20 },
    noteMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    noteSubject: {
        fontSize: 12,
        color: COLORS.light.primary,
        backgroundColor: COLORS.light.primary + '15',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        fontWeight: '500',
    },
    noteDate: { fontSize: 12, color: COLORS.light.textMuted },
    emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.light.text },
    emptySubtitle: { fontSize: 14, color: COLORS.light.textSecondary },
});
