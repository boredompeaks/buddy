// Answer Grading Screen - Grade handwritten answers using Gemini multimodal
import { useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, Image as ImageIcon, X, AlertTriangle, CheckCircle, FileText } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNotesStore } from '../../../src/stores';
import { gradeAnswerSheet } from '../../../src/services/ai';
import { COLORS } from '../../../src/constants';
import Markdown from 'react-native-markdown-display';

type GradingState = 'capture' | 'loading' | 'result' | 'error';

interface ImageFile {
    id: string;
    uri: string;
    base64: string;
}

const MAX_IMAGES = 5;

export default function AnswerGradingScreen() {
    const { noteId, questionPaper } = useLocalSearchParams<{ noteId?: string; questionPaper?: string }>();
    const router = useRouter();

    const notes = useNotesStore(state => state.notes);
    const note = noteId ? notes.find(n => n.id === noteId) : null;

    const [state, setState] = useState<GradingState>('capture');
    const [error, setError] = useState<string | null>(null);
    const [images, setImages] = useState<ImageFile[]>([]);
    const [gradingResult, setGradingResult] = useState<string>('');

    // Prevent concurrent operations
    const isProcessingRef = useRef(false);

    // Request camera permissions with graceful fallback
    const pickImage = useCallback(async (source: 'camera' | 'gallery') => {
        if (isProcessingRef.current) return;
        if (images.length >= MAX_IMAGES) {
            Alert.alert('Limit Reached', `Maximum ${MAX_IMAGES} images allowed.`);
            return;
        }

        isProcessingRef.current = true;

        try {
            let result: ImagePicker.ImagePickerResult;

            if (source === 'camera') {
                const permission = await ImagePicker.requestCameraPermissionsAsync();
                if (!permission.granted) {
                    Alert.alert('Permission Required', 'Camera access is needed to capture answer sheets.');
                    isProcessingRef.current = false;
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.8,
                    base64: true,
                });
            } else {
                const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!permission.granted) {
                    Alert.alert('Permission Required', 'Gallery access is needed to select answer sheets.');
                    isProcessingRef.current = false;
                    return;
                }
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.8,
                    base64: true,
                    allowsMultipleSelection: true,
                    selectionLimit: MAX_IMAGES - images.length,
                });
            }

            if (result.canceled || !result.assets || result.assets.length === 0) {
                isProcessingRef.current = false;
                return;
            }

            // Validate and add images
            const newImages: ImageFile[] = [];
            for (const asset of result.assets) {
                // Defensive: validate asset has required fields
                if (!asset.uri || !asset.base64) {
                    console.warn('Asset missing uri or base64, skipping');
                    continue;
                }

                newImages.push({
                    id: `img-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    uri: asset.uri,
                    base64: asset.base64,
                });
            }

            if (newImages.length > 0) {
                setImages(prev => [...prev, ...newImages].slice(0, MAX_IMAGES));
            }
        } catch (err) {
            console.error('Image pick error:', err);
            Alert.alert('Error', 'Failed to capture/select image. Please try again.');
        } finally {
            isProcessingRef.current = false;
        }
    }, [images.length]);

    const removeImage = useCallback((id: string) => {
        setImages(prev => prev.filter(img => img.id !== id));
    }, []);

    const handleGrade = useCallback(async () => {
        // Defensive checks
        if (images.length === 0) {
            setError('Please add at least one answer sheet image.');
            return;
        }

        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        setState('loading');
        setError(null);

        try {
            const base64Images = images.map(img => img.base64);

            const result = await gradeAnswerSheet(
                base64Images,
                questionPaper ?? '',
                note?.content ?? ''
            );

            // Defensive: validate response
            if (!result || typeof result !== 'string' || result.length < 50) {
                throw new Error('Invalid grading result received. Please try again.');
            }

            setGradingResult(result);
            setState('result');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to grade answers.';
            setError(message);
            setState('error');
        } finally {
            isProcessingRef.current = false;
        }
    }, [images, questionPaper, note?.content]);

    const handleRetry = useCallback(() => {
        setState('capture');
        setError(null);
        setGradingResult('');
    }, []);

    const handleReset = useCallback(() => {
        setImages([]);
        handleRetry();
    }, [handleRetry]);

    // Error state
    if (state === 'error') {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.centerContainer}>
                    <AlertTriangle size={48} color={COLORS.light.error} />
                    <Text style={styles.errorTitle}>Grading Failed</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <View style={styles.errorActions}>
                        <TouchableOpacity style={styles.secondaryBtn} onPress={handleReset}>
                            <Text style={styles.secondaryBtnText}>Start Over</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.primaryBtn} onPress={handleGrade}>
                            <Text style={styles.primaryBtnText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // Loading state
    if (state === 'loading') {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.light.primary} />
                    <Text style={styles.loadingText}>Analyzing answers...</Text>
                    <Text style={styles.loadingSubtext}>
                        This may take up to 2 minutes for {images.length} image{images.length > 1 ? 's' : ''}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // Result state
    if (state === 'result') {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <ArrowLeft size={24} color={COLORS.light.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Grading Results</Text>
                    <CheckCircle size={24} color={COLORS.light.success} />
                </View>

                <ScrollView style={styles.resultContainer} contentContainerStyle={styles.resultContent}>
                    <Markdown style={markdownStyles}>
                        {gradingResult}
                    </Markdown>
                </ScrollView>

                <View style={styles.bottomActions}>
                    <TouchableOpacity style={styles.gradeAnotherBtn} onPress={handleReset}>
                        <Text style={styles.gradeAnotherText}>Grade Another</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Capture state (default)
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <ArrowLeft size={24} color={COLORS.light.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Grade Answers</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.captureContent} showsVerticalScrollIndicator={false}>
                {/* Reference Note */}
                {note && (
                    <View style={styles.noteCard}>
                        <FileText size={20} color={COLORS.light.primary} />
                        <View style={styles.noteInfo}>
                            <Text style={styles.noteTitle} numberOfLines={1}>Reference: {note.title}</Text>
                            <Text style={styles.noteStats}>Will be used for grading accuracy</Text>
                        </View>
                    </View>
                )}

                {/* Instructions */}
                <View style={styles.instructionCard}>
                    <Text style={styles.instructionTitle}>How to Grade</Text>
                    <Text style={styles.instructionText}>
                        1. Capture or upload photos of handwritten answer sheets{'\n'}
                        2. Ensure writing is clearly visible{'\n'}
                        3. Add up to {MAX_IMAGES} images for multi-page answers{'\n'}
                        4. AI will analyze and provide detailed feedback
                    </Text>
                </View>

                {/* Image Grid */}
                <View style={styles.imageGrid}>
                    {images.map(img => (
                        <View key={img.id} style={styles.imageContainer}>
                            <Image source={{ uri: img.uri }} style={styles.thumbnail} />
                            <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(img.id)}>
                                <X size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ))}

                    {images.length < MAX_IMAGES && (
                        <View style={styles.addImageContainer}>
                            <TouchableOpacity style={styles.addImageBtn} onPress={() => pickImage('camera')}>
                                <Camera size={24} color={COLORS.light.primary} />
                                <Text style={styles.addImageText}>Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.addImageBtn} onPress={() => pickImage('gallery')}>
                                <ImageIcon size={24} color={COLORS.light.primary} />
                                <Text style={styles.addImageText}>Gallery</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Image Count */}
                <Text style={styles.imageCount}>
                    {images.length} / {MAX_IMAGES} images added
                </Text>

                {/* Grade Button */}
                <TouchableOpacity
                    style={[styles.gradeBtn, images.length === 0 && styles.gradeBtnDisabled]}
                    onPress={handleGrade}
                    disabled={images.length === 0}
                >
                    <Text style={styles.gradeBtnText}>
                        Grade {images.length > 0 ? `${images.length} Answer Sheet${images.length > 1 ? 's' : ''}` : 'Answers'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.light.background },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
    loadingText: { fontSize: 18, fontWeight: '600', color: COLORS.light.text, marginTop: 16 },
    loadingSubtext: { fontSize: 14, color: COLORS.light.textSecondary, textAlign: 'center' },
    errorTitle: { fontSize: 20, fontWeight: '700', color: COLORS.light.text, marginTop: 12 },
    errorText: { fontSize: 14, color: COLORS.light.textSecondary, textAlign: 'center', marginBottom: 8 },
    errorActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.light.border },
    headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.light.text },
    captureContent: { padding: 20 },
    noteCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.light.surface, padding: 16, borderRadius: 16, marginBottom: 16 },
    noteInfo: { flex: 1 },
    noteTitle: { fontSize: 15, fontWeight: '600', color: COLORS.light.text },
    noteStats: { fontSize: 13, color: COLORS.light.textSecondary, marginTop: 2 },
    instructionCard: { backgroundColor: COLORS.light.primary + '10', padding: 16, borderRadius: 12, marginBottom: 20 },
    instructionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.light.primary, marginBottom: 8 },
    instructionText: { fontSize: 14, color: COLORS.light.text, lineHeight: 22 },
    imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
    imageContainer: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden' },
    thumbnail: { width: '100%', height: '100%' },
    removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: COLORS.light.error, padding: 4, borderRadius: 12 },
    addImageContainer: { flexDirection: 'row', gap: 12 },
    addImageBtn: { width: 100, height: 100, backgroundColor: COLORS.light.surface, borderRadius: 12, borderWidth: 2, borderColor: COLORS.light.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4 },
    addImageText: { fontSize: 12, color: COLORS.light.primary, fontWeight: '500' },
    imageCount: { fontSize: 13, color: COLORS.light.textSecondary, marginBottom: 20 },
    gradeBtn: { backgroundColor: COLORS.light.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
    gradeBtnDisabled: { opacity: 0.5 },
    gradeBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    primaryBtn: { flex: 1, backgroundColor: COLORS.light.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: '600' },
    secondaryBtn: { flex: 1, paddingVertical: 14, backgroundColor: COLORS.light.surface, borderRadius: 12, alignItems: 'center' },
    secondaryBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.light.primary },
    resultContainer: { flex: 1 },
    resultContent: { padding: 20 },
    bottomActions: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.light.border },
    gradeAnotherBtn: { backgroundColor: COLORS.light.surface, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    gradeAnotherText: { fontSize: 15, fontWeight: '600', color: COLORS.light.primary },
});

const markdownStyles = {
    body: { color: COLORS.light.text, fontSize: 15, lineHeight: 24 },
    heading1: { fontSize: 22, fontWeight: '700' as const, marginVertical: 12, color: COLORS.light.text },
    heading2: { fontSize: 18, fontWeight: '600' as const, marginVertical: 10, color: COLORS.light.text },
    heading3: { fontSize: 16, fontWeight: '600' as const, marginVertical: 8, color: COLORS.light.text },
    strong: { fontWeight: '700' as const },
    table: { borderWidth: 1, borderColor: COLORS.light.border },
    th: { padding: 8, backgroundColor: COLORS.light.surfaceVariant },
    td: { padding: 8, borderWidth: 1, borderColor: COLORS.light.border },
};
