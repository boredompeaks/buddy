// Image Utilities - Compression and processing for AI features
import * as ImageManipulator from 'expo-image-manipulator';

// Maximum dimension for images sent to AI (prevents OOM)
const MAX_IMAGE_DIMENSION = 1600;
const COMPRESSION_QUALITY = 0.7;
const MAX_FILE_SIZE_KB = 1024; // 1MB target

interface CompressedImage {
    uri: string;
    base64: string;
    width: number;
    height: number;
}

/**
 * Compresses and resizes an image to prevent OOM crashes when processing with AI.
 * 
 * @param uri - The file URI of the image to compress
 * @param base64 - Optional existing base64 data (for images from picker)
 * @returns Compressed image with new dimensions and base64 data
 */
export async function compressImageForAI(
    uri: string,
    base64?: string
): Promise<CompressedImage> {
    try {
        // First, resize if needed
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [
                {
                    resize: {
                        width: MAX_IMAGE_DIMENSION, // Will maintain aspect ratio
                    },
                },
            ],
            {
                compress: COMPRESSION_QUALITY,
                format: ImageManipulator.SaveFormat.JPEG,
                base64: true,
            }
        );

        return {
            uri: result.uri,
            base64: result.base64 || '',
            width: result.width,
            height: result.height,
        };
    } catch (error) {
        console.error('Image compression failed:', error);

        // If compression fails, try to use original if base64 is available
        if (base64) {
            return {
                uri,
                base64,
                width: 0,
                height: 0,
            };
        }

        throw new Error('Failed to process image. Please try a smaller image.');
    }
}

/**
 * Validates that an image base64 string is within acceptable size limits.
 * Base64 encoding increases size by ~33%, so we check accordingly.
 */
export function validateImageSize(base64: string, maxSizeKB: number = MAX_FILE_SIZE_KB): boolean {
    // Base64 string length in bytes is roughly (length * 3/4)
    const estimatedBytes = (base64.length * 3) / 4;
    const estimatedKB = estimatedBytes / 1024;
    return estimatedKB <= maxSizeKB;
}

/**
 * Estimates the token cost of an image for AI APIs.
 * Most vision models charge based on resolution buckets.
 */
export function estimateImageTokens(width: number, height: number): number {
    const pixels = width * height;

    // Rough estimation based on typical vision model pricing
    // Images are typically encoded into patch tokens
    if (pixels <= 512 * 512) return 85;
    if (pixels <= 1024 * 1024) return 170;
    if (pixels <= 2048 * 2048) return 680;
    return 1360; // Very large images
}

/**
 * Batch compresses multiple images for AI processing.
 * Useful for answer grading which can take multiple images.
 */
export async function compressImagesForAI(
    images: { uri: string; base64?: string }[]
): Promise<CompressedImage[]> {
    const compressed: CompressedImage[] = [];

    for (const img of images) {
        try {
            const result = await compressImageForAI(img.uri, img.base64);
            compressed.push(result);
        } catch (error) {
            console.warn('Skipping failed image compression:', error);
            // Skip failed images but continue processing others
        }
    }

    return compressed;
}
