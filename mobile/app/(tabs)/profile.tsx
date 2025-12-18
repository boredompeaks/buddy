// Profile Tab Screen
import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Moon, Bell, FileJson, Key, Info, ChevronRight, Flame, Shield, Lock } from 'lucide-react-native';
import { useSettingsStore, useStreakStore, useNotesStore } from '../../src/stores';
import { useThemeColors } from '../../hooks/useThemeColors';
import APIKeysModal from '../modals/api-keys';
import * as Clipboard from 'expo-clipboard';

export default function ProfileScreen() {
    const router = useRouter();
    const colors = useThemeColors();
    const settings = useSettingsStore(state => state.settings);
    const updateSettings = useSettingsStore(state => state.updateSettings);
    const streak = useStreakStore(state => state.streak);
    const notes = useNotesStore(state => state.notes);

    // Modal states
    const [apiKeysVisible, setApiKeysVisible] = useState(false);

    const menuItems = [
        { id: 'theme', icon: Moon, title: 'Dark Mode', type: 'toggle', value: settings.theme === 'dark' },
        { id: 'notifications', icon: Bell, title: 'Notifications', type: 'toggle', value: settings.notificationsEnabled },
        { id: 'apiKeys', icon: Key, title: 'API Keys', type: 'link' },
        { id: 'account', icon: Shield, title: 'Account & Data', type: 'link' },
        { id: 'privacy', icon: Lock, title: 'Privacy & Terms', type: 'link' },
        { id: 'export', icon: FileJson, title: 'Export Data', type: 'link' },
        { id: 'about', icon: Info, title: 'About MindVault', type: 'link' },
    ];

    const handleToggle = (id: string, value: boolean) => {
        if (id === 'theme') {
            updateSettings({ theme: value ? 'dark' : 'light' });
        } else if (id === 'notifications') {
            updateSettings({ notificationsEnabled: value });
        }
    };

    const handleMenuPress = useCallback(async (id: string) => {
        switch (id) {
            case 'apiKeys':
                setApiKeysVisible(true);
                break;
            case 'account':
                router.push('/settings/account' as any);
                break;
            case 'privacy':
                router.push('/settings/privacy' as any);
                break;
            case 'export':
                // Export notes as JSON to clipboard
                try {
                    const data = JSON.stringify({ notes, exportedAt: Date.now() }, null, 2);
                    await Clipboard.setStringAsync(data);
                    Alert.alert('Exported!', `${notes.length} notes copied to clipboard as JSON.`);
                } catch (error) {
                    Alert.alert('Export Failed', 'Could not export data.');
                }
                break;
            case 'about':
                Alert.alert(
                    'MindVault',
                    'Version 1.0.0\n\nAI-powered study assistant for focused learning.\n\n© 2024 MindVault',
                    [{ text: 'OK' }]
                );
                break;
        }
    }, [notes]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar barStyle={colors.text === '#1e293b' ? 'dark-content' : 'light-content'} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
                </View>

                {/* User Card */}
                <View style={[styles.userCard, { backgroundColor: colors.surface }]}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                        <User size={32} color={colors.primary} />
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: colors.text }]}>Student</Text>
                        <Text style={[styles.userSubtitle, { color: colors.textSecondary }]}>{notes.length} notes created</Text>
                    </View>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                        <Flame size={24} color="#f59e0b" />
                        <Text style={[styles.statValue, { color: colors.text }]}>{streak.currentStreak}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Day Streak</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                        <Flame size={24} color={colors.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{streak.longestStreak}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Best Streak</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.statValue, { color: colors.text }]}>{streak.studyDays.length}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Study Days</Text>
                    </View>
                </View>

                {/* Menu */}
                <View style={styles.menuSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Settings</Text>
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.menuItem, { backgroundColor: colors.surface }]}
                                onPress={() => item.type === 'link' && handleMenuPress(item.id)}
                                disabled={item.type === 'toggle'}
                            >
                                <View style={[styles.menuIcon, { backgroundColor: colors.surfaceVariant }]}>
                                    <Icon size={20} color={colors.textSecondary} />
                                </View>
                                <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
                                {item.type === 'toggle' ? (
                                    <Switch
                                        value={item.value}
                                        onValueChange={(v) => handleToggle(item.id, v)}
                                        trackColor={{ false: colors.border, true: colors.primary + '50' }}
                                        thumbColor={item.value ? colors.primary : colors.surface}
                                    />
                                ) : (
                                    <ChevronRight size={20} color={colors.textMuted} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Version */}
                <Text style={[styles.version, { color: colors.textMuted }]}>MindVault v1.0.0</Text>
            </ScrollView>

            {/* API Keys Modal */}
            <APIKeysModal
                visible={apiKeysVisible}
                onClose={() => setApiKeysVisible(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20 },
    header: { marginBottom: 20 },
    title: { fontSize: 28, fontWeight: '800' },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userInfo: { flex: 1 },
    userName: { fontSize: 20, fontWeight: '700' },
    userSubtitle: { fontSize: 14, marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statValue: { fontSize: 22, fontWeight: '700' },
    statLabel: { fontSize: 11 },
    menuSection: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuTitle: { flex: 1, fontSize: 16 },
    version: { textAlign: 'center', fontSize: 12, marginTop: 20 },
});