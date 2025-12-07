// Profile Tab Screen
import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Moon, Bell, FileJson, Key, Info, ChevronRight, Flame } from 'lucide-react-native';
import { useSettingsStore, useStreakStore, useNotesStore } from '../../src/stores';
import { COLORS } from '../../src/constants';
import APIKeysModal from '../modals/api-keys';
import * as Clipboard from 'expo-clipboard';

export default function ProfileScreen() {
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
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Profile</Text>
                </View>

                {/* User Card */}
                <View style={styles.userCard}>
                    <View style={styles.avatar}>
                        <User size={32} color={COLORS.light.primary} />
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>Student</Text>
                        <Text style={styles.userSubtitle}>{notes.length} notes created</Text>
                    </View>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Flame size={24} color="#f59e0b" />
                        <Text style={styles.statValue}>{streak.currentStreak}</Text>
                        <Text style={styles.statLabel}>Day Streak</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Flame size={24} color={COLORS.light.primary} />
                        <Text style={styles.statValue}>{streak.longestStreak}</Text>
                        <Text style={styles.statLabel}>Best Streak</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{streak.studyDays.length}</Text>
                        <Text style={styles.statLabel}>Study Days</Text>
                    </View>
                </View>

                {/* Menu */}
                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Settings</Text>
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.menuItem}
                                onPress={() => item.type === 'link' && handleMenuPress(item.id)}
                                disabled={item.type === 'toggle'}
                            >
                                <View style={styles.menuIcon}>
                                    <Icon size={20} color={COLORS.light.textSecondary} />
                                </View>
                                <Text style={styles.menuTitle}>{item.title}</Text>
                                {item.type === 'toggle' ? (
                                    <Switch
                                        value={item.value}
                                        onValueChange={(v) => handleToggle(item.id, v)}
                                        trackColor={{ false: COLORS.light.border, true: COLORS.light.primary + '50' }}
                                        thumbColor={item.value ? COLORS.light.primary : COLORS.light.surface}
                                    />
                                ) : (
                                    <ChevronRight size={20} color={COLORS.light.textMuted} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Version */}
                <Text style={styles.version}>MindVault v1.0.0</Text>
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
    container: { flex: 1, backgroundColor: COLORS.light.background },
    content: { padding: 20 },
    header: { marginBottom: 20 },
    title: { fontSize: 28, fontWeight: '800', color: COLORS.light.text },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.light.surface,
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
        gap: 16,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.light.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userInfo: { flex: 1 },
    userName: { fontSize: 20, fontWeight: '700', color: COLORS.light.text },
    userSubtitle: { fontSize: 14, color: COLORS.light.textSecondary, marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.light.surface,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        gap: 4,
    },
    statValue: { fontSize: 22, fontWeight: '700', color: COLORS.light.text },
    statLabel: { fontSize: 11, color: COLORS.light.textSecondary },
    menuSection: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.light.textSecondary, marginBottom: 12 },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.light.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: COLORS.light.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuTitle: { flex: 1, fontSize: 16, color: COLORS.light.text },
    version: { textAlign: 'center', fontSize: 12, color: COLORS.light.textMuted, marginTop: 20 },
});
