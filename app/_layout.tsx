import { Stack } from "expo-router";
import React from "react";
import { Platform, useColorScheme, View } from "react-native";
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
  const content = (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },

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

  if (Platform.OS === "web") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: isDark ? "#121212" : "#F0F0F0",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 600,
            height: "100%",
            backgroundColor: colors.background,
            overflow: "hidden",
            // Add a subtle shadow for desktop
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
          }}
        >
          {content}
        </View>
      </View>
    );
  }

  return content;
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
