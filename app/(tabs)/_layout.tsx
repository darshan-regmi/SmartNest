import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from 'react-native';


const Colors = {
  light: {
    primary: '#208A95',
    primaryLight: '#E0F7FA',
    background: '#FCFCF9',
    surface: '#FFFFFF',
    text: '#1F2121',
    textSecondary: '#626C7C',
    tertiary: '#8B93A1',
    border: '#E5E7EB',
    overlay: 'rgba(31, 33, 33, 0.04)',
  },
  dark: {
    primary: '#32B8C6',
    primaryLight: '#1B4D54',
    background: '#1F2121',
    surface: '#2A2C2C',
    text: '#F5F5F5',
    textSecondary: '#A7A9A9',
    tertiary: '#7A7E7E',
    border: '#3A3C3C',
    overlay: 'rgba(255, 255, 255, 0.04)',
  },
};


export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          borderTopColor: colors.border,
          borderTopWidth: 1,
          backgroundColor: colors.surface,
          paddingBottom: 10,
          paddingTop: 10,
          height: 76,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tertiary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 5,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={focused ? 26 : 24}
              color={color}
              style={{
                marginBottom: focused ? 2 : 0,
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: 'Devices',
          tabBarLabel: 'Devices',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'list' : 'list-outline'}
              size={focused ? 26 : 24}
              color={color}
              style={{
                marginBottom: focused ? 2 : 0,
              }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
