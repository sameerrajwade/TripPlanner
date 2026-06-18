import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { Button, GlassCard } from '../../components/ui';
import { SlideUp } from '../../components/ui/Animations';
import { useAuthStore } from '../../store';
import {
  signInWithEmail, registerWithEmail,
  sendPasswordReset, getAuthErrorMessage,
  signInWithGoogle, isGoogleSignInCancelled,
} from '../../lib/auth';

export default function LoginScreen() {
  const { setUser } = useAuthStore();

  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setGoogleLoading(true);
    try {
      const user = await signInWithGoogle();
      setUser(user);
      router.replace('/(tabs)');
    } catch (err: any) {
      if (!isGoogleSignInCancelled(err)) {
        setErrorMsg(getAuthErrorMessage(err) ?? 'Google Sign-In failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!email.trim() || !password) return;
    setErrorMsg(null);
    setLoading(true);

    try {
      let user;
      if (isRegister) {
        user = await registerWithEmail(email, password, name);
      } else {
        user = await signInWithEmail(email, password);
      }
      setUser(user);
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMsg(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMsg('Enter your email above, then tap Forgot password.');
      return;
    }
    try {
      await sendPasswordReset(email);
      Alert.alert(
        'Email sent',
        `Password reset instructions sent to ${email}`,
        [{ text: 'OK' }],
      );
    } catch (err: any) {
      setErrorMsg(getAuthErrorMessage(err));
    }
  };

  const canSubmit = email.trim().length > 3 && password.length >= 6;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient
        colors={Gradients.heroWelcome}
        locations={[0, 0.22, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Ambient glow */}
      <LinearGradient
        colors={['transparent', 'rgba(232,101,26,0.25)']}
        style={styles.glow}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <SlideUp delay={100}>
            <Text style={styles.heading}>{isRegister ? 'Create account' : 'Welcome back'}</Text>
            <Text style={styles.subheading}>
              {isRegister
                ? 'Start planning your family adventures.'
                : 'Sign in to access your saved trips.'}
            </Text>
          </SlideUp>

          <SlideUp delay={250}>
            <GlassCard dark style={styles.form}>
              {isRegister && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Your name"
                    placeholderTextColor="rgba(255,255,255,0.28)"
                    autoCapitalize="words"
                    value={name}
                    onChangeText={setName}
                    returnKeyType="next"
                  />
                </View>
              )}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="hello@example.com"
                  placeholderTextColor="rgba(255,255,255,0.28)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={t => { setEmail(t); setErrorMsg(null); }}
                  returnKeyType="next"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder={isRegister ? 'At least 6 characters' : '••••••••'}
                  placeholderTextColor="rgba(255,255,255,0.28)"
                  secureTextEntry
                  value={password}
                  onChangeText={t => { setPassword(t); setErrorMsg(null); }}
                  returnKeyType="done"
                  onSubmitEditing={handleAuth}
                />
              </View>

              {errorMsg && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️  {errorMsg}</Text>
                </View>
              )}

              {!isRegister && (
                <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              <Button
                label={isRegister ? 'Create Account' : 'Sign In'}
                onPress={handleAuth}
                loading={loading}
                disabled={!canSubmit}
                style={{ marginTop: Spacing.md }}
              />
            </GlassCard>
          </SlideUp>

          <SlideUp delay={400}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In */}
            <TouchableOpacity
              style={styles.googleBtn}
              activeOpacity={0.85}
              disabled={googleLoading}
              onPress={handleGoogleSignIn}
            >
              <View style={styles.gIcon}><Text style={styles.gIconText}>G</Text></View>
              <Text style={styles.googleText}>
                {googleLoading ? 'Signing in…' : 'Continue with Google'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setIsRegister(!isRegister); setErrorMsg(null); }}
              style={styles.switchBtn}
            >
              <Text style={styles.switchText}>
                {isRegister ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={{ color: Colors.gold, fontFamily: Typography.bold }}>
                  {isRegister ? 'Sign in' : 'Sign up'}
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Guest option */}
            <TouchableOpacity
              style={styles.guestBtn}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.guestText}>Continue as Guest</Text>
            </TouchableOpacity>
          </SlideUp>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 40,
  },
  backBtn:    { marginBottom: Spacing.xl },
  backText:   { color: 'rgba(255,255,255,0.55)', fontFamily: Typography.semiBold, fontSize: Typography.base },
  heading: {
    fontSize: Typography['3xl'], fontFamily: Typography.black,
    color: '#fff', marginBottom: 6,
  },
  subheading: {
    fontSize: Typography.base, fontFamily: Typography.regular,
    color: 'rgba(255,255,255,0.50)', marginBottom: Spacing.xl,
  },
  form:       { padding: Spacing.lg, marginBottom: Spacing.lg },
  inputGroup: { marginBottom: Spacing.md },
  label: {
    fontSize: Typography.xs, fontFamily: Typography.semiBold,
    color: 'rgba(255,255,255,0.55)', marginBottom: 8,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  input: {
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    color: '#fff',
    fontFamily: Typography.regular,
    fontSize: Typography.base,
    borderWidth: 1,
    borderColor: 'rgba(232,101,26,0.20)',
  },
  errorBox: {
    backgroundColor: 'rgba(231,76,60,0.15)',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(231,76,60,0.30)',
  },
  errorText: {
    color: '#FF8A80',
    fontFamily: Typography.semiBold,
    fontSize: Typography.sm,
    lineHeight: 18,
  },
  forgotBtn:  { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { color: Colors.gold, fontFamily: Typography.semiBold, fontSize: Typography.sm },
  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  dividerText: {
    color: 'rgba(255,255,255,0.35)', fontFamily: Typography.regular,
    fontSize: Typography.sm, marginHorizontal: Spacing.md,
  },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 54,
    backgroundColor: '#fff',
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
    ...Shadow.medium,
  },
  gIcon: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center', justifyContent: 'center',
  },
  gIconText:  { fontSize: 13, fontFamily: Typography.black, color: '#fff' },
  googleText: { fontSize: Typography.md, fontFamily: Typography.bold, color: Colors.textDark },
  switchBtn:  { alignItems: 'center', paddingVertical: 8, marginBottom: Spacing.sm },
  switchText: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: Typography.regular,
    fontSize: Typography.base,
  },
  guestBtn: { alignItems: 'center', paddingVertical: 10 },
  guestText: {
    color: 'rgba(255,255,255,0.28)',
    fontFamily: Typography.semiBold,
    fontSize: Typography.sm,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(255,255,255,0.15)',
  },
});
