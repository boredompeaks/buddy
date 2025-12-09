import { useColorScheme } from 'react-native';
import { COLORS } from '../constants';

export const useThemeColors = () => {
    const theme = useColorScheme() ?? 'light';
    return COLORS[theme];
};
