import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  StatusBar, Platform, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Typography, Spacing, Radius, Shadow } from '../../constants/theme';

const { height: H, width: W } = Dimensions.get('window');

export default function WelcomeScreen() {
  const logoScale   = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const floatY      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.delay(300),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -10, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0,   duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Background gradient — deep purple to vibrant blue-purple */}
      <LinearGradient
        colors={['#0A0118', '#1A0B3E', '#2D1B69', '#4A2B8F', '#6C3FC0']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating orbs */}
      <Animated.View style={[styles.orb1, { transform: [{ translateY: floatY }] }]}>
        <View style={styles.orbInner1} />
      </Animated.View>
      <Animated.View style={[styles.orb2, { transform: [{ translateY: floatY }] }]}>
        <View style={styles.orbInner2} />
      </Animated.View>

      {/* Content — flexbox layout, no absolute overlay */}
      <View style={styles.content}>
        {/* Top spacer */}
        <View style={{ flex: 1 }} />

        {/* Logo + branding */}
        <Animated.View style={[styles.logoArea, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <View style={styles.logoMark}>
            <Text style={styles.logoIcon}>🧭</Text>
          </View>
          <Text style={styles.appName}>Roamly</Text>
          <Text style={styles.tagline}>Your trip, perfectly mapped.</Text>
          <Text style={styles.subtitle}>AI-powered itineraries in seconds</Text>
        </Animated.View>

        {/* Social proof */}
        <Text style={styles.socialProof}>Trusted by 10,000+ travelers worldwide</Text>

        {/* Spacer */}
        <View style={{ flex: 0.5 }} />

        {/* Auth buttons */}
        <View style={styles.authButtons}>
          <TouchableOpacity
            onPress={() => router.push('/auth/login')}
            style={styles.googleButton}
            activeOpacity={0.88}
          >
            <View style={styles.gIcon}><Text style={styles.gIconText}>G</Text></View>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/auth/login')}
            style={styles.emailButton}
            activeOpacity={0.88}
          >
            <Text style={styles.emailButtonText}>Continue with Email</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)')}
            style={styles.guestButton}
            activeOpacity={0.7}
          >
            <Text style={styles.guestText}>Skip — explore as guest</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.legalText}>
          By continuing you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0118' },
  orb1: { position: 'absolute', top: H * 0.06, left: -50 },
  orbInner1: { width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(108,63,192,0.35)' },
  orb2: { position: 'absolute', top: H * 0.22, right: -30 },
  orbInner2: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(240,90,40,0.20)' },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  logoArea: { alignItems: 'center', marginBottom: Spacing.md },
  logoMark: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(240,90,40,0.15)',
    borderWidth: 2, borderColor: 'rgba(240,90,40,0.40)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoIcon: { fontSize: 38 },
  appName: {
    fontSize: 42, fontFamily: Typography.black,
    color: '#FFFFFF', letterSpacing: 1,
  },
  tagline: {
    fontSize: 18, fontFamily: Typography.semiBold,
    color: '#FFFFFF', textAlign: 'center',
    marginTop: 8, lineHeight: 26,
  },
  subtitle: {
    fontSize: 14, fontFamily: Typography.regular,
    color: 'rgba(255,255,255,0.60)', textAlign: 'center',
    marginTop: 6,
  },
  socialProof: {
    fontSize: 12, fontFamily: Typography.semiBold,
    color: 'rgba(255,255,255,0.40)', textAlign: 'center',
    marginTop: Spacing.md, letterSpacing: 0.5,
  },
  authButtons: { gap: 12, marginBottom: Spacing.md },
  googleButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 56, backgroundColor: '#FFFFFF',
    borderRadius: Radius.full, ...Shadow.medium,
  },
  gIcon: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center', justifyContent: 'center',
  },
  gIconText: { fontSize: 14, fontFamily: Typography.black, color: '#fff' },
  googleButtonText: { fontSize: 16, fontFamily: Typography.bold, color: '#1C1C2E' },
  emailButton: {
    height: 56, alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.30)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  emailButtonText: { fontSize: 16, fontFamily: Typography.bold, color: '#FFFFFF' },
  guestButton: { alignItems: 'center', paddingVertical: 16 },
  guestText: {
    fontSize: 15, fontFamily: Typography.semiBold,
    color: 'rgba(255,255,255,0.70)',
  },
  legalText: {
    fontSize: 11, fontFamily: Typography.regular,
    color: 'rgba(255,255,255,0.25)', textAlign: 'center',
    lineHeight: 16,
  },
});
