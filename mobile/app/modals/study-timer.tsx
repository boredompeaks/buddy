// Study Timer Modal - Pomodoro-style focus timer with stats tracking
import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Vibration, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Play, Pause, RotateCcw, Coffee, BookOpen, CheckCircle2 } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useStudyStatsStore, useStreakStore } from '../../src/stores';
import { SUBJECTS } from '../../src/constants';

interface StudyTimerProps {
    visible: boolean;
    onClose: () => void;
    initialSubject?: string;
}

type TimerMode = 'focus' | 'break' | 'longBreak';

const TIMER_PRESETS = {
    focus: 25 * 60, // 25 minutes
    break: 5 * 60,  // 5 minutes
    longBreak: 15 * 60, // 15 minutes
};

export default function StudyTimerModal({ visible, onClose, initialSubject }: StudyTimerProps) {
    const colors = useThemeColors();
    const haptics = useHaptics();
    const recordStudyDay = useStreakStore(state => state.recordStudyDay);

    const [mode, setMode] = useState<TimerMode>('focus');
    const [subject, setSubject] = useState(initialSubject || 'General');
    const [timeLeft, setTimeLeft] = useState(TIMER_PRESETS.focus);
    const [isRunning, setIsRunning] = useState(false);
    const [sessionsCompleted, setSessionsCompleted] = useState(0);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const progress = useSharedValue(1);

    // Timer logic
    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    const newTime = prev - 1;
                    const total = TIMER_PRESETS[mode];
                    progress.value = withTiming(newTime / total, { duration: 1000 });
                    return newTime;
                });
            }, 1000);
        } else if (timeLeft === 0 && isRunning) {
            // Timer complete
            handleTimerComplete();
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning, timeLeft, mode]);

    // Track app state for background timer
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active' && startTimeRef.current && isRunning) {
                const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                const newTimeLeft = Math.max(0, TIMER_PRESETS[mode] - elapsed);
                setTimeLeft(newTimeLeft);
            }
        });
        return () => subscription.remove();
    }, [isRunning, mode]);

    const handleTimerComplete = useCallback(async () => {
        haptics.success();
        Vibration.vibrate([0, 500, 100, 500]);
        setIsRunning(false);

        if (mode === 'focus') {
            // Completed a focus session
            setSessionsCompleted(prev => prev + 1);
            await recordStudyDay();

            // Determine next break type
            if ((sessionsCompleted + 1) % 4 === 0) {
                setMode('longBreak');
                setTimeLeft(TIMER_PRESETS.longBreak);
            } else {
                setMode('break');
                setTimeLeft(TIMER_PRESETS.break);
            }
        } else {
            // Break complete, back to focus
            setMode('focus');
            setTimeLeft(TIMER_PRESETS.focus);
        }

        progress.value = 1;
    }, [mode, sessionsCompleted, haptics, recordStudyDay]);

    const toggleTimer = () => {
        if (isRunning) {
            haptics.light();
            setIsRunning(false);
        } else {
            haptics.medium();
            startTimeRef.current = Date.now() - ((TIMER_PRESETS[mode] - timeLeft) * 1000);
            setIsRunning(true);
        }
    };

    const resetTimer = () => {
        haptics.light();
        setIsRunning(false);
        setTimeLeft(TIMER_PRESETS[mode]);
        progress.value = 1;
    };

    const switchMode = (newMode: TimerMode) => {
        if (isRunning) return; // Don't switch while running
        haptics.selection();
        setMode(newMode);
        setTimeLeft(TIMER_PRESETS[newMode]);
        progress.value = 1;
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }));

    const modeConfig = {
        focus: { label: 'Focus', color: colors.primary, icon: BookOpen },
        break: { label: 'Break', color: colors.success, icon: Coffee },
        longBreak: { label: 'Long Break', color: colors.secondary, icon: Coffee },
    };

    const CurrentIcon = modeConfig[mode].icon;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Study Timer</Text>
                    <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surface }]}>
                        <X size={24} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Mode Selector */}
                <View style={[styles.modeSelector, { backgroundColor: colors.surface }]}>
                    {(['focus', 'break', 'longBreak'] as TimerMode[]).map(m => (
                        <TouchableOpacity
                            key={m}
                            style={[
                                styles.modeButton,
                                mode === m && { backgroundColor: modeConfig[m].color + '20' },
                            ]}
                            onPress={() => switchMode(m)}
                            disabled={isRunning}
                        >
                            <Text style={[
                                styles.modeText,
                                { color: mode === m ? modeConfig[m].color : colors.textSecondary },
                            ]}>
                                {modeConfig[m].label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Timer Display */}
                <View style={styles.timerContainer}>
                    <View style={[styles.timerCircle, { borderColor: modeConfig[mode].color + '30' }]}>
                        <CurrentIcon size={32} color={modeConfig[mode].color} style={{ marginBottom: 8 }} />
                        <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(timeLeft)}</Text>
                        <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>{modeConfig[mode].label}</Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                        <Animated.View style={[styles.progressFill, { backgroundColor: modeConfig[mode].color }, progressStyle]} />
                    </View>
                </View>

                {/* Subject Selector */}
                <View style={styles.subjectSection}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Studying</Text>
                    <View style={styles.subjectChips}>
                        {SUBJECTS.slice(0, 6).map(s => (
                            <TouchableOpacity
                                key={s}
                                style={[
                                    styles.subjectChip,
                                    { backgroundColor: subject === s ? colors.primary + '20' : colors.surface },
                                ]}
                                onPress={() => !isRunning && setSubject(s)}
                                disabled={isRunning}
                            >
                                <Text style={[
                                    styles.subjectChipText,
                                    { color: subject === s ? colors.primary : colors.textSecondary },
                                ]}>
                                    {s}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Controls */}
                <View style={styles.controls}>
                    <TouchableOpacity
                        style={[styles.controlButton, { backgroundColor: colors.surface }]}
                        onPress={resetTimer}
                    >
                        <RotateCcw size={24} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.playButton, { backgroundColor: modeConfig[mode].color }]}
                        onPress={toggleTimer}
                    >
                        {isRunning ? (
                            <Pause size={36} color="#fff" />
                        ) : (
                            <Play size={36} color="#fff" style={{ marginLeft: 4 }} />
                        )}
                    </TouchableOpacity>

                    <View style={[styles.sessionsCounter, { backgroundColor: colors.surface }]}>
                        <CheckCircle2 size={16} color={colors.success} />
                        <Text style={[styles.sessionsText, { color: colors.text }]}>{sessionsCompleted}</Text>
                    </View>
                </View>

                {/* Stats */}
                <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.statsTitle, { color: colors.text }]}>Today's Progress</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.primary }]}>{sessionsCompleted}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sessions</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.primary }]}>{sessionsCompleted * 25}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Minutes</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.primary }]}>{subject}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Subject</Text>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    title: { fontSize: 24, fontWeight: '700' },
    closeButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    modeSelector: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 16, padding: 4 },
    modeButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
    modeText: { fontSize: 14, fontWeight: '600' },
    timerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    timerCircle: { width: 240, height: 240, borderRadius: 120, borderWidth: 8, justifyContent: 'center', alignItems: 'center' },
    timerText: { fontSize: 56, fontWeight: '700', fontVariant: ['tabular-nums'] },
    timerLabel: { fontSize: 16, marginTop: 4 },
    progressBar: { width: '100%', height: 6, borderRadius: 3, marginTop: 32 },
    progressFill: { height: '100%', borderRadius: 3 },
    subjectSection: { paddingHorizontal: 20, marginBottom: 20 },
    sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
    subjectChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    subjectChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    subjectChipText: { fontSize: 13, fontWeight: '500' },
    controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingHorizontal: 20, marginBottom: 24 },
    controlButton: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    playButton: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    sessionsCounter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24 },
    sessionsText: { fontSize: 18, fontWeight: '700' },
    statsCard: { marginHorizontal: 20, marginBottom: 20, padding: 20, borderRadius: 20 },
    statsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: '700' },
    statLabel: { fontSize: 12, marginTop: 4 },
});
