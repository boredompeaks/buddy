// useHaptics Hook - Tactile feedback for interactions
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

export function useHaptics() {
    const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

    const trigger = async (style: HapticStyle = 'light') => {
        if (!isSupported) return;

        try {
            switch (style) {
                case 'light':
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    break;
                case 'medium':
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    break;
                case 'heavy':
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    break;
                case 'success':
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    break;
                case 'warning':
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    break;
                case 'error':
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    break;
                case 'selection':
                    await Haptics.selectionAsync();
                    break;
            }
        } catch (error) {
            // Silently fail - haptics are non-critical
            console.debug('Haptics unavailable:', error);
        }
    };

    return {
        trigger,
        light: () => trigger('light'),
        medium: () => trigger('medium'),
        heavy: () => trigger('heavy'),
        success: () => trigger('success'),
        warning: () => trigger('warning'),
        error: () => trigger('error'),
        selection: () => trigger('selection'),
    };
}
