import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Trash2, Database } from 'lucide-react-native';
import GlassLayout from '../../src/components/GlassLayout';
import GlassCard from '../../src/components/GlassCard';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AccountScreen() {
    const router = useRouter();
    const colors = useThemeColors();

    const handleClearData = () => {
        Alert.alert(
            'Clear Everything?',
            'This will permanently delete all notes, exams, and progress. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await AsyncStorage.clear();
                            Alert.alert('Reset Complete', 'Please restart the app.');
                        } catch (e) {
                            Alert.alert('Error', 'Failed to clear data.');
                        }
                    }
                }
            ]
        );
    };

    return (
        <GlassLayout>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Account & Data</Text>
                </View>

                <ScrollView contentContainerStyle={styles.content}>

                    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Storage</Text>
                    <TouchableOpacity activeOpacity={0.8} onPress={() => { }}>
                        <GlassCard style={styles.card}>
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
                                <Database size={24} color={colors.primary} />
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={[styles.cardTitle, { color: colors.text }]}>Local Data</Text>
                                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                                    All content is stored on this device.
                                </Text>
                            </View>
                        </GlassCard>
                    </TouchableOpacity>

                    <Text style={[styles.sectionHeader, { color: colors.textSecondary, marginTop: 24 }]}>Danger Zone</Text>
                    <TouchableOpacity activeOpacity={0.8} onPress={handleClearData}>
                        <GlassCard style={[styles.card, { borderColor: colors.error + '50' }]}>
                            <View style={[styles.iconBox, { backgroundColor: colors.error + '20' }]}>
                                <Trash2 size={24} color={colors.error} />
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={[styles.cardTitle, { color: colors.error }]}>Reset App</Text>
                                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                                    Delete all data and reset settings.
                                </Text>
                            </View>
                        </GlassCard>
                    </TouchableOpacity>

                </ScrollView>
            </SafeAreaView>
        </GlassLayout>
    );
}



const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    content: { padding: 20 },
    sectionHeader: { fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    card: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16, marginBottom: 12 },
    iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    cardDesc: { fontSize: 13 },
});
