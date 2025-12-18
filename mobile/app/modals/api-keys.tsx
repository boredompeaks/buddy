// API Keys Settings Modal - Configure Groq and Gemini API keys
import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, Alert, ActivityIndicator, Linking } from 'react-native';
import { X, Key, Eye, EyeOff, Check, ExternalLink, AlertTriangle, ArrowLeft } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { COLORS, STORAGE_KEYS } from '../../src/constants';
import { useThemeColors } from '../../src/hooks/useThemeColors';

interface APIKeysModalProps {
    visible?: boolean;
    onClose?: () => void;
}

export default function APIKeysModal({ visible = true, onClose }: APIKeysModalProps) {
    const router = useRouter();
    const colors = useThemeColors();
    const [groqKey, setGroqKey] = useState('');
    const [geminiKey, setGeminiKey] = useState('');
    const [showGroqKey, setShowGroqKey] = useState(false);
    const [showGeminiKey, setShowGeminiKey] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Close handler that works with both modal and page mode
    const doClose = useCallback(() => {
        if (onClose) {
            onClose();
        } else {
            router.back();
        }
    }, [onClose, router]);

    // Load existing keys on mount
    useEffect(() => {
        if (visible) {
            loadKeys();
        }
    }, [visible]);

    const loadKeys = async () => {
        setIsLoading(true);
        try {
            const [storedGroq, storedGemini] = await Promise.all([
                SecureStore.getItemAsync(STORAGE_KEYS.GROQ_API_KEY),
                SecureStore.getItemAsync(STORAGE_KEYS.GEMINI_API_KEY),
            ]);
            setGroqKey(storedGroq || '');
            setGeminiKey(storedGemini || '');
            setHasChanges(false);
        } catch (error) {
            console.error('Failed to load API keys:', error);
            Alert.alert('Error', 'Failed to load saved API keys.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = useCallback(async () => {
        // Validate keys format (basic check)
        const groqTrimmed = groqKey.trim();
        const geminiTrimmed = geminiKey.trim();

        // Groq keys typically start with "gsk_"
        if (groqTrimmed && !groqTrimmed.startsWith('gsk_')) {
            Alert.alert('Invalid Key', 'Groq API keys typically start with "gsk_". Please verify your key.');
            return;
        }

        // Gemini keys are typically 39 characters
        if (geminiTrimmed && geminiTrimmed.length < 30) {
            Alert.alert('Invalid Key', 'Gemini API key seems too short. Please verify your key.');
            return;
        }

        setIsSaving(true);
        try {
            // Save both keys to SecureStore
            await Promise.all([
                groqTrimmed
                    ? SecureStore.setItemAsync(STORAGE_KEYS.GROQ_API_KEY, groqTrimmed)
                    : SecureStore.deleteItemAsync(STORAGE_KEYS.GROQ_API_KEY),
                geminiTrimmed
                    ? SecureStore.setItemAsync(STORAGE_KEYS.GEMINI_API_KEY, geminiTrimmed)
                    : SecureStore.deleteItemAsync(STORAGE_KEYS.GEMINI_API_KEY),
            ]);

            setHasChanges(false);
            Alert.alert('Success', 'API keys saved securely.', [
                { text: 'OK', onPress: doClose }
            ]);
        } catch (error) {
            console.error('Failed to save API keys:', error);
            Alert.alert('Error', 'Failed to save API keys. Please try again.');
        } finally {
            setIsSaving(false);
        }
    }, [groqKey, geminiKey, doClose]);

    const handleClose = useCallback(() => {
        if (hasChanges) {
            Alert.alert(
                'Unsaved Changes',
                'You have unsaved changes. Discard them?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Discard', style: 'destructive', onPress: doClose }
                ]
            );
        } else {
            doClose();
        }
    }, [hasChanges, doClose]);

    const openDocs = (provider: 'groq' | 'gemini') => {
        const urls = {
            groq: 'https://console.groq.com/keys',
            gemini: 'https://aistudio.google.com/app/apikey',
        };
        Linking.openURL(urls[provider]).catch(() => {
            Alert.alert('Error', 'Could not open browser.');
        });
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                        <X size={24} color={COLORS.light.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>API Keys</Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={!hasChanges || isSaving}
                        style={[styles.saveBtn, (!hasChanges || isSaving) && styles.saveBtnDisabled]}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>Save</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.light.primary} />
                    </View>
                ) : (
                    <View style={styles.content}>
                        {/* Info Banner */}
                        <View style={styles.infoBanner}>
                            <AlertTriangle size={20} color={COLORS.light.warning} />
                            <Text style={styles.infoText}>
                                API keys are stored securely on your device. They are never sent to our servers.
                            </Text>
                        </View>

                        {/* Groq API Key */}
                        <View style={styles.keySection}>
                            <View style={styles.keyHeader}>
                                <Key size={18} color={COLORS.light.primary} />
                                <Text style={styles.keyLabel}>Groq API Key</Text>
                                <TouchableOpacity onPress={() => openDocs('groq')} style={styles.docsLink}>
                                    <Text style={styles.docsLinkText}>Get Key</Text>
                                    <ExternalLink size={14} color={COLORS.light.primary} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    value={groqKey}
                                    onChangeText={(text) => {
                                        setGroqKey(text);
                                        setHasChanges(true);
                                    }}
                                    placeholder="gsk_xxxxxxxxxxxxxxxx"
                                    placeholderTextColor={COLORS.light.textMuted}
                                    secureTextEntry={!showGroqKey}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowGroqKey(!showGroqKey)}
                                    style={styles.eyeBtn}
                                >
                                    {showGroqKey ? (
                                        <EyeOff size={20} color={COLORS.light.textSecondary} />
                                    ) : (
                                        <Eye size={20} color={COLORS.light.textSecondary} />
                                    )}
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.keyHint}>
                                Used for: AI Chat, Quiz, Flashcards, Summaries
                            </Text>
                        </View>

                        {/* Gemini API Key */}
                        <View style={styles.keySection}>
                            <View style={styles.keyHeader}>
                                <Key size={18} color={COLORS.light.secondary} />
                                <Text style={styles.keyLabel}>Gemini API Key</Text>
                                <TouchableOpacity onPress={() => openDocs('gemini')} style={styles.docsLink}>
                                    <Text style={styles.docsLinkText}>Get Key</Text>
                                    <ExternalLink size={14} color={COLORS.light.primary} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    value={geminiKey}
                                    onChangeText={(text) => {
                                        setGeminiKey(text);
                                        setHasChanges(true);
                                    }}
                                    placeholder="AIzaSy..."
                                    placeholderTextColor={COLORS.light.textMuted}
                                    secureTextEntry={!showGeminiKey}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowGeminiKey(!showGeminiKey)}
                                    style={styles.eyeBtn}
                                >
                                    {showGeminiKey ? (
                                        <EyeOff size={20} color={COLORS.light.textSecondary} />
                                    ) : (
                                        <Eye size={20} color={COLORS.light.textSecondary} />
                                    )}
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.keyHint}>
                                Used for: PDF Notes, Paper Generation, Answer Grading
                            </Text>
                        </View>

                        {/* Status Indicators */}
                        <View style={styles.statusSection}>
                            <View style={styles.statusItem}>
                                <View style={[styles.statusDot, groqKey ? styles.statusActive : styles.statusInactive]} />
                                <Text style={styles.statusText}>
                                    Groq: {groqKey ? 'Configured' : 'Not Set'}
                                </Text>
                            </View>
                            <View style={styles.statusItem}>
                                <View style={[styles.statusDot, geminiKey ? styles.statusActive : styles.statusInactive]} />
                                <Text style={styles.statusText}>
                                    Gemini: {geminiKey ? 'Configured' : 'Not Set'}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.light.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.light.border },
    closeBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.light.text },
    saveBtn: { backgroundColor: COLORS.light.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: '#fff', fontWeight: '600' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, padding: 20 },
    infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.light.warning + '15', padding: 14, borderRadius: 12, marginBottom: 24 },
    infoText: { flex: 1, fontSize: 13, color: COLORS.light.text, lineHeight: 18 },
    keySection: { marginBottom: 24 },
    keyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    keyLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.light.text },
    docsLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    docsLinkText: { fontSize: 13, color: COLORS.light.primary, fontWeight: '500' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.light.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.light.border },
    input: { flex: 1, padding: 14, fontSize: 15, color: COLORS.light.text, fontFamily: 'monospace' },
    eyeBtn: { padding: 14 },
    keyHint: { fontSize: 12, color: COLORS.light.textSecondary, marginTop: 6 },
    statusSection: { marginTop: 'auto', paddingTop: 24, borderTopWidth: 1, borderTopColor: COLORS.light.border, gap: 12 },
    statusItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    statusActive: { backgroundColor: COLORS.light.success },
    statusInactive: { backgroundColor: COLORS.light.textMuted },
    statusText: { fontSize: 14, color: COLORS.light.text },
});
