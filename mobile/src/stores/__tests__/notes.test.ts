// Unit tests for Notes Store
import { renderHook, act } from '@testing-library/react-native';

// Mock database
jest.mock('../../services/database', () => ({
    getAllNotes: jest.fn().mockResolvedValue([]),
    saveNote: jest.fn().mockResolvedValue(undefined),
    deleteNote: jest.fn().mockResolvedValue(undefined),
}));

// Mock crypto.randomUUID
global.crypto = {
    randomUUID: jest.fn().mockReturnValue('test-uuid-123'),
} as any;

import { useNotesStore } from '../index';
import * as db from '../../services/database';

describe('NotesStore', () => {
    beforeEach(() => {
        // Reset store state
        useNotesStore.setState({
            notes: [],
            isLoading: false,
            searchQuery: '',
            selectedSubject: null,
        });
        jest.clearAllMocks();
    });

    describe('loadNotes', () => {
        it('should load notes from database', async () => {
            const mockNotes = [
                { id: '1', title: 'Test Note', content: 'Content', subject: 'Physics', tags: [], createdAt: 1000, updatedAt: 1000, isFavorite: false, isArchived: false },
            ];
            (db.getAllNotes as jest.Mock).mockResolvedValue(mockNotes);

            const { result } = renderHook(() => useNotesStore());

            await act(async () => {
                await result.current.loadNotes();
            });

            expect(db.getAllNotes).toHaveBeenCalled();
            expect(result.current.notes).toEqual(mockNotes);
            expect(result.current.isLoading).toBe(false);
        });

        it('should handle load error gracefully', async () => {
            (db.getAllNotes as jest.Mock).mockRejectedValue(new Error('DB Error'));

            const { result } = renderHook(() => useNotesStore());

            await act(async () => {
                await result.current.loadNotes();
            });

            expect(result.current.notes).toEqual([]);
            expect(result.current.isLoading).toBe(false);
        });
    });

    describe('addNote', () => {
        it('should add a new note with defaults', async () => {
            const { result } = renderHook(() => useNotesStore());

            let note;
            await act(async () => {
                note = await result.current.addNote({ title: 'New Note' });
            });

            expect(note).toMatchObject({
                id: 'test-uuid-123',
                title: 'New Note',
                content: '',
                subject: 'General',
                tags: [],
                isFavorite: false,
                isArchived: false,
            });
            expect(db.saveNote).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Note' }));
            expect(result.current.notes).toHaveLength(1);
        });
    });

    describe('updateNote', () => {
        it('should update an existing note', async () => {
            const existingNote = {
                id: '1',
                title: 'Original',
                content: 'Content',
                subject: 'Physics',
                tags: [],
                createdAt: 1000,
                updatedAt: 1000,
                isFavorite: false,
                isArchived: false,
            };

            useNotesStore.setState({ notes: [existingNote] });
            const { result } = renderHook(() => useNotesStore());

            await act(async () => {
                await result.current.updateNote({ ...existingNote, title: 'Updated' });
            });

            expect(db.saveNote).toHaveBeenCalled();
            expect(result.current.notes[0].title).toBe('Updated');
        });
    });

    describe('deleteNote', () => {
        it('should remove note from state', async () => {
            const existingNote = {
                id: '1',
                title: 'To Delete',
                content: '',
                subject: 'General',
                tags: [],
                createdAt: 1000,
                updatedAt: 1000,
                isFavorite: false,
                isArchived: false,
            };

            useNotesStore.setState({ notes: [existingNote] });
            const { result } = renderHook(() => useNotesStore());

            await act(async () => {
                await result.current.deleteNote('1');
            });

            expect(db.deleteNote).toHaveBeenCalledWith('1');
            expect(result.current.notes).toHaveLength(0);
        });
    });

    describe('search and filter', () => {
        it('should set search query', () => {
            const { result } = renderHook(() => useNotesStore());

            act(() => {
                result.current.setSearchQuery('test');
            });

            expect(result.current.searchQuery).toBe('test');
        });

        it('should set selected subject', () => {
            const { result } = renderHook(() => useNotesStore());

            act(() => {
                result.current.setSelectedSubject('Physics');
            });

            expect(result.current.selectedSubject).toBe('Physics');
        });
    });
});
