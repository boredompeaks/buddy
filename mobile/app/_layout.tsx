// Root Layout - App Entry Point
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from '../src/services/database';
import { useNotesStore, useTasksStore, useExamStore, useSettingsStore, useStreakStore, useStudyStatsStore } from '../src/stores';
import { useFlashcardStore } from '../src/stores/flashcards';
import { COLORS } from '../src/constants';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { OfflineBanner } from '../src/components/OfflineBanner';
import { useNetworkStatus } from '../src/hooks/useNetworkStatus';
import { runMigrations } from '../src/utils/migrations';

export default function RootLayout() {
    const [isReady, setIsReady] = useState(false);
    const networkStatus = useNetworkStatus();
    const loadNotes = useNotesStore(state => state.loadNotes);
    const loadTasks = useTasksStore(state => state.loadTasks);
    const loadExams = useExamStore(state => state.loadExams);
    const loadSettings = useSettingsStore(state => state.loadSettings);
    const loadStreak = useStreakStore(state => state.loadStreak);
    const loadStudyStats = useStudyStatsStore(state => state.loadStats);
    const loadFlashcardDecks = useFlashcardStore(state => state.loadDecks);
    const theme = useSettingsStore(state => state.settings.theme);

    useEffect(() => {
        async function init() {
            try {
                // Run migrations before loading data
                await runMigrations();

                // Initialize database
                await initDatabase();

                await Promise.all([
                    loadNotes(),
                    loadTasks(),
                    loadExams(),
                    loadSettings(),
                    loadStreak(),
                    loadStudyStats(),
                    loadFlashcardDecks(),
                ]);

                setIsReady(true);
            } catch (error) {
                console.error('Failed to initialize app:', error);
                setIsReady(true); // Still show app even on error
            }
        }

        init();
    }, []);

    if (!isReady) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.light.primary} />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <ErrorBoundary>
                    <StatusBar style="auto" />
                    <OfflineBanner isVisible={networkStatus.isConnected === false} />
                    <Stack
                        screenOptions={{
                            headerShown: false,
                            animation: 'slide_from_right',
                            contentStyle: { backgroundColor: '#0f172a' }, // Deep Midnight Blue
                        }}
                    >
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen
                            name="note/[id]"
                            options={{
                                presentation: 'card',
                                animation: 'slide_from_right',
                            }}
                        />
                        <Stack.Screen
                            name="modals/ai-chat"
                            options={{
                                presentation: 'modal',
                                animation: 'slide_from_bottom',
                            }}
                        />
                    </Stack>
                </ErrorBoundary>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.light.background,
    },
});
