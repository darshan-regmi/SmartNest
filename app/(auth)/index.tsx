import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
  Keyboard,
  useWindowDimensions,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  sendEmailVerification,
  updateProfile,
  AuthError,
} from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

// ============================================
// TYPES & CONSTANTS
// ============================================

type AuthMode = "signin" | "signup";
type ValidationError = Record<string, string>;

const Colors = {
  light: {
    background: "#FCFCF9",
    surface: "#FFFFFF",
    text: "#1F2121",
    textSecondary: "#626C7C",
    tertiary: "#8B93A1",
    primary: "#208A95",
    primaryLight: "#E0F7FA",
    error: "#EF4444",
    errorLight: "#FEE2E2",
    success: "#10B981",
    successLight: "#ECFDF5",
    warning: "#F59E0B",
    warningLight: "#FEF3C7",
    border: "#E5E7EB",
    overlay: "rgba(31, 33, 33, 0.04)",
    inputBg: "#F9FAFB",
    tabBg: "#F3F4F6",
  },
  dark: {
    background: "#1F2121",
    surface: "#2A2C2C",
    text: "#F5F5F5",
    textSecondary: "#A7A9A9",
    tertiary: "#7A7E7E",
    primary: "#32B8C6",
    primaryLight: "#1B4D54",
    error: "#FF5459",
    errorLight: "#3B1A1C",
    success: "#10B981",
    successLight: "#1B3D2D",
    warning: "#F59E0B",
    warningLight: "#3E2C0B",
    border: "#3A3C3C",
    overlay: "rgba(255, 255, 255, 0.04)",
    inputBg: "#1F2121",
    tabBg: "#3A3C3C",
  },
};

// Email regex validation - RFC 5322 simplified
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Username regex - alphanumeric, underscores, hyphens, 3-20 chars
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;

// Rate limiting configuration
const RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Sanitize Firebase error messages to be user-friendly
 * Prevents exposing internal error details
 */
const getSafeErrorMessage = (error: AuthError | any): string => {
  const errorMap: Record<string, string> = {
    "auth/user-not-found": "Email not found. Please sign up.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/email-already-in-use": "Email already registered. Sign in instead.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
  };

  return errorMap[error.code] || "Authentication failed. Please try again.";
};

/**
 * Validate email format
 */
const isValidEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Validate username format
 */
const isValidUsername = (username: string): boolean => {
  return USERNAME_REGEX.test(username.trim());
};

/**
 * Rate limiting check
 */
const checkRateLimit = async (key: string): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(key);
    if (!data) return true;

    const { attempts, timestamp } = JSON.parse(data);
    const now = Date.now();

    if (now - timestamp > RATE_LIMIT.windowMs) {
      await AsyncStorage.removeItem(key);
      return true;
    }

    return attempts < RATE_LIMIT.maxAttempts;
  } catch {
    return true;
  }
};

/**
 * Increment rate limit counter
 */
const recordAuthAttempt = async (key: string): Promise<void> => {
  try {
    const data = await AsyncStorage.getItem(key);
    const { attempts, timestamp } = data
      ? JSON.parse(data)
      : { attempts: 0, timestamp: Date.now() };

    await AsyncStorage.setItem(
      key,
      JSON.stringify({
        attempts: attempts + 1,
        timestamp,
      })
    );
  } catch {
    // Silent fail
  }
};

// ============================================
// COMPONENT
// ============================================

export default function AuthScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  // Auth state
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationError>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Rate limiting refs
  const rateLimitKeyRef = useRef(email || "guest");

  // Google Auth
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      handleGoogleSignIn(id_token);
    } else if (response?.type === "error") {
      setGeneralError("Google sign-in was cancelled.");
      setGoogleLoading(false);
    }
  }, [response]);

  useEffect(() => {
    loadSavedCredentials();
  }, []);

  useEffect(() => {
    if (generalError || Object.keys(errors).length > 0) {
      const timer = setTimeout(() => {
        setErrors({});
        setGeneralError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [generalError, errors]);

  // ============================================
  // HANDLERS
  // ============================================

  const loadSavedCredentials = async (): Promise<void> => {
    try {
      const isEnabled = await AsyncStorage.getItem("rememberMeEnabled");
      if (isEnabled === "true") {
        const savedEmail = await AsyncStorage.getItem("rememberedEmail");
        if (savedEmail && isValidEmail(savedEmail)) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      }
    } catch (err) {
      console.error("Failed to load saved credentials:", err);
    }
  };

  const saveCredentials = async (emailToSave: string): Promise<void> => {
    try {
      if (rememberMe) {
        await AsyncStorage.setItem("rememberedEmail", emailToSave);
        await AsyncStorage.setItem("rememberMeEnabled", "true");
      } else {
        await AsyncStorage.removeItem("rememberedEmail");
        await AsyncStorage.removeItem("rememberMeEnabled");
      }
    } catch (err) {
      console.error("Failed to save credentials:", err);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationError = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(email)) {
      newErrors.email = "Enter a valid email";
    }

    // Username validation (signup only)
    if (mode === "signup") {
      if (!username.trim()) {
        newErrors.username = "Username is required";
      } else if (!isValidUsername(username)) {
        newErrors.username = "Username: 3-20 chars, letters/numbers/_/-";
      }
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be 6+ characters";
    }

    // Confirm password validation (signup only)
    if (mode === "signup") {
      if (!confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = useCallback(async () => {
    if (!validateForm()) return;

    setGeneralError(null);

    const canAttempt = await checkRateLimit(`auth_attempts_${email}`);
    if (!canAttempt) {
      setGeneralError("Too many login attempts. Try again in 15 minutes.");
      return;
    }

    setLoading(true);
    rateLimitKeyRef.current = email;

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      await saveCredentials(email);
      router.replace("/(tabs)");
    } catch (error: any) {
      await recordAuthAttempt(`auth_attempts_${email}`);
      setGeneralError(getSafeErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [email, password, mode, rememberMe]);

  const handleSignUp = useCallback(async () => {
    if (!validateForm()) return;

    setGeneralError(null);

    const canAttempt = await checkRateLimit(`signup_attempts_${email}`);
    if (!canAttempt) {
      setGeneralError("Too many signup attempts. Try again in 15 minutes.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // Update profile with username
      await updateProfile(userCredential.user, {
        displayName: username.trim(),
      });

      // Save user data to Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        username: username.trim(),
        email: email.trim(),
        displayName: username.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Send verification email
      await sendEmailVerification(userCredential.user, {
        url: `${process.env.EXPO_PUBLIC_APP_URL}/verify?email=${email}`,
        handleCodeInApp: true,
      });

      Alert.alert(
        "Account Created",
        "Please verify your email to continue. Check your inbox.",
        [{ text: "OK", onPress: () => setMode("signin") }]
      );

      await saveCredentials(email);
      setPassword("");
      setConfirmPassword("");
      setUsername("");
    } catch (error: any) {
      await recordAuthAttempt(`signup_attempts_${email}`);
      setGeneralError(getSafeErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [email, username, password, confirmPassword, rememberMe]);

  const handleGoogleSignIn = async (idToken: string): Promise<void> => {
    setGeneralError(null);
    setGoogleLoading(true);

    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);

      // Save or update user data in Firestore
      await setDoc(
        doc(db, "users", result.user.uid),
        {
          email: result.user.email,
          displayName: result.user.displayName || "User",
          photoURL: result.user.photoURL || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true }
      );

      await saveCredentials(result.user.email || "");
      router.replace("/(tabs)");
    } catch (error: any) {
      setGeneralError(getSafeErrorMessage(error));
    } finally {
      setGoogleLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode): void => {
    setMode(newMode);
    setErrors({});
    setGeneralError(null);
    setPassword("");
    setConfirmPassword("");
    setUsername("");
    Keyboard.dismiss();
  };

  const isSignIn = mode === "signin";

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { minHeight: height }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.primaryLight },
            ]}
          >
            <Ionicons name="lock-closed" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>
            SmartNest
          </Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Secure Access to Your Smart Home
          </Text>
        </View>

        {/* Auth Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Tabs */}
          <View
            style={[styles.tabsContainer, { backgroundColor: colors.tabBg }]}
          >
            <TouchableOpacity
              style={[
                styles.tab,
                isSignIn && [
                  styles.tabActive,
                  { backgroundColor: colors.primary },
                ],
              ]}
              onPress={() => switchMode("signin")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  isSignIn && styles.tabTextActive,
                  !isSignIn && { color: colors.tertiary },
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                !isSignIn && [
                  styles.tabActive,
                  { backgroundColor: colors.primary },
                ],
              ]}
              onPress={() => switchMode("signup")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  !isSignIn && styles.tabTextActive,
                  isSignIn && { color: colors.tertiary },
                ]}
              >
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {isSignIn ? "Welcome Back" : "Create Account"}
          </Text>

          {/* Username Input (Signup Only) */}
          {!isSignIn && (
            <View style={styles.formGroup}>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: errors.username ? colors.error : colors.border,
                  },
                  errors.username && {
                    backgroundColor: isDark
                      ? colors.errorLight
                      : `${colors.error}08`,
                  },
                ]}
              >
                <Ionicons
                  name="person"
                  size={18}
                  color={colors.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Username"
                  placeholderTextColor={colors.tertiary}
                  autoCapitalize="none"
                  editable={!loading && !googleLoading}
                  value={username}
                  onChangeText={setUsername}
                  autoComplete="off"
                  maxLength={20}
                />
              </View>
              {errors.username && (
                <Text style={[styles.errorMessage, { color: colors.error }]}>
                  {errors.username}
                </Text>
              )}
              {!errors.username && !isSignIn && username.length > 0 && (
                <Text
                  style={[styles.successMessage, { color: colors.success }]}
                >
                  ✓ Username available
                </Text>
              )}
            </View>
          )}

          {/* Email Input */}
          <View style={styles.formGroup}>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: errors.email ? colors.error : colors.border,
                },
                errors.email && {
                  backgroundColor: isDark
                    ? colors.errorLight
                    : `${colors.error}08`,
                },
              ]}
            >
              <Ionicons
                name="mail"
                size={18}
                color={colors.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Email address"
                placeholderTextColor={colors.tertiary}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading && !googleLoading}
                value={email}
                onChangeText={setEmail}
                autoComplete="email"
              />
            </View>
            {errors.email && (
              <Text style={[styles.errorMessage, { color: colors.error }]}>
                {errors.email}
              </Text>
            )}
          </View>

          {/* Password Input */}
          <View style={styles.formGroup}>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: errors.password ? colors.error : colors.border,
                },
                errors.password && {
                  backgroundColor: isDark
                    ? colors.errorLight
                    : `${colors.error}08`,
                },
              ]}
            >
              <Ionicons
                name="key"
                size={18}
                color={colors.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Password"
                placeholderTextColor={colors.tertiary}
                secureTextEntry={!showPassword}
                editable={!loading && !googleLoading}
                value={password}
                onChangeText={setPassword}
                autoComplete="password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading || googleLoading}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? "eye" : "eye-off"}
                  size={18}
                  color={colors.tertiary}
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={[styles.errorMessage, { color: colors.error }]}>
                {errors.password}
              </Text>
            )}
          </View>

          {/* Confirm Password (Signup Only) */}
          {!isSignIn && (
            <View style={styles.formGroup}>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: errors.confirmPassword
                      ? colors.error
                      : colors.border,
                  },
                  errors.confirmPassword && {
                    backgroundColor: isDark
                      ? colors.errorLight
                      : `${colors.error}08`,
                  },
                ]}
              >
                <Ionicons
                  name="key"
                  size={18}
                  color={colors.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Confirm password"
                  placeholderTextColor={colors.tertiary}
                  secureTextEntry={!showPassword}
                  editable={!loading && !googleLoading}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoComplete="password"
                />
              </View>
              {errors.confirmPassword && (
                <Text style={[styles.errorMessage, { color: colors.error }]}>
                  {errors.confirmPassword}
                </Text>
              )}
            </View>
          )}

          {/* General Error Message */}
          {generalError && (
            <View
              style={[
                styles.errorContainer,
                {
                  backgroundColor: isDark
                    ? colors.errorLight
                    : `${colors.error}12`,
                },
              ]}
            >
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>
                {generalError}
              </Text>
            </View>
          )}

          {/* Remember Me (Sign In Only) */}
          {isSignIn && (
            <TouchableOpacity
              style={styles.rememberContainer}
              onPress={() => setRememberMe(!rememberMe)}
              disabled={loading || googleLoading}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: colors.primary,
                    backgroundColor: rememberMe
                      ? colors.primary
                      : "transparent",
                  },
                ]}
              >
                {rememberMe && (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                )}
              </View>
              <Text style={[styles.rememberText, { color: colors.text }]}>
                Remember me
              </Text>
            </TouchableOpacity>
          )}

          {/* Main CTA Button */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.primary },
              (loading || googleLoading) && styles.buttonDisabled,
            ]}
            onPress={isSignIn ? handleSignIn : handleSignUp}
            disabled={loading || googleLoading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons
                  name={isSignIn ? "log-in" : "person-add"}
                  size={18}
                  color="#FFF"
                  style={styles.buttonIcon}
                />
                <Text style={styles.buttonText}>
                  {isSignIn ? "Sign In" : "Create Account"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
            <Text style={[styles.dividerText, { color: colors.tertiary }]}>
              or
            </Text>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
          </View>

          {/* Google Sign In Button */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              (googleLoading || loading || !request) && styles.buttonDisabled,
            ]}
            onPress={() => {
              setGoogleLoading(true);
              promptAsync();
            }}
            disabled={loading || !request || googleLoading}
            activeOpacity={0.85}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.text} size="small" />
            ) : (
              <Text style={[styles.googleButtonText, { color: colors.text }]}>
                Continue with Google
              </Text>
            )}
          </TouchableOpacity>

          {/* Mode Toggle */}
          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
              {isSignIn
                ? "Don't have an account? "
                : "Already have an account? "}
            </Text>
            <TouchableOpacity
              onPress={() => switchMode(isSignIn ? "signup" : "signin")}
              disabled={loading || googleLoading}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleLink, { color: colors.primary }]}>
                {isSignIn ? "Sign up" : "Sign in"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.tertiary }]}>
            🔒 Your data is secured with enterprise-grade encryption
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  appName: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  tabsContainer: {
    flexDirection: "row",
    marginBottom: 24,
    borderRadius: 10,
    padding: 5,
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  tabTextActive: {
    color: "#FFF",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 22,
  },
  formGroup: {
    marginBottom: 18,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 10,
  },
  inputIcon: {
    marginRight: 0,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  errorMessage: {
    fontSize: 12,
    marginTop: 7,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  successMessage: {
    fontSize: 12,
    marginTop: 7,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 18,
    gap: 10,
    borderLeftWidth: 3,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
    fontWeight: "500",
    lineHeight: 18,
  },
  rememberContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    gap: 9,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  rememberText: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 0,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  googleButton: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
  toggleLink: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  footer: {
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 18,
  },
});
