// Notes Screen - Grid/List View with Filtering
// Enhanced with LinearGradient, Glassmorphism, and Reanimated Animations
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, RefreshControl } from 'react-native';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, Filter, Grid, List, BookOpen, Clock, ChevronRight, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useNotesStore } from '../../src/stores';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useResponsiveLayout } from '../../src/hooks/useResponsiveLayout';
import { format } from 'date-fns';

export default function NotesScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ action?: string }>();
    const colors = useThemeColors();
    const { numColumns, containerPadding, gap } = useResponsiveLayout(); // Use adaptive layout

    // Auto-open new note if action=new parameter is passed
    useEffect(() => {
        if (params.action === 'new') {
            const createAndOpen = async () => {
                const note = await useNotesStore.getState().addNote({ title: 'New Note', content: '', subject: 'General' });
                router.setParams({ action: '' }); // Clear param
                router.push({ pathname: '/(tabs)/notes/editor', params: { id: note.id } });
            };
            createAndOpen();
        }
    }, [params.action]);

    const notes = useNotesStore(state => state.notes);
    const loadNotes = useNotesStore(state => state.loadNotes);
    const searchQuery = useNotesStore(state => state.searchQuery);
    const setSearchQuery = useNotesStore(state => state.setSearchQuery);
    const selectedSubject = useNotesStore(state => state.selectedSubject);
    const setSelectedSubject = useNotesStore(state => state.setSelectedSubject);
    const addNote = useNotesStore(state => state.addNote);

    const searchInputRef = useRef<TextInput>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // Toggle view
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadNotes();
        setRefreshing(false);
    }, [loadNotes]);

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
        return result.sort((a, b) => b.updatedAt - a.updatedAt);
    }, [notes, searchQuery, selectedSubject]);

    const subjects = useMemo(() => {
        const set = new Set(notes.map(n => n.subject).filter(Boolean));
        return Array.from(set).sort();
    }, [notes]);

    const handleNotePress = (id: string) => {
        router.push({ pathname: '/(tabs)/notes/editor', params: { id } });
    };

    const handleCreateNote = async () => {
        const note = await addNote({ title: 'New Note', content: '', subject: selectedSubject || 'General' });
        handleNotePress(note.id);
    };

    const renderItem = ({ item, index }: { item: any, index: number }) => (
        <Animated.View
            entering={FadeInDown.delay(index * 50).springify()}
            layout={Layout.springify()}
            style={[
                viewMode === 'grid' ? styles.gridItem : styles.listItem,
                { backgroundColor: colors.surface, flex: viewMode === 'grid' && numColumns > 1 ? 1 / numColumns - 0.05 : undefined }
            ]}
        >
            <TouchableOpacity onPress={() => handleNotePress(item.id)} style={{ flex: 1 }}>
                <View style={[styles.iconBox, { backgroundColor: colors.surfaceHighlight }]}>
                    <BookOpen size={20} color={colors.primary} />
                </View>
                <View style={styles.cardContent}>
                    <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                    <Text style={[styles.notePreview, { color: colors.textSecondary }]} numberOfLines={3}>
                        {item.content || 'No content...'}
                    </Text>
                    <View style={styles.cardFooter}>
                        <Text style={[styles.dateText, { color: colors.textMuted }]}>
                            {format(item.updatedAt, 'MMM d')}
                        </Text>
                        <View style={[styles.subjectTag, { backgroundColor: colors.surfaceVariant }]}>
                            <Text style={[styles.subjectText, { color: colors.textSecondary }]}>{item.subject}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
                <View style={[styles.header, { paddingHorizontal: containerPadding }]}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>My Notes</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            onPress={() => setViewMode(m => m === 'grid' ? 'list' : 'grid')}
                            style={[styles.iconButton, { backgroundColor: colors.surface }]}
                        >
                            {viewMode === 'grid' ? <List size={20} color={colors.text} /> : <Grid size={20} color={colors.text} />}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search & Filter */}
                <View style={[styles.searchSection, { paddingHorizontal: containerPadding }]}>
                    <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
                        <Search size={20} color={colors.textSecondary} />
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
                                <X size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                { backgroundColor: !selectedSubject ? colors.primary : colors.surface },
                                !selectedSubject && { borderColor: colors.primary, borderWidth: 1 }
                            ]}
                            onPress={() => setSelectedSubject(null)}
                        >
                            <Text style={[styles.filterText, { color: !selectedSubject ? '#FFF' : colors.text }]}>All</Text>
                        </TouchableOpacity>
                        {subjects.map(sub => (
                            <TouchableOpacity
                                key={sub}
                                style={[
                                    styles.filterChip,
                                    { backgroundColor: selectedSubject === sub ? colors.primary : colors.surface }
                                ]}
                                onPress={() => setSelectedSubject(sub === selectedSubject ? null : sub)}
                            >
                                <Text style={[styles.filterText, { color: selectedSubject === sub ? '#FFF' : colors.text }]}>{sub}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Notes Grid/List */}
                <ScrollView
                    contentContainerStyle={[styles.grid, { padding: containerPadding, gap }]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                >
                    {filteredNotes.length > 0 ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
                            {filteredNotes.map((note, index) => (
                                <Animated.View
                                    key={note.id}
                                    entering={FadeInDown.delay(index * 50).springify()}
                                    layout={Layout.springify()}
                                    style={[
                                        viewMode === 'grid' ? styles.gridItem : styles.listItem,
                                        { backgroundColor: colors.surface, width: viewMode === 'grid' && numColumns > 1 ? `${98 / numColumns}%` : '100%' }
                                    ]}
                                >
                                    <TouchableOpacity onPress={() => handleNotePress(note.id)} style={{ flex: 1 }}>
                                        <View style={styles.cardHeader}>
                                            <View style={[styles.iconBox, { backgroundColor: colors.surfaceHighlight }]}>
                                                <BookOpen size={18} color={colors.primary} />
                                            </View>
                                            <View style={[styles.subjectTag, { backgroundColor: colors.surfaceVariant }]}>
                                                <Text style={[styles.subjectText, { color: colors.textSecondary }]}>{note.subject}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.cardBody}>
                                            <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={2}>{note.title}</Text>
                                            <Text style={[styles.notePreview, { color: colors.textSecondary }]} numberOfLines={viewMode === 'grid' ? 4 : 2}>
                                                {note.content || 'No content...'}
                                            </Text>
                                        </View>

                                        <View style={styles.cardFooter}>
                                            <Text style={[styles.dateText, { color: colors.textMuted }]}>
                                                {format(note.updatedAt, 'MMM d, yyyy')}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No notes found.</Text>
                        </View>
                    )}
                    <View style={{ height: 80 }} />
                </ScrollView>

                {/* FAB */}
                <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.fabContainer}
                >
                    <TouchableOpacity style={styles.fab} onPress={handleCreateNote}>
                        <Plus size={24} color="#FFF" />
                    </TouchableOpacity>
                </LinearGradient>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerTitle: { fontSize: 28, fontWeight: '700' },
    headerActions: { flexDirection: 'row', gap: 12 },
    iconButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

    searchSection: { marginBottom: 16 },
    searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48, borderRadius: 16, gap: 10, marginBottom: 12 },
    searchInput: { flex: 1, fontSize: 16 },
    filterScroll: { gap: 8, paddingRight: 20 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
    filterText: { fontSize: 13, fontWeight: '600' },

    grid: { paddingBottom: 100 },
    gridItem: { borderRadius: 20, padding: 16, minHeight: 180, marginBottom: 0 },
    listItem: { borderRadius: 16, padding: 16, flexDirection: 'column', minHeight: 100, marginBottom: 0 },

    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    cardBody: { flex: 1, marginBottom: 12 },
    cardContent: { flex: 1 },
    noteTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
    notePreview: { fontSize: 14, lineHeight: 20 },

    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' },
    dateText: { fontSize: 12 },
    subjectTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    subjectText: { fontSize: 11, fontWeight: '600' },

    emptyState: { padding: 40, alignItems: 'center' },
    emptyText: { fontSize: 16 },

    fabContainer: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        elevation: 5,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    fab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});