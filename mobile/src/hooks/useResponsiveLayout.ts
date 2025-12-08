import { useWindowDimensions } from 'react-native';

type Breakpoint = 'phone' | 'tablet' | 'desktop';

export const useResponsiveLayout = () => {
    const { width, height } = useWindowDimensions(); // Get both from same call

    const breakpoint: Breakpoint = width >= 1024 ? 'desktop' : width >= 768 ? 'tablet' : 'phone';

    // Layout constants based on breakpoint
    const numColumns = breakpoint === 'phone' ? 1 : breakpoint === 'tablet' ? 2 : 3;
    const contentWidth = breakpoint === 'phone' ? '100%' : '90%';
    const maxContentWidth = 1200;
    const isTabletOrDesktop = breakpoint !== 'phone';

    // Spacing
    const containerPadding = breakpoint === 'phone' ? 16 : 24;
    const gap = breakpoint === 'phone' ? 12 : 20;

    return {
        breakpoint,
        numColumns,
        contentWidth,
        maxContentWidth,
        isTabletOrDesktop,
        containerPadding,
        gap,
        isLandscape: width > 500 && width > height, // Use height from same call - NO RACE CONDITION
    };
};
