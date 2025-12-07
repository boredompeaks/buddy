import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../src/stores';
import { COLORS } from '../src/constants';

export function useThemeColors() {
    const theme = useSettingsStore(state => state.settings.theme);
    const systemScheme = useColorScheme();

    if (theme === 'dark') return COLORS.dark;
    if (theme === 'light') return COLORS.light;
    
    return systemScheme === 'dark' ? COLORS.dark : COLORS.light;
}
