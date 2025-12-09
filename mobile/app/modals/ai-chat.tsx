// Enhanced AI Chat Modal - MindVault Modern with Specific Error Messages
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Send, X, Sparkles, User, Copy, Check, Bot } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Markdown from 'react-native-markdown-display';

import GlassLayout from '../../src/components/GlassLayout';
import GlassCard from '../../src/components/GlassCard';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useHaptics } from '../../src/hooks/useHaptics';
import { useNotesStore } from '../../src/stores';
import { chatWithAI } from '../../src/services/ai';
import { ChatMessage } from '../../src/types';
import * as Clipboard from 'expo-clipboard';

// Error type detection helper
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();

        // API key errors
        if (msg.includes('api key') || msg.includes('not configured') || msg.includes('unauthorized')) {
            return "⚠️ API key not configured. Please add your API key in Settings.";
        }

        // Network errors
        if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection') || msg.includes('timeout')) {
            return "📶 Network error. Please check your internet connection and try again.";
        }

        // Rate limit
        if (msg.includes('rate limit') || msg.includes('too many requests')) {
            return "⏳ Too many requests. Please wait a moment and try again.";
        }

        // Server errors
        if (msg.includes('500') || msg.includes('server') || msg.includes('unavailable')) {
            return "🔧 AI service is temporarily unavailable. Please try again later.";
        }

        // Return the actual error if it's descriptive
        if (error.message.length > 10 && error.message.length < 200) {
            return `❌ ${error.message}`;
        }
    }

    return "Sorry, something went wrong. Please try again.";
}

export default function AIChatModal() {
    const router = useRouter();
    const colors = useThemeColors();
    const haptics = useHaptics();
    const { noteId } = useLocalSearchParams<{ noteId?: string }>();
    const flatListRef = useRef<FlatList>(null);

    // Get note context
    const notes = useNotesStore(state => state.notes);
    const note = noteId ? notes.find(n => n.id === noteId) : null;

    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Context message on init
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: 'init',
                role: 'assistant',
                text: note
                    ? `Hi! Ask me anything about "${note.title}".`
                    : "I'm your MindVault AI tutor. How can I help you study today?",
                timestamp: Date.now()
            }]);
        }
    }, [note]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: text,
            timestamp: Date.now(),
            noteId
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        haptics.selection();

        try {
            const response = await chatWithAI(
                [...messages.filter(m => m.id !== 'init'), userMsg],
                note?.content,
                note?.title
            );

            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: response || "I'm having trouble thinking right now.",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);
            haptics.success();
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            const errMsg: ChatMessage = {
                id: Date.now().toString(),
                role: 'assistant',
                text: errorMessage,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errMsg]);
            haptics.error();
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async (text: string, id: string) => {
        await Clipboard.setStringAsync(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        haptics.selection();
    };

    return (
        <GlassLayout>
            <Stack.Screen options={{ headerShown: false }} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

                {/* Header */}
                <View style={[styles.header, { borderBottomColor: 'rgba(255,255,255,0.1)' }]}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.botIcon, { backgroundColor: colors.primary }]}>
                            <Sparkles size={20} color="#fff" />
                        </View>
                        <View>
                            <Text style={[styles.headerTitle, { color: colors.text }]}>AI Tutor</Text>
                            {note && <Text style={[styles.headerStatus, { color: colors.textSecondary }]}>{note.title}</Text>}
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                        <X size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.msgList}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    renderItem={({ item }) => {
                        const isUser = item.role === 'user';
                        return (
                            <Animated.View
                                entering={FadeInUp.springify()}
                                style={[
                                    styles.msgContainer,
                                    isUser ? styles.msgRight : styles.msgLeft
                                ]}
                            >
                                {!isUser && (
                                    <View style={[styles.avatarSmall, { backgroundColor: colors.surfaceHighlight }]}>
                                        <Bot size={16} color={colors.primary} />
                                    </View>
                                )}

                                <View style={[
                                    styles.bubble,
                                    isUser ? { backgroundColor: colors.primary } : { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }
                                ]}>
                                    {isUser ? (
                                        <Text style={[styles.msgText, { color: '#fff' }]}>{item.text}</Text>
                                    ) : (
                                        <Markdown style={{
                                            ...markdownStyles,
                                            body: { ...markdownStyles.body, color: colors.text },
                                            code_block: { ...markdownStyles.code_block, backgroundColor: 'rgba(0,0,0,0.3)' }
                                        }}>
                                            {item.text}
                                        </Markdown>
                                    )}

                                    {!isUser && (
                                        <TouchableOpacity onPress={() => handleCopy(item.text, item.id)} style={styles.copyBtn}>
                                            {copiedId === item.id ? <Check size={12} color={colors.success} /> : <Copy size={12} color={colors.textSecondary} />}
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {isUser && (
                                    <View style={[styles.avatarSmall, { backgroundColor: colors.primary + '20' }]}>
                                        <User size={16} color={colors.primary} />
                                    </View>
                                )}
                            </Animated.View>
                        );
                    }}
                />

                {/* Typing Indicator */}
                {isLoading && (
                    <View style={styles.typingIndicator}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={[styles.typingText, { color: colors.textSecondary }]}>Thinking...</Text>
                    </View>
                )}

                {/* Input Area */}
                <GlassCard style={styles.inputArea} intensity={50}>
                    <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="Ask a question..."
                        placeholderTextColor={colors.textSecondary}
                        value={input}
                        onChangeText={setInput}
                        multiline
                        maxLength={1000}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.surfaceHighlight }]}
                        onPress={handleSend}
                        disabled={!input.trim() || isLoading}
                    >
                        <Send size={20} color="#fff" />
                    </TouchableOpacity>
                </GlassCard>

            </KeyboardAvoidingView>
        </GlassLayout>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
    headerLeft: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    botIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    headerStatus: { fontSize: 12, fontWeight: '600' },
    closeButton: { padding: 8 },

    msgList: { padding: 16, gap: 16 },
    msgContainer: { flexDirection: 'row', gap: 8, maxWidth: '100%', alignItems: 'flex-end' },
    msgLeft: { alignSelf: 'flex-start' },
    msgRight: { alignSelf: 'flex-end', justifyContent: 'flex-end' },

    bubble: { padding: 12, borderRadius: 20, maxWidth: '85%', minWidth: 100 },
    msgText: { fontSize: 16, lineHeight: 22 },
    copyBtn: { position: 'absolute', bottom: 8, right: 8, padding: 4 },

    avatarSmall: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

    typingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, marginLeft: 16 },
    typingText: { fontSize: 12 },

    inputArea: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, borderRadius: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    input: { flex: 1, maxHeight: 100, fontSize: 16, padding: 8 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});

const markdownStyles = {
    body: { fontSize: 15, lineHeight: 22 },
    heading1: { fontSize: 18, fontWeight: '700' as const, marginVertical: 8 },
    heading2: { fontSize: 16, fontWeight: '600' as const, marginVertical: 6 },
    strong: { fontWeight: '700' as const },
    code_inline: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 4,
        borderRadius: 4,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    code_block: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 12,
        borderRadius: 8,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 13,
    },
};
