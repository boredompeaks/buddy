// Tab Navigator Layout
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Home, BookOpen, GraduationCap, CheckSquare, User } from 'lucide-react-native';
import { COLORS } from '../../src/constants';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: COLORS.light.primary,
                tabBarInactiveTintColor: COLORS.light.textMuted,
                tabBarLabelStyle: styles.tabLabel,
                tabBarIconStyle: styles.tabIcon,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="notes"
                options={{
                    title: 'Notes',
                    tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="study"
                options={{
                    title: 'Study',
                    tabBarIcon: ({ color, size }) => <GraduationCap size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="routine"
                options={{
                    title: 'Routine',
                    tabBarIcon: ({ color, size }) => <CheckSquare size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: COLORS.light.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.light.border,
        height: Platform.OS === 'ios' ? 88 : 64,
        paddingBottom: Platform.OS === 'ios' ? 24 : 8,
        paddingTop: 8,
        elevation: 0,
        shadowOpacity: 0,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    tabIcon: {
        marginBottom: -4,
    },
});
