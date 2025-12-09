import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock, FileText, Plus, ChevronRight, Trophy } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import GlassLayout from '../../../../src/components/GlassLayout';
import GlassCard from '../../../../src/components/GlassCard';
import { useThemeColors } from '../../../../src/hooks/useThemeColors';

// Dummy History Data
const EXAM_HISTORY = [
    { id: '1', subject: 'Mathematics', date: '2 days ago', score: '85/100', duration: '3h' },
    { id: '2', subject: 'Physics', date: '1 week ago', score: '72/100', duration: '2h' },
];

export default function ExamHubScreen() {
    const router = useRouter();
    const colors = useThemeColors();

    const startExam = (subject: string, duration: number) => {
        router.push({
            pathname: '/study/exam/review',
            params: { subject, duration }
        });
    };

    return (
        <GlassLayout>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Exam Center</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Hero: Start New Exam */}
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                    <GlassCard style={[styles.heroCard, { backgroundColor: colors.primary + '20' }]} intensity={30}>
                        <View style={styles.heroContent}>
                            <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
                                <Trophy size={32} color="#fff" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.heroTitle, { color: colors.text }]}>Full Mock Exam</Text>
                                <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                                    Simulate real exam conditions. Strict 3-hour timer.
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.startBtn, { backgroundColor: colors.primary }]}
                            onPress={() => startExam('Mathematics', 180)}
                        >
                            <Text style={styles.startBtnText}>Start Now</Text>
                            <ChevronRight size={20} color="#fff" />
                        </TouchableOpacity>
                    </GlassCard>
                </Animated.View>

                {/* Quick Actions */}
                <View style={styles.actionsGrid}>
                    <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/study/paper-generator')}>
                        <GlassCard style={styles.actionCard}>
                            <Plus size={24} color={colors.primary} />
                            <Text style={[styles.actionText, { color: colors.text }]}>Generate Paper</Text>
                        </GlassCard>
                    </TouchableOpacity>

                    {/* Add more actions if needed */}
                </View>

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Attempts</Text>

                {EXAM_HISTORY.map((item, index) => (
                    <Animated.View key={item.id} entering={FadeInDown.delay(200 + index * 100)}>
                        <GlassCard style={styles.historyCard}>
                            <View style={styles.historyLeft}>
                                <FileText size={20} color={colors.textSecondary} />
                                <View>
                                    <Text style={[styles.historySubject, { color: colors.text }]}>{item.subject}</Text>
                                    <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{item.date} • {item.duration}</Text>
                                </View>
                            </View>
                            <View style={[styles.scoreBadge, { backgroundColor: colors.success + '20' }]}>
                                <Text style={[styles.scoreText, { color: colors.success }]}>{item.score}</Text>
                            </View>
                        </GlassCard>
                    </Animated.View>
                ))}

            </ScrollView>
        </GlassLayout>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
    backButton: { padding: 8 },
    title: { fontSize: 24, fontWeight: '700' },
    content: { padding: 20 },

    heroCard: { padding: 24, borderRadius: 24, marginBottom: 30 },
    heroContent: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    iconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    heroTitle: { fontSize: 20, fontWeight: '700', marginTop: 4 },
    heroSub: { fontSize: 14, lineHeight: 20, marginTop: 4 },
    startBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 16, gap: 8 },
    startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    actionsGrid: { flexDirection: 'row', gap: 12, marginBottom: 30 },
    actionItem: { flex: 1 },
    actionCard: { padding: 16, alignItems: 'center', gap: 8, height: 100, justifyContent: 'center' },
    actionText: { fontWeight: '600' },

    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
    historyCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, marginBottom: 12 },
    historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    historySubject: { fontWeight: '600', fontSize: 16 },
    historyDate: { fontSize: 12 },
    scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    scoreText: { fontWeight: '700', fontSize: 14 },
});
