import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  StatusBar, Platform, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { SlideUp } from '../../components/ui/Animations';
import { Button } from '../../components/ui';

const { height: H } = Dimensions.get('window');

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
        Animated.timing(floatY, { toValue: -12, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0,   duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Golden Hour hero gradient */}
      <LinearGradient
        colors={Gradients.heroWelcome}
        locations={[0, 0.22, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient glow at bottom */}
      <LinearGradient
        colors={['transparent', Colors.duskGlow, 'rgba(232,101,26,0.45)']}
        style={styles.glowLayer}
      />

      {/* Floating decorative orbs */}
      <Animated.View style={[styles.orb1, { transform: [{ translateY: floatY }] }]}>
        <View style={styles.orbInner1} />
      </Animated.View>
      <Animated.View style={[styles.orb2, { transform: [{ translateY: floatY }] }]}>
        <View style={styles.orbInner2} />
      </Animated.View>

      {/* Overlay content */}
      <View style={styles.overlay}>
        <LinearGradient
          colors={['transparent', 'rgba(12,5,32,0.72)', 'rgba(12,5,32,0.97)']}
          locations={[0, 0.3, 0.62]}
          style={StyleSheet.absoluteFill}
        />

        {/* Logo + branding */}
        <Animated.View style={[styles.logoArea, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.logoMark}
          >
            <Text style={styles.logoIcon}>🌍</Text>
          </LinearGradient>
          <Text style={styles.appName}>FamilyQuest</Text>
          <Text style={styles.tagline}>
            Your family's perfect trip,{'\n'}built in seconds.
          </Text>
        </Animated.View>

        {/* Feature pills */}
        <SlideUp delay={600}>
          <View style={styles.featurePills}>
            {['🧒 Kid-aware', '♿ Accessible', '🍽️ Dining included', '📄 PDF export'].map((f, i) => (
              <View key={i} style={styles.featurePill}>
                <Text style={styles.featurePillText}>{f}</Text>
              </View>
            ))}
          </View>
        </SlideUp>

        {/* Auth buttons */}
        <SlideUp delay={800}>
          <View style={styles.authButtons}>
            <TouchableOpacity
              onPress={() => router.push('/auth/login')}
              style={styles.googleButton}
              activeOpacity={0.88}
            >
              <View style={styles.gIcon}><Text style={styles.gIconText}>G</Text></View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <Button
              label="Continue with Email"
              onPress={() => router.push('/auth/login')}
              variant="outline"
              style={styles.emailButton}
              textStyle={{ color: '#fff', fontFamily: Typography.bold }}
            />

            <TouchableOpacity
              onPress={() => router.push('/(tabs)')}
              style={styles.guestButton}
              activeOpacity={0.7}
            >
              <Text style={styles.guestText}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>
        </SlideUp>

        <SlideUp delay={1000}>
          <Text style={styles.legalText}>
            By continuing you agree to our Terms of Service and Privacy Policy.
          </Text>
        </SlideUp>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dusk },
  glowLayer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: H * 0.5,
  },
  orb1: {
    position: 'absolute',
    top: H * 0.08, left: -60,
  },
  orbInner1: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(61,31,110,0.45)',
  },
  orb2: {
    position: 'absolute',
    top: H * 0.2, right: -40,
  },
  orbInner2: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(123,63,0,0.35)',
  },
  overlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: H * 0.80,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['3xl'],
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoMark: {
    width: 72, height: 72,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadow.glow,
  },
  logoIcon: { fontSize: 32 },
  appName: {
    fontSize: Typography['3xl'],
    fontFamily: Typography.black,
    color: '#fff',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: Typography.md,
    fontFamily: Typography.regular,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 24,
  },
  featurePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  featurePill: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.35)',
    backgroundColor: 'rgba(245,166,35,0.12)',
  },
  featurePillText: {
    fontSize: Typography.sm,
    fontFamily: Typography.semiBold,
    color: Colors.gold,
  },
  authButtons: { gap: Spacing.sm, marginBottom: Spacing.md },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
    backgroundColor: '#fff',
    borderRadius: Radius.full,
    ...Shadow.medium,
  },
  gIcon: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center', justifyContent: 'center',
  },
  gIconText: { fontSize: 13, fontFamily: Typography.black, color: '#fff' },
  googleButtonText: {
    fontSize: Typography.md,
    fontFamily: Typography.bold,
    color: Colors.textDark,
  },
  emailButton: {
    borderColor: 'rgba(255,255,255,0.28)',
  },
  guestButton: { alignItems: 'center', paddingVertical: 14 },
  guestText: {
    fontSize: Typography.base,
    fontFamily: Typography.semiBold,
    color: 'rgba(255,255,255,0.38)',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(255,255,255,0.2)',
  },
  legalText: {
    fontSize: Typography.xs,
    fontFamily: Typography.regular,
    color: 'rgba(255,255,255,0.22)',
    textAlign: 'center',
    lineHeight: 17,
  },
});
