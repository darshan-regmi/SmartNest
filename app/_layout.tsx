import React from "react";
import { Stack } from "expo-router";
import { ActivityIndicator, View, useColorScheme } from "react-native";
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
  const { user, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  // Loading state
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Not authenticated - show auth stack
  if (!user) {
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
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack>
    );
  }

  // Authenticated - show tabs + settings
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        animationEnabled: true,
        cardStyle: {
          backgroundColor: colors.background,
        },
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
      }}
    >
      {/* Tabs (Home, Devices) */}
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
          title: "Settings",
          headerBackTitle: "Back",
          presentation: "card",
          animationEnabled: true,
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
