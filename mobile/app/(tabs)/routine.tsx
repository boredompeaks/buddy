// Routine Tab Screen
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, CheckCircle2, Circle, Trash2, Calendar, Target, Flame, Camera, X, Clock, ChevronRight } from 'lucide-react-native';
import { useTasksStore, useExamStore, useStreakStore } from '../../src/stores';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { format, differenceInDays } from 'date-fns';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { parseExamSchedule } from '../../src/services/ai';

const PRIORITY_COLORS: Record<string, string> = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#ef4444',
};

export default function RoutineScreen() {
    const router = useRouter();
    const colors = useThemeColors();
    const [newTaskText, setNewTaskText] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    const tasks = useTasksStore(state => state.tasks);
    const activeCategory = useTasksStore(state => state.activeCategory);
    const setActiveCategory = useTasksStore(state => state.setActiveCategory);
    const addTask = useTasksStore(state => state.addTask);
    const toggleTask = useTasksStore(state => state.toggleTask);
    const deleteTask = useTasksStore(state => state.deleteTask);

    const exams = useExamStore(state => state.exams);
    const addExam = useExamStore(state => state.addExam);

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
        try {
            await addTask({ text: newTaskText.trim() });
            setNewTaskText('');
        } catch (error) {
            console.error("Failed to add task:", error);
        }
    };

    const handleScanTimetable = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permission needed', 'Please allow access to photos to scan your timetable.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
                setIsScanning(true);
                const timetable = await parseExamSchedule(`data:image/jpeg;base64,${result.assets[0].base64}`);

                // Add exams
                let addedCount = 0;
                for (const exam of timetable) {
                    await addExam({
                        subjectName: exam.subject,
                        examDate: exam.date,
                    });
                    addedCount++;
                }

                Alert.alert('Success', `Added ${addedCount} exams from your timetable!`);
            }
        } catch (error) {
            console.error('Scan error:', error);
            Alert.alert('Scan Failed', 'Could not parse timetable. Please try again or add manually.');
        } finally {
            setIsScanning(false);
        }
    };

    const categories = ['daily', 'weekly', 'exam'] as const;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar barStyle={colors.text === '#1e293b' ? 'dark-content' : 'light-content'} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.title, { color: colors.text }]}>Routine</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Stay disciplined</Text>
                    </View>
                    <View style={[styles.streakBadge, { backgroundColor: colors.surface }]}>
                        <Flame size={20} color={streak.currentStreak > 0 ? '#f59e0b' : colors.textMuted} />
                        <Text style={[styles.streakText, { color: colors.text }]}>{streak.currentStreak} day streak</Text>
                    </View>
                </View>

                {/* Progress Ring */}
                <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
                    <View style={[styles.progressRing, { borderColor: colors.primary }]}>
                        <Text style={[styles.progressValue, { color: colors.primary }]}>{progress}%</Text>
                    </View>
                    <View style={styles.progressInfo}>
                        <Text style={[styles.progressTitle, { color: colors.text }]}>{activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Progress</Text>
                        <Text style={[styles.progressSubtitle, { color: colors.textSecondary }]}>{completedCount} of {filteredTasks.length} completed</Text>
                    </View>
                </View>

                {/* Daily Planner Card */}
                <TouchableOpacity
                    style={[styles.plannerCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}
                    onPress={() => router.push('/routine/daily-planner')}
                >
                    <View style={[styles.plannerIcon, { backgroundColor: colors.primary }]}>
                        <Clock size={24} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.plannerTitle, { color: colors.text }]}>Daily Planner</Text>
                        <Text style={[styles.plannerSub, { color: colors.textSecondary }]}>AI-generated study schedule</Text>
                    </View>
                    <ChevronRight size={20} color={colors.primary} />
                </TouchableOpacity>

                {/* Category Tabs */}
                <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.tab, activeCategory === cat && { backgroundColor: colors.primary }]}
                            onPress={() => setActiveCategory(cat)}
                        >
                            <Text style={[
                                styles.tabText,
                                { color: activeCategory === cat ? '#fff' : colors.textSecondary }
                            ]}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Add Task */}
                <View style={styles.addTaskContainer}>
                    <TextInput
                        style={[styles.addTaskInput, { backgroundColor: colors.surface, color: colors.text }]}
                        placeholder={`Add ${activeCategory} task...`}
                        placeholderTextColor={colors.textMuted}
                        value={newTaskText}
                        onChangeText={setNewTaskText}
                        onSubmitEditing={handleAddTask}
                    />
                    <TouchableOpacity style={[styles.addTaskButton, { backgroundColor: colors.primary }]} onPress={handleAddTask}>
                        <Plus size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Tasks List */}
                <View style={styles.tasksList}>
                    {filteredTasks.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Target size={40} color={colors.textMuted} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No {activeCategory} tasks yet</Text>
                        </View>
                    ) : (
                        filteredTasks.map(task => (
                            <View key={task.id} style={[styles.taskItem, { backgroundColor: colors.surface }]}>
                                <TouchableOpacity onPress={() => toggleTask(task.id)}>
                                    {task.completed ? (
                                        <CheckCircle2 size={24} color={colors.success} />
                                    ) : (
                                        <Circle size={24} color={colors.textMuted} />
                                    )}
                                </TouchableOpacity>
                                <View style={styles.taskContent}>
                                    <Text style={[
                                        styles.taskText,
                                        { color: colors.text },
                                        task.completed && { textDecorationLine: 'line-through', color: colors.textMuted }
                                    ]}>
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
                                    <Trash2 size={20} color={colors.textMuted} />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>

                {/* Upcoming Exams */}
                <View style={styles.examsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Exam Schedule</Text>
                        <TouchableOpacity
                            style={[styles.scanButton, { backgroundColor: colors.secondary + '20' }]}
                            onPress={handleScanTimetable}
                            disabled={isScanning}
                        >
                            {isScanning ? (
                                <ActivityIndicator size="small" color={colors.secondary} />
                            ) : (
                                <>
                                    <Camera size={16} color={colors.secondary} />
                                    <Text style={[styles.scanButtonText, { color: colors.secondary }]}>Scan Timetable</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {exams.length === 0 ? (
                        <View style={[styles.emptyState, { marginTop: 0, paddingVertical: 20 }]}>
                            <Calendar size={32} color={colors.textMuted} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No exams scheduled</Text>
                        </View>
                    ) : (
                        exams.slice(0, 5).map(exam => (
                            <View key={exam.id} style={[styles.examCard, { backgroundColor: colors.surface }]}>
                                <Calendar size={20} color={colors.primary} />
                                <View style={styles.examInfo}>
                                    <Text style={[styles.examSubject, { color: colors.text }]}>{exam.subjectName}</Text>
                                    <Text style={[styles.examDate, { color: colors.textSecondary }]}>{format(exam.examDate, 'MMMM d, yyyy')}</Text>
                                </View>
                                <View style={styles.examCountdown}>
                                    <Text style={[styles.countdownNumber, { color: colors.primary }]}>
                                        {differenceInDays(exam.examDate, Date.now())}
                                    </Text>
                                    <Text style={[styles.countdownLabel, { color: colors.textSecondary }]}>days</Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontWeight: '800' },
    subtitle: { fontSize: 15 },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    streakText: { fontSize: 13, fontWeight: '600' },
    progressCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
        marginBottom: 24,
        gap: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    progressRing: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressValue: { fontSize: 18, fontWeight: '700' },
    progressInfo: { flex: 1 },
    progressTitle: { fontSize: 16, fontWeight: '700' },
    progressSubtitle: { fontSize: 13, marginTop: 4 },
    tabs: { flexDirection: 'row', borderRadius: 16, padding: 6, marginBottom: 24 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
    tabText: { fontSize: 14, fontWeight: '600' },
    addTaskContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    addTaskInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        fontSize: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    addTaskButton: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    tasksList: { gap: 12 },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    taskContent: { flex: 1 },
    taskText: { fontSize: 16, fontWeight: '500' },
    taskMeta: { flexDirection: 'row', marginTop: 6, gap: 8 },
    priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    priorityText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
    deleteButton: { padding: 8 },
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    emptyText: { fontSize: 16 },
    examsSection: { marginTop: 32 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 20, fontWeight: '700' },
    scanButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
    scanButtonText: { fontSize: 12, fontWeight: '600' },
    examCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    examInfo: { flex: 1 },
    examSubject: { fontSize: 16, fontWeight: '600' },
    examDate: { fontSize: 13, marginTop: 2 },
    examCountdown: { alignItems: 'center' },
    countdownNumber: { fontSize: 20, fontWeight: '700' },
    countdownLabel: { fontSize: 10 },

    // Daily Planner Card
    plannerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
        gap: 14,
        borderWidth: 1,
    },
    plannerIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    plannerTitle: { fontSize: 16, fontWeight: '700' },
    plannerSub: { fontSize: 13, marginTop: 2 },
});