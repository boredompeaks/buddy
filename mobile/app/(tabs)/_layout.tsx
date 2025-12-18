// Tab Navigator Layout
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Home, BookOpen, GraduationCap, Calendar, User } from 'lucide-react-native'; // Changed CheckSquare to Calendar for Routine
import { useThemeColors } from '../../hooks/useThemeColors';

export default function TabLayout() {
    const colors = useThemeColors();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: [
                    styles.tabBar,
                    {
                        backgroundColor: colors.surface,
                        borderTopColor: colors.border,
                    }
                ],
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarLabelStyle: styles.tabLabel,
                tabBarIconStyle: styles.tabIcon,
                tabBarBackground: () => (
                    <View style={{ flex: 1, backgroundColor: colors.surface }} />
                ),
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
                    tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
                }}
            />

            {/* Hidden Routes */}
            <Tabs.Screen name="study/quiz" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="study/flashcards" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="study/analytics" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="study/paper-generator" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="study/answer-grading" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="study/exam/review" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="study/exam/lockdown" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="routine/daily-planner" options={{ href: null, tabBarStyle: { display: 'none' } }} />
            <Tabs.Screen name="routine/exam-schedule" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        borderTopWidth: 0.5,
        height: Platform.OS === 'ios' ? 88 : 64,
        paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        paddingTop: 8,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    tabIcon: {
        marginBottom: -4,
    },
});
