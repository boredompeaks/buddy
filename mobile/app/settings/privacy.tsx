import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield } from 'lucide-react-native';
import GlassLayout from '../../src/components/GlassLayout';
import { useThemeColors } from '../../src/hooks/useThemeColors';

export default function PrivacyScreen() {
    const router = useRouter();
    const colors = useThemeColors();

    return (
        <GlassLayout>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy & Terms</Text>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.section}>
                        <Shield size={48} color={colors.primary} style={styles.icon} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Privacy Matters</Text>
                        <Text style={[styles.text, { color: colors.textSecondary }]}>
                            MindVault stores your notes, exams, and progress locally on your device.
                            We do not upload your personal data to any central server.
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.subTitle, { color: colors.text }]}>AI Processing</Text>
                        <Text style={[styles.text, { color: colors.textSecondary }]}>
                            When you use AI features (Summary, Quiz Generation), data is sent to the AI provider (Groq/Gemini) for processing.
                            Use your own API keys for maximum privacy control.
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={[styles.subTitle, { color: colors.text }]}>Data Deletion</Text>
                        <Text style={[styles.text, { color: colors.textSecondary }]}>
                            You can wipe all app data from the "Account & Data" settings page at any time.
                        </Text>
                    </View>
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
    section: { marginBottom: 32 },
    icon: { marginBottom: 16 },
    sectionTitle: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
    subTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
    text: { fontSize: 16, lineHeight: 24 },
});
