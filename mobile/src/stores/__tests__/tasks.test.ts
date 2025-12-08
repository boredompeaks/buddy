// Unit tests for Tasks Store
import { renderHook, act } from '@testing-library/react-native';

// Mock database
jest.mock('../../services/database', () => ({
    getAllTasks: jest.fn().mockResolvedValue([]),
    saveTask: jest.fn().mockResolvedValue(undefined),
    deleteTask: jest.fn().mockResolvedValue(undefined),
}));

// Mock crypto.randomUUID
global.crypto = {
    randomUUID: jest.fn().mockReturnValue('test-task-uuid'),
} as any;

import { useTasksStore } from '../index';
import * as db from '../../services/database';
import { Task } from '../../types';

describe('TasksStore', () => {
    beforeEach(() => {
        useTasksStore.setState({
            tasks: [],
            isLoading: false,
            activeCategory: 'daily',
        });
        jest.clearAllMocks();
    });

    describe('loadTasks', () => {
        it('should load tasks from database', async () => {
            const mockTasks = [
                { id: '1', text: 'Task 1', completed: false, category: 'daily', priority: 'medium', createdAt: 1000 },
            ];
            (db.getAllTasks as jest.Mock).mockResolvedValue(mockTasks);

            const { result } = renderHook(() => useTasksStore());

            await act(async () => {
                await result.current.loadTasks();
            });

            expect(db.getAllTasks).toHaveBeenCalled();
            expect(result.current.tasks).toEqual(mockTasks);
        });
    });

    describe('addTask', () => {
        it('should add task with default category', async () => {
            const { result } = renderHook(() => useTasksStore());

            let task;
            await act(async () => {
                task = await result.current.addTask({ text: 'New Task' });
            });

            expect(task).toMatchObject({
                id: 'test-task-uuid',
                text: 'New Task',
                completed: false,
                category: 'daily',
                priority: 'medium',
            });
            expect(db.saveTask).toHaveBeenCalled();
        });

        it('should use active category for new tasks', async () => {
            useTasksStore.setState({ activeCategory: 'weekly' });
            const { result } = renderHook(() => useTasksStore());

            let task: Task | undefined;
            await act(async () => {
                task = await result.current.addTask({ text: 'Weekly Task' });
            });

            expect(task?.category).toBe('weekly');
        });
    });

    describe('toggleTask', () => {
        it('should toggle task completed state', async () => {
            const existingTask = {
                id: '1',
                text: 'Task',
                completed: false,
                category: 'daily' as const,
                priority: 'medium' as const,
                createdAt: 1000,
            };

            useTasksStore.setState({ tasks: [existingTask] });
            const { result } = renderHook(() => useTasksStore());

            await act(async () => {
                await result.current.toggleTask('1');
            });

            expect(result.current.tasks[0].completed).toBe(true);
            expect(result.current.tasks[0].completedAt).toBeDefined();
        });
    });

    describe('deleteTask', () => {
        it('should remove task from state', async () => {
            const existingTask = {
                id: '1',
                text: 'To Delete',
                completed: false,
                category: 'daily' as const,
                priority: 'low' as const,
                createdAt: 1000,
            };

            useTasksStore.setState({ tasks: [existingTask] });
            const { result } = renderHook(() => useTasksStore());

            await act(async () => {
                await result.current.deleteTask('1');
            });

            expect(db.deleteTask).toHaveBeenCalledWith('1');
            expect(result.current.tasks).toHaveLength(0);
        });
    });

    describe('setActiveCategory', () => {
        it('should change active category', () => {
            const { result } = renderHook(() => useTasksStore());

            act(() => {
                result.current.setActiveCategory('exam');
            });

            expect(result.current.activeCategory).toBe('exam');
        });
    });
});
