import React, { useState, useCallback, useRef, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  sendEmailVerification,
  setPersistence,
  browserLocalPersistence,
  AuthError,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';


WebBrowser.maybeCompleteAuthSession();


// ============================================
// TYPES & CONSTANTS
// ============================================


type AuthMode = 'signin' | 'signup';
type ValidationError = Record<string, string>;


const Colors = {
  background: '#FCFCF9',
  surface: '#FFFFFF',
  text: '#1F2121',
  textSecondary: '#626C7C',
  primary: '#208A95',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};


// Email regex validation - RFC 5322 simplified
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


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
    'auth/user-not-found': 'Email not found. Please sign up.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'Email already registered. Sign in instead.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
  };


  return errorMap[error.code] || 'Authentication failed. Please try again.';
};


/**
 * Validate email format
 */
const isValidEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email.trim());
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
      // Window expired
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
    const { attempts, timestamp } = data ? JSON.parse(data) : { attempts: 0, timestamp: Date.now() };


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


  // Auth state
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);


  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationError>({});
  const [generalError, setGeneralError] = useState<string | null>(null);


  // Rate limiting refs
  const rateLimitKeyRef = useRef(email || 'guest');


  // Google Auth
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });


  // ============================================
  // EFFECTS
  // ============================================


  /**
   * Handle Google sign-in response
   */
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleSignIn(id_token);
    } else if (response?.type === 'error') {
      setGeneralError('Google sign-in was cancelled.');
      setGoogleLoading(false);
    }
  }, [response]);


  /**
   * Load saved email on mount
   */
  useEffect(() => {
    loadSavedCredentials();
  }, []);


  /**
   * Clear errors when user starts typing
   */
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
      const isEnabled = await AsyncStorage.getItem('rememberMeEnabled');
      if (isEnabled === 'true') {
        const savedEmail = await AsyncStorage.getItem('rememberedEmail');
        if (savedEmail && isValidEmail(savedEmail)) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      }
    } catch (err) {
      console.error('Failed to load saved credentials:', err);
    }
  };


  const saveCredentials = async (emailToSave: string): Promise<void> => {
    try {
      if (rememberMe) {
        await AsyncStorage.setItem('rememberedEmail', emailToSave);
        await AsyncStorage.setItem('rememberMeEnabled', 'true');
      } else {
        await AsyncStorage.removeItem('rememberedEmail');
        await AsyncStorage.removeItem('rememberMeEnabled');
      }
    } catch (err) {
      console.error('Failed to save credentials:', err);
    }
  };


  const validateForm = (): boolean => {
    const newErrors: ValidationError = {};


    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Enter a valid email';
    }


    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be 6+ characters';
    }


    // Confirm password validation (signup only)
    if (mode === 'signup') {
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleSignIn = useCallback(async () => {
    if (!validateForm()) return;


    setGeneralError(null);


    // Check rate limiting
    const canAttempt = await checkRateLimit(`auth_attempts_${email}`);
    if (!canAttempt) {
      setGeneralError('Too many login attempts. Try again in 15 minutes.');
      return;
    }


    setLoading(true);
    rateLimitKeyRef.current = email;


    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      await saveCredentials(email);
      router.replace('/(tabs)');
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


    // Check rate limiting
    const canAttempt = await checkRateLimit(`signup_attempts_${email}`);
    if (!canAttempt) {
      setGeneralError('Too many signup attempts. Try again in 15 minutes.');
      return;
    }


    setLoading(true);


    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );


      // Send verification email
      await sendEmailVerification(userCredential.user, {
        url: `${process.env.EXPO_PUBLIC_APP_URL}/verify?email=${email}`,
        handleCodeInApp: true,
      });


      Alert.alert(
        'Account Created',
        'Please verify your email to continue. Check your inbox.',
        [{ text: 'OK', onPress: () => setMode('signin') }]
      );


      await saveCredentials(email);
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      await recordAuthAttempt(`signup_attempts_${email}`);
      setGeneralError(getSafeErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [email, password, confirmPassword, rememberMe]);


  const handleGoogleSignIn = async (idToken: string): Promise<void> => {
    setGeneralError(null);
    setGoogleLoading(true);


    try {
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      await saveCredentials(auth.currentUser?.email || '');
      router.replace('/(tabs)');
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
    setPassword('');
    setConfirmPassword('');
    Keyboard.dismiss();
  };


  const isSignIn = mode === 'signin';


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { minHeight: height },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>SmartNest</Text>
          <Text style={styles.tagline}>Secure Access to Your Smart Home</Text>
        </View>


        {/* Auth Card */}
        <View style={styles.card}>
          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, isSignIn && styles.tabActive]}
              onPress={() => switchMode('signin')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  isSignIn && styles.tabTextActive,
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, !isSignIn && styles.tabActive]}
              onPress={() => switchMode('signup')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  !isSignIn && styles.tabTextActive,
                ]}
              >
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>


          <Text style={styles.title}>
            {isSignIn ? 'Welcome Back' : 'Create Account'}
          </Text>


          {/* Email Input */}
          <View style={styles.formGroup}>
            <View
              style={[
                styles.inputContainer,
                errors.email && styles.inputError,
              ]}
            >
              <Ionicons
                name="mail"
                size={18}
                color={Colors.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading && !googleLoading}
                value={email}
                onChangeText={setEmail}
                placeholderTextColor="#999"
                autoComplete="email"
              />
            </View>
            {errors.email && (
              <Text style={styles.errorMessage}>{errors.email}</Text>
            )}
          </View>


          {/* Password Input */}
          <View style={styles.formGroup}>
            <View
              style={[
                styles.inputContainer,
                errors.password && styles.inputError,
              ]}
            >
              <Ionicons
                name="key"
                size={18}
                color={Colors.primary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry={!showPassword}
                editable={!loading && !googleLoading}
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="#999"
                autoComplete="password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading || googleLoading}
              >
                <Ionicons
                  name={showPassword ? 'eye' : 'eye-off'}
                  size={18}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.errorMessage}>{errors.password}</Text>
            )}
          </View>


          {/* Confirm Password (Signup Only) */}
          {!isSignIn && (
            <View style={styles.formGroup}>
              <View
                style={[
                  styles.inputContainer,
                  errors.confirmPassword && styles.inputError,
                ]}
              >
                <Ionicons
                  name="key"
                  size={18}
                  color={Colors.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm password"
                  secureTextEntry={!showPassword}
                  editable={!loading && !googleLoading}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholderTextColor="#999"
                  autoComplete="password"
                />
              </View>
              {errors.confirmPassword && (
                <Text style={styles.errorMessage}>{errors.confirmPassword}</Text>
              )}
            </View>
          )}


          {/* General Error Message */}
          {generalError && (
            <View style={styles.errorContainer}>
              <Ionicons
                name="alert-circle"
                size={16}
                color={Colors.error}
              />
              <Text style={styles.errorText}>{generalError}</Text>
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
                  rememberMe && styles.checkboxActive,
                ]}
              >
                {rememberMe && (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color="#FFF"
                  />
                )}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>
          )}


          {/* Main CTA Button */}
          <TouchableOpacity
            style={[
              styles.button,
              (loading || googleLoading) && styles.buttonDisabled,
            ]}
            onPress={isSignIn ? handleSignIn : handleSignUp}
            disabled={loading || googleLoading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons
                  name={isSignIn ? 'log-in' : 'person-add'}
                  size={18}
                  color="#FFF"
                  style={styles.buttonIcon}
                />
                <Text style={styles.buttonText}>
                  {isSignIn ? 'Sign In' : 'Create Account'}
                </Text>
              </>
            )}
          </TouchableOpacity>


          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>


          {/* Google Sign In Button */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              (googleLoading || loading || !request) && styles.buttonDisabled,
            ]}
            onPress={() => {
              setGoogleLoading(true);
              promptAsync();
            }}
            disabled={loading || !request || googleLoading}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator color={Colors.text} size="small" />
            ) : (
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            )}
          </TouchableOpacity>


          {/* Mode Toggle */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isSignIn
                ? "Don't have an account? "
                : 'Already have an account? '}
            </Text>
            <TouchableOpacity
              onPress={() => switchMode(isSignIn ? 'signup' : 'signin')}
              disabled={loading || googleLoading}
            >
              <Text style={styles.toggleLink}>
                {isSignIn ? 'Sign up' : 'Sign in'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>


        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
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
    backgroundColor: Colors.background,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
    transition: 'all 200ms ease-out',
  },
  tabActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFF',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  inputError: {
    borderColor: Colors.error,
    backgroundColor: `${Colors.error}08`,
  },
  inputIcon: {
    marginRight: 0,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  errorMessage: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 6,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.error}12`,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    flex: 1,
    fontWeight: '500',
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rememberText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 0,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  googleButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  toggleLink: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
});
