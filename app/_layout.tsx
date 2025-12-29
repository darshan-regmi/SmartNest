import React from "react";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { AuthProvider, useAuth } from "../lib/authContext";

// ============================================
// COLOR SYSTEM
// ============================================

const Colors = {
  light: {
    background: "#FCFCF9",
    text: "#1F2121",
    primary: "#208A95",
  },
  dark: {
    background: "#1F2121",
    text: "#F5F5F5",
    primary: "#32B8C6",
  },
};

// ============================================
// ROOT LAYOUT CONTENT
// ============================================

function RootLayoutContent() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  // Always render all screens, let navigation handle routing
  // Not authenticated users will see auth screen
  // Authenticated users will see tabs
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
        cardStyle: {
          backgroundColor: colors.background,
        },
        gestureEnabled: false,
      }}
    >
      {/* Auth Stack - Always first so it's the initial route */}
      <Stack.Screen
        name="(auth)"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      {/* Tabs Stack */}
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      {/* Settings Screen */}
      <Stack.Screen
        name="settings"
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            fontWeight: "700",
            fontSize: 18,
            color: colors.text,
          },
          headerShadowVisible: false,
          title: "Settings",
          headerBackTitle: "Back",
          presentation: "card",
        }}
      />
    </Stack>
  );
}

// ============================================
// ROOT LAYOUT
// ============================================

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}
