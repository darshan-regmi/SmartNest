import React from 'react';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';

/**
 * Authentication Stack Layout
 * 
 * Handles the complete authentication flow with:
 * - Sign In / Sign Up (combined single screen)
 * - Password Reset (optional future)
 * - Email Verification (optional future)
 * 
 * Configuration highlights:
 * ✅ No header (cleaner auth UI)
 * ✅ Gestures disabled (users can't accidentally go back)
 * ✅ Smooth animations (300ms transitions)
 * ✅ Safe area handled (notch/status bar aware)
 * ✅ Dark mode support (respects system preferences)
 */

// Color palette for light/dark mode
const Colors = {
  light: {
    background: '#FCFCF9',
    text: '#1F2121',
  },
  dark: {
    background: '#1F2121',
    text: '#FCFCF9',
  },
};

export default function AuthLayout() {
  // Get safe area insets for notch/status bar handling
  const insets = useSafeAreaInsets();

  // Detect system color scheme preference
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Select background based on current theme
  const backgroundColor =
    isDark ? Colors.dark.background : Colors.light.background;

  return (
    <Stack
      screenOptions={{
        // ============================================
        // HEADER CONFIGURATION
        // ============================================
        /**
         * headerShown: false
         * - Removes native header bar
         * - Provides clean, full-screen auth UI
         * - Users don't need navigation controls
         */
        headerShown: false,

        // ============================================
        // ANIMATION CONFIGURATION
        // ============================================
        /**
         * animationEnabled: true
         * - Enables smooth screen transitions
         * - Native feel on iOS and Android
         * - Professional user experience
         */
        animationEnabled: true,

        /**
         * cardStyle: { backgroundColor }
         * - Sets background color during animation
         * - Prevents white flash between screens
         * - Respects light/dark mode preference
         */
        cardStyle: {
          backgroundColor,
        },

        /**
         * cardShadowEnabled: true
         * - Adds iOS elevation/shadow effect
         * - Visual depth perception
         * - More polished appearance
         */
        cardShadowEnabled: true,

        // ============================================
        // GESTURE HANDLING
        // ============================================
        /**
         * gestureEnabled: false
         * CRITICAL FOR SECURITY
         * 
         * Prevents:
         * - Swiping back on iOS
         * - Gesture dismissal
         * - Accidental navigation away from auth
         * 
         * Users must explicitly log out, improving:
         * - Security: Prevents accidental access loss
         * - UX: More intentional navigation
         * - Mobile best practice: Auth should be explicit
         */
        gestureEnabled: false,

        // ============================================
        // SAFE AREA INTEGRATION
        // ============================================
        /**
         * safeAreaInsets configuration handles:
         * - iPhone notch (12+, 13+, etc.)
         * - Android punch holes
         * - Status bar spacing
         * - Bottom safe area (home indicator)
         * 
         * Ensures content never overlaps system UI
         */
        safeAreaInsets: {
          top: insets.top || 0,
          bottom: insets.bottom || 0,
          left: insets.left || 0,
          right: insets.right || 0,
        },

        // ============================================
        // TRANSITION SPECIFICATION
        // ============================================
        /**
         * transitionSpec: Controls animation timing
         * 
         * 300ms duration is industry standard:
         * - Fast enough to feel responsive
         * - Slow enough to be smooth
         * - Matches Material Design guidelines
         * - iOS Human Interface Guidelines compliant
         */
        transitionSpec: {
          open: {
            animation: 'timing',
            config: {
              duration: 300,
            },
          },
          close: {
            animation: 'timing',
            config: {
              duration: 300,
            },
          },
        },

        /**
         * cardOverlayEnabled: false
         * - Disables overlay during transitions
         * - Cleaner visual appearance
         * - Better performance
         */
        cardOverlayEnabled: false,
      }}
    >
      {/* ============================================
          MAIN AUTH SCREEN (Sign In / Sign Up)
          ============================================ */}
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          gestureEnabled: false,
          cardOverlayEnabled: false,
        }}
      />

      {/* ============================================
          OPTIONAL: FUTURE AUTH SCREENS
          ============================================ 
          
          Uncomment and expand as needed:
      */}

      {/* Password Reset Screen */}
      {/* 
      <Stack.Screen
        name="forgot-password"
        options={{
          headerShown: false,
          gestureEnabled: false,
          // Allow going back to sign in
          cardOverlayEnabled: false,
        }}
      />
      */}

      {/* Email Verification Screen */}
      {/* 
      <Stack.Screen
        name="verify-email"
        options={{
          headerShown: false,
          // Prevent going back after signup
          gestureEnabled: false,
          cardOverlayEnabled: false,
        }}
      />
      */}

      {/* Password Reset Confirmation */}
      {/* 
      <Stack.Screen
        name="reset-password"
        options={{
          headerShown: false,
          gestureEnabled: false,
          cardOverlayEnabled: false,
        }}
      />
      */}
    </Stack>
  );
}
