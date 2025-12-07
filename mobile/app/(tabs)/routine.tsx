// Routine Tab Screen
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, CheckCircle2, Circle, Trash2, Calendar, Target, Flame } from 'lucide-react-native';
import { useTasksStore, useExamStore, useStreakStore } from '../../src/stores';
import { COLORS, PRIORITY_COLORS } from '../../src/constants';
import { format, differenceInDays } from 'date-fns';

export default function RoutineScreen() {
    const [newTaskText, setNewTaskText] = useState('');
    const tasks = useTasksStore(state => state.tasks);
    const activeCategory = useTasksStore(state => state.activeCategory);
    const setActiveCategory = useTasksStore(state => state.setActiveCategory);
    const addTask = useTasksStore(state => state.addTask);
    const toggleTask = useTasksStore(state => state.toggleTask);
    const deleteTask = useTasksStore(state => state.deleteTask);
    const exams = useExamStore(state => state.exams);
    const streak = useStreakStore(state => state.streak);

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => t.category === activeCategory);
    }, [tasks, activeCategory]);

    const completedCount = useMemo(() => {
        return filteredTasks.filter(t => t.completed).length;
    }, [filteredTasks]);

    const progress = filteredTasks.length > 0
        ? Math.round((completedCount / filteredTasks.length) * 100)
        : 0;

    const handleAddTask = async () => {
        if (!newTaskText.trim()) return;
        await addTask({ text: newTaskText.trim() });
        setNewTaskText('');
    };

    const categories = ['daily', 'weekly', 'exam'] as const;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Routine</Text>
                        <Text style={styles.subtitle}>Stay disciplined</Text>
                    </View>
                    <View style={styles.streakBadge}>
                        <Flame size={20} color={streak.currentStreak > 0 ? '#f59e0b' : COLORS.light.textMuted} />
                        <Text style={styles.streakText}>{streak.currentStreak} day streak</Text>
                    </View>
                </View>

                {/* Progress Ring */}
                <View style={styles.progressCard}>
                    <View style={styles.progressRing}>
                        <Text style={styles.progressValue}>{progress}%</Text>
                    </View>
                    <View style={styles.progressInfo}>
                        <Text style={styles.progressTitle}>{activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Progress</Text>
                        <Text style={styles.progressSubtitle}>{completedCount} of {filteredTasks.length} completed</Text>
                    </View>
                </View>

                {/* Category Tabs */}
                <View style={styles.tabs}>
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.tab, activeCategory === cat && styles.tabActive]}
                            onPress={() => setActiveCategory(cat)}
                        >
                            <Text style={[styles.tabText, activeCategory === cat && styles.tabTextActive]}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Add Task */}
                <View style={styles.addTaskContainer}>
                    <TextInput
                        style={styles.addTaskInput}
                        placeholder={`Add ${activeCategory} task...`}
                        placeholderTextColor={COLORS.light.textMuted}
                        value={newTaskText}
                        onChangeText={setNewTaskText}
                        onSubmitEditing={handleAddTask}
                    />
                    <TouchableOpacity style={styles.addTaskButton} onPress={handleAddTask}>
                        <Plus size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Tasks List */}
                <View style={styles.tasksList}>
                    {filteredTasks.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Target size={40} color={COLORS.light.textMuted} />
                            <Text style={styles.emptyText}>No {activeCategory} tasks yet</Text>
                        </View>
                    ) : (
                        filteredTasks.map(task => (
                            <View key={task.id} style={styles.taskItem}>
                                <TouchableOpacity onPress={() => toggleTask(task.id)}>
                                    {task.completed ? (
                                        <CheckCircle2 size={24} color={COLORS.light.success} />
                                    ) : (
                                        <Circle size={24} color={COLORS.light.textMuted} />
                                    )}
                                </TouchableOpacity>
                                <View style={styles.taskContent}>
                                    <Text style={[styles.taskText, task.completed && styles.taskCompleted]}>
                                        {task.text}
                                    </Text>
                                    <View style={styles.taskMeta}>
                                        <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[task.priority] + '20' }]}>
                                            <Text style={[styles.priorityText, { color: PRIORITY_COLORS[task.priority] }]}>
                                                {task.priority}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => deleteTask(task.id)} style={styles.deleteButton}>
                                    <Trash2 size={18} color={COLORS.light.textMuted} />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>

                {/* Upcoming Exams */}
                {exams.length > 0 && (
                    <View style={styles.examsSection}>
                        <Text style={styles.sectionTitle}>Exam Schedule</Text>
                        {exams.slice(0, 3).map(exam => (
                            <View key={exam.id} style={styles.examCard}>
                                <Calendar size={20} color={COLORS.light.primary} />
                                <View style={styles.examInfo}>
                                    <Text style={styles.examSubject}>{exam.subjectName}</Text>
                                    <Text style={styles.examDate}>{format(exam.examDate, 'MMMM d, yyyy')}</Text>
                                </View>
                                <View style={styles.examCountdown}>
                                    <Text style={styles.countdownNumber}>
                                        {differenceInDays(exam.examDate, Date.now())}
                                    </Text>
                                    <Text style={styles.countdownLabel}>days</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.light.background },
    content: { padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 28, fontWeight: '800', color: COLORS.light.text },
    subtitle: { fontSize: 15, color: COLORS.light.textSecondary },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.light.surface,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    streakText: { fontSize: 13, fontWeight: '600', color: COLORS.light.text },
    progressCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.light.surface,
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
        gap: 20,
    },
    progressRing: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 6,
        borderColor: COLORS.light.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressValue: { fontSize: 18, fontWeight: '700', color: COLORS.light.primary },
    progressInfo: { flex: 1 },
    progressTitle: { fontSize: 16, fontWeight: '600', color: COLORS.light.text },
    progressSubtitle: { fontSize: 13, color: COLORS.light.textSecondary, marginTop: 4 },
    tabs: { flexDirection: 'row', backgroundColor: COLORS.light.surface, borderRadius: 12, padding: 4, marginBottom: 20 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
    tabActive: { backgroundColor: COLORS.light.primary },
    tabText: { fontSize: 14, fontWeight: '600', color: COLORS.light.textSecondary },
    tabTextActive: { color: '#fff' },
    addTaskContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    addTaskInput: {
        flex: 1,
        backgroundColor: COLORS.light.surface,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        fontSize: 15,
        color: COLORS.light.text,
    },
    addTaskButton: {
        backgroundColor: COLORS.light.primary,
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tasksList: { gap: 12 },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.light.surface,
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    taskContent: { flex: 1 },
    taskText: { fontSize: 15, color: COLORS.light.text },
    taskCompleted: { textDecorationLine: 'line-through', color: COLORS.light.textMuted },
    taskMeta: { flexDirection: 'row', marginTop: 6, gap: 8 },
    priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    priorityText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
    deleteButton: { padding: 4 },
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyText: { fontSize: 14, color: COLORS.light.textSecondary },
    examsSection: { marginTop: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.light.text, marginBottom: 12 },
    examCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.light.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
    },
    examInfo: { flex: 1 },
    examSubject: { fontSize: 15, fontWeight: '600', color: COLORS.light.text },
    examDate: { fontSize: 12, color: COLORS.light.textSecondary, marginTop: 2 },
    examCountdown: { alignItems: 'center' },
    countdownNumber: { fontSize: 20, fontWeight: '700', color: COLORS.light.primary },
    countdownLabel: { fontSize: 10, color: COLORS.light.textSecondary },
});
