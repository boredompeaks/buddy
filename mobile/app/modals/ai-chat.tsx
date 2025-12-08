// AI Chat Modal - Doubt solving and study assistance
import { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Send, Sparkles, User, Copy, Check } from 'lucide-react-native';
import { useNotesStore } from '../../src/stores';
import { chatWithAI } from '../../src/services/ai';
import { COLORS } from '../../src/constants';
import { ChatMessage } from '../../src/types';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';

export default function AIChatModal() {
    const { noteId } = useLocalSearchParams<{ noteId?: string }>();
    const router = useRouter();
    const flatListRef = useRef<FlatList<ChatMessage>>(null);

    const notes = useNotesStore(state => state.notes);
    const note = noteId ? notes.find(n => n.id === noteId) : null;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Race condition prevention: track active requests count and latest request ID
    const activeRequestsRef = useRef(0);
    const latestRequestIdRef = useRef(0);
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = useCallback(async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput) return;

        // Prevent double-tap while loading
        if (activeRequestsRef.current > 0) return;

        const requestId = ++latestRequestIdRef.current;
        activeRequestsRef.current++;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}-${requestId}`,
            role: 'user',
            text: trimmedInput,
            timestamp: Date.now(),
            noteId: noteId,
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await chatWithAI(
                [...messages, userMessage],
                note?.content,
                note?.title // Pass note title for context-aware grounding
            );


            // Only update if this is still the latest request
            if (requestId === latestRequestIdRef.current) {
                const assistantMessage: ChatMessage = {
                    id: `assistant-${Date.now()}-${requestId}`,
                    role: 'assistant',
                    text: response || 'I received an empty response. Please try again.',
                    timestamp: Date.now(),
                    noteId: noteId,
                };
                setMessages(prev => [...prev, assistantMessage]);
            }
        } catch (error) {
            // Only show error if this is still the latest request
            if (requestId === latestRequestIdRef.current) {
                const errorText = error instanceof Error ? error.message : 'Unknown error occurred';
                const errorMessage: ChatMessage = {
                    id: `error-${Date.now()}-${requestId}`,
                    role: 'assistant',
                    text: `Sorry, I encountered an error: ${errorText}. Please check your API key in Settings and try again.`,
                    timestamp: Date.now(),
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        } finally {
            activeRequestsRef.current--;
            // Only disable loading when ALL requests are complete
            if (activeRequestsRef.current === 0) {
                setIsLoading(false);
            }
        }
    }, [input, messages, note?.content, noteId]);

    const handleCopy = async (text: string, id: string) => {
        await Clipboard.setStringAsync(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const quickPrompts = [
        'Explain this in simple terms',
        'Give me 5 quiz questions',
        'Summarize the key points',
        'What are the main formulas?',
    ];

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.aiIcon}>
                        <Sparkles size={20} color="#fff" />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>AI Study Assistant</Text>
                        {note && <Text style={styles.headerSubtitle}>Context: {note.title}</Text>}
                    </View>
                </View>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <X size={24} color={COLORS.light.text} />
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Sparkles size={48} color={COLORS.light.primary} />
                        <Text style={styles.emptyTitle}>Ask me anything!</Text>
                        <Text style={styles.emptySubtitle}>
                            {note ? "I'll help you understand your notes better" : "I'm here to help you study"}
                        </Text>

                        {/* Quick Prompts */}
                        <View style={styles.quickPrompts}>
                            {quickPrompts.map((prompt, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.quickPrompt}
                                    onPress={() => setInput(prompt)}
                                >
                                    <Text style={styles.quickPromptText}>{prompt}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={[styles.messageContainer, item.role === 'user' && styles.userMessageContainer]}>
                        <View style={[styles.avatar, item.role === 'user' && styles.userAvatar]}>
                            {item.role === 'user' ? (
                                <User size={16} color="#fff" />
                            ) : (
                                <Sparkles size={16} color="#fff" />
                            )}
                        </View>
                        <View style={[styles.messageBubble, item.role === 'user' && styles.userBubble]}>
                            {item.role === 'assistant' ? (
                                <Markdown style={markdownStyles}>{item.text}</Markdown>
                            ) : (
                                <Text style={styles.userMessageText}>{item.text}</Text>
                            )}

                            {item.role === 'assistant' && (
                                <TouchableOpacity
                                    style={styles.copyButton}
                                    onPress={() => handleCopy(item.text, item.id)}
                                >
                                    {copiedId === item.id ? (
                                        <Check size={14} color={COLORS.light.success} />
                                    ) : (
                                        <Copy size={14} color={COLORS.light.textMuted} />
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
            />

            {/* Loading indicator */}
            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.light.primary} />
                    <Text style={styles.loadingText}>Thinking...</Text>
                </View>
            )}

            {/* Input */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={10}
            >
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={input}
                        onChangeText={setInput}
                        placeholder="Ask a question..."
                        placeholderTextColor={COLORS.light.textMuted}
                        multiline
                        maxLength={2000}
                        onSubmitEditing={handleSend}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
                        onPress={handleSend}
                        disabled={!input.trim() || isLoading}
                    >
                        <Send size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.light.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.light.border,
        backgroundColor: COLORS.light.surface,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    aiIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.light.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.light.text },
    headerSubtitle: { fontSize: 12, color: COLORS.light.textSecondary, marginTop: 2 },
    closeButton: { padding: 8 },
    messagesList: { padding: 16, paddingBottom: 100 },
    emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.light.text },
    emptySubtitle: { fontSize: 14, color: COLORS.light.textSecondary, textAlign: 'center' },
    quickPrompts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 20 },
    quickPrompt: {
        backgroundColor: COLORS.light.surface,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.light.border,
    },
    quickPromptText: { fontSize: 13, color: COLORS.light.textSecondary },
    messageContainer: { flexDirection: 'row', marginBottom: 16, gap: 10 },
    userMessageContainer: { flexDirection: 'row-reverse' },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.light.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userAvatar: { backgroundColor: COLORS.light.secondary },
    messageBubble: {
        flex: 1,
        backgroundColor: COLORS.light.surface,
        padding: 14,
        borderRadius: 16,
        borderTopLeftRadius: 4,
        maxWidth: '85%',
    },
    userBubble: {
        backgroundColor: COLORS.light.primary,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 4,
    },
    userMessageText: { color: '#fff', fontSize: 15, lineHeight: 22 },
    copyButton: {
        alignSelf: 'flex-end',
        marginTop: 8,
        padding: 4,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        gap: 8,
    },
    loadingText: { fontSize: 13, color: COLORS.light.textSecondary },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        backgroundColor: COLORS.light.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.light.border,
    },
    input: {
        flex: 1,
        backgroundColor: COLORS.light.surfaceVariant,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: COLORS.light.text,
        maxHeight: 100,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.light.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: { backgroundColor: COLORS.light.textMuted },
});

const markdownStyles = {
    body: { color: COLORS.light.text, fontSize: 15, lineHeight: 22 },
    heading1: { fontSize: 18, fontWeight: '700' as const, marginVertical: 8 },
    heading2: { fontSize: 16, fontWeight: '600' as const, marginVertical: 6 },
    strong: { fontWeight: '700' as const },
    code_inline: {
        backgroundColor: COLORS.light.surfaceVariant,
        paddingHorizontal: 4,
        borderRadius: 4,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    code_block: {
        backgroundColor: COLORS.light.surfaceVariant,
        padding: 12,
        borderRadius: 8,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 13,
    },
};

