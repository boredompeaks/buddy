// Exam Schedule Screen - Manage exams and view Today's Plan
import { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Calendar, Clock, ChevronRight, X, BookOpen, Target, Sparkles } from 'lucide-react-native';
import { useExamStore, useNotesStore } from '../../../src/stores';
import { COLORS } from '../../../src/constants';
import type { ExamSchedule, Chapter } from '../../../src/types';
import { format, differenceInDays, addDays } from 'date-fns';

export default function ExamScheduleScreen() {
    const exams = useExamStore(state => state.exams);
    const addExam = useExamStore(state => state.addExam);
    const notes = useNotesStore(state => state.notes);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newExam, setNewExam] = useState({ subjectName: '', examDate: addDays(new Date(), 30).getTime() });

    // Sort exams by date
    const sortedExams = useMemo(() => {
        return [...exams].sort((a, b) => a.examDate - b.examDate);
    }, [exams]);

    // Calculate Today's recommended study based on exams
    const todaysPlan = useMemo(() => {
        const now = Date.now();
        const upcomingExams = sortedExams.filter(e => e.examDate > now);

        // Priority based on days left and completion
        return upcomingExams.map(exam => {
            const daysLeft = differenceInDays(exam.examDate, now);
            const incompleteChapters = exam.chapters.filter(c => !c.completed);
            const priority = Math.max(1, 10 - Math.floor(daysLeft / 7)); // Higher priority for closer exams

            return {
                exam,
                daysLeft,
                priority,
                incompleteChapters: incompleteChapters.slice(0, 2), // Top 2 to study
                suggestedHours: Math.ceil(4 / Math.max(1, upcomingExams.length)), // Distribute 4 hours
            };
        }).sort((a, b) => b.priority - a.priority).slice(0, 3); // Top 3 recommendations
    }, [sortedExams]);

    const handleAddExam = async () => {
        if (!newExam.subjectName.trim()) return;

        await addExam({
            subjectName: newExam.subjectName,
            examDate: newExam.examDate,
            chapters: [],
        });

        setNewExam({ subjectName: '', examDate: addDays(new Date(), 30).getTime() });
        setShowAddModal(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Exam Schedule</Text>
                        <Text style={styles.subtitle}>{exams.length} exam{exams.length !== 1 ? 's' : ''} scheduled</Text>
                    </View>
                    <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
                        <Plus size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Today's Study Plan */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Sparkles size={20} color={COLORS.light.primary} />
                        <Text style={styles.sectionTitle}>Today's Plan</Text>
                    </View>

                    {todaysPlan.length === 0 ? (
                        <View style={styles.emptyPlan}>
                            <Target size={40} color={COLORS.light.textMuted} />
                            <Text style={styles.emptyText}>No exams scheduled</Text>
                            <Text style={styles.emptySubtext}>Add an exam to get personalized study plans</Text>
                        </View>
                    ) : (
                        todaysPlan.map(({ exam, daysLeft, suggestedHours, incompleteChapters }) => (
                            <View key={exam.id} style={styles.planCard}>
                                <View style={styles.planHeader}>
                                    <View style={styles.planSubject}>
                                        <BookOpen size={18} color={COLORS.light.primary} />
                                        <Text style={styles.planSubjectText}>{exam.subjectName}</Text>
                                    </View>
                                    <View style={[styles.daysChip, daysLeft < 7 && styles.daysChipUrgent]}>
                                        <Text style={[styles.daysText, daysLeft < 7 && styles.daysTextUrgent]}>
                                            {daysLeft}d left
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.planDetails}>
                                    <View style={styles.planDetail}>
                                        <Clock size={14} color={COLORS.light.textSecondary} />
                                        <Text style={styles.planDetailText}>{suggestedHours}h suggested</Text>
                                    </View>
                                </View>

                                {incompleteChapters.length > 0 && (
                                    <View style={styles.chaptersToStudy}>
                                        <Text style={styles.chaptersLabel}>Focus on:</Text>
                                        {incompleteChapters.map(chapter => (
                                            <Text key={chapter.id} style={styles.chapterItem}>• {chapter.name}</Text>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))
                    )}
                </View>

                {/* All Exams */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>All Exams</Text>

                    {sortedExams.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Calendar size={48} color={COLORS.light.textMuted} />
                            <Text style={styles.emptyText}>No exams yet</Text>
                            <TouchableOpacity style={styles.addFirstButton} onPress={() => setShowAddModal(true)}>
                                <Text style={styles.addFirstText}>Add Your First Exam</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        sortedExams.map(exam => {
                            const daysLeft = differenceInDays(exam.examDate, Date.now());
                            const completedChapters = exam.chapters.filter(c => c.completed).length;
                            const progress = exam.chapters.length > 0
                                ? Math.round((completedChapters / exam.chapters.length) * 100) : 0;

                            return (
                                <TouchableOpacity key={exam.id} style={styles.examCard}>
                                    <View style={styles.examMain}>
                                        <Text style={styles.examSubject}>{exam.subjectName}</Text>
                                        <Text style={styles.examDate}>{format(exam.examDate, 'MMMM d, yyyy')}</Text>
                                        <View style={styles.examMeta}>
                                            <Text style={styles.examChapters}>
                                                {completedChapters}/{exam.chapters.length} chapters done
                                            </Text>
                                            {exam.chapters.length > 0 && (
                                                <View style={styles.progressBar}>
                                                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    <View style={styles.examRight}>
                                        <View style={[styles.countdown, daysLeft < 7 && styles.countdownUrgent]}>
                                            <Text style={[styles.countdownNumber, daysLeft < 7 && styles.countdownUrgentText]}>
                                                {daysLeft}
                                            </Text>
                                            <Text style={[styles.countdownLabel, daysLeft < 7 && styles.countdownUrgentText]}>
                                                days
                                            </Text>
                                        </View>
                                        <ChevronRight size={20} color={COLORS.light.textMuted} />
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            {/* Add Exam Modal */}
            <Modal visible={showAddModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Exam</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                <X size={24} color={COLORS.light.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Subject</Text>
                        <TextInput
                            style={styles.input}
                            value={newExam.subjectName}
                            onChangeText={(v) => setNewExam(prev => ({ ...prev, subjectName: v }))}
                            placeholder="e.g., Physics, Mathematics"
                            placeholderTextColor={COLORS.light.textMuted}
                        />

                        <Text style={styles.inputLabel}>Exam Date</Text>
                        <View style={styles.dateOptions}>
                            {[7, 14, 30, 60].map(days => (
                                <TouchableOpacity
                                    key={days}
                                    style={[
                                        styles.dateOption,
                                        differenceInDays(newExam.examDate, Date.now()) === days && styles.dateOptionActive
                                    ]}
                                    onPress={() => setNewExam(prev => ({ ...prev, examDate: addDays(new Date(), days).getTime() }))}
                                >
                                    <Text style={[
                                        styles.dateOptionText,
                                        differenceInDays(newExam.examDate, Date.now()) === days && styles.dateOptionTextActive
                                    ]}>
                                        {days}d
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.submitButton} onPress={handleAddExam}>
                            <Text style={styles.submitText}>Add Exam</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.light.background },
    content: { padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontWeight: '800', color: COLORS.light.text },
    subtitle: { fontSize: 14, color: COLORS.light.textSecondary, marginTop: 4 },
    addButton: {
        backgroundColor: COLORS.light.primary,
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    section: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.light.text },
    planCard: {
        backgroundColor: COLORS.light.surface,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.light.primary,
    },
    planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    planSubject: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    planSubjectText: { fontSize: 16, fontWeight: '600', color: COLORS.light.text },
    daysChip: {
        backgroundColor: COLORS.light.primary + '20',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    daysChipUrgent: { backgroundColor: COLORS.light.error + '20' },
    daysText: { fontSize: 12, fontWeight: '600', color: COLORS.light.primary },
    daysTextUrgent: { color: COLORS.light.error },
    planDetails: { flexDirection: 'row', gap: 16, marginTop: 12 },
    planDetail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    planDetailText: { fontSize: 13, color: COLORS.light.textSecondary },
    chaptersToStudy: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.light.border },
    chaptersLabel: { fontSize: 12, fontWeight: '600', color: COLORS.light.textSecondary, marginBottom: 4 },
    chapterItem: { fontSize: 14, color: COLORS.light.text, marginTop: 2 },
    emptyPlan: { alignItems: 'center', padding: 32, gap: 8 },
    emptyState: { alignItems: 'center', padding: 40, gap: 12 },
    emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.light.text },
    emptySubtext: { fontSize: 13, color: COLORS.light.textSecondary, textAlign: 'center' },
    addFirstButton: {
        backgroundColor: COLORS.light.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 8,
    },
    addFirstText: { color: '#fff', fontWeight: '600' },
    examCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.light.surface,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    examMain: { flex: 1 },
    examSubject: { fontSize: 17, fontWeight: '600', color: COLORS.light.text },
    examDate: { fontSize: 13, color: COLORS.light.textSecondary, marginTop: 4 },
    examMeta: { marginTop: 8 },
    examChapters: { fontSize: 12, color: COLORS.light.textMuted },
    progressBar: { height: 4, backgroundColor: COLORS.light.border, borderRadius: 2, marginTop: 6 },
    progressFill: { height: '100%', backgroundColor: COLORS.light.success, borderRadius: 2 },
    examRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    countdown: { alignItems: 'center', backgroundColor: COLORS.light.primary + '15', padding: 12, borderRadius: 12 },
    countdownUrgent: { backgroundColor: COLORS.light.error + '15' },
    countdownNumber: { fontSize: 22, fontWeight: '700', color: COLORS.light.primary },
    countdownUrgentText: { color: COLORS.light.error },
    countdownLabel: { fontSize: 10, color: COLORS.light.primary },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.light.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.light.text },
    inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.light.textSecondary, marginBottom: 8 },
    input: {
        backgroundColor: COLORS.light.surfaceVariant,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        fontSize: 16,
        color: COLORS.light.text,
        marginBottom: 20,
    },
    dateOptions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    dateOption: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: COLORS.light.surfaceVariant,
        borderRadius: 12,
    },
    dateOptionActive: { backgroundColor: COLORS.light.primary },
    dateOptionText: { fontSize: 14, fontWeight: '600', color: COLORS.light.textSecondary },
    dateOptionTextActive: { color: '#fff' },
    submitButton: {
        backgroundColor: COLORS.light.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
