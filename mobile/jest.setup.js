// Jest setup file for React Native Testing Library
import '@testing-library/jest-native/extend-expect';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    Reanimated.default.call = () => { };
    return Reanimated;
});

// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
    openDatabaseAsync: jest.fn().mockResolvedValue({
        runAsync: jest.fn(),
        getAllAsync: jest.fn().mockResolvedValue([]),
        getFirstAsync: jest.fn(),
        execAsync: jest.fn(),
    }),
}));

// Mock crypto.randomUUID
if (typeof global.crypto === 'undefined') {
    global.crypto = {} as any;
}
global.crypto.randomUUID = jest.fn().mockReturnValue('test-uuid-123');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
