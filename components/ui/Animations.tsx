import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Pressable, Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Fade + Slide Up on mount ───────────────────────────────────────────────────
interface SlideInProps {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: object;
}
export function SlideUp({ children, delay = 0, distance = 30, style }: SlideInProps) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(delay),
        Animated.spring(translateY, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ─── Scale press effect wrapper ──────────────────────────────────────────────────
interface PressScaleProps {
  children: React.ReactNode;
  style?: object;
  onPress?: () => void;
  scale?: number;
  disabled?: boolean;
}
export function PressScale({ children, style, onPress, scale = 0.96, disabled }: PressScaleProps) {
  const s = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => Animated.spring(s, { toValue: scale, friction: 6, tension: 200, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(s, { toValue: 1, friction: 5, tension: 180, useNativeDriver: true }).start()}
    >
      <Animated.View style={[{ transform: [{ scale: s }] }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ─── Shimmer loading skeleton ───────────────────────────────────────────────────
interface ShimmerProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}
export function ShimmerBox({ width, height, borderRadius = 12, style }: ShimmerProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] });

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: '#EEEEF4', opacity }, style]}
    />
  );
}

// ─── Pulse animation (for "Generating…" state) ──────────────────────────────────
export function PulsingDot({ color = '#D35400', size = 12, delay = 0 }: {
  color?: string; size?: number; delay?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  const scale   = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.5, 1] });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1, 0.6] });

  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        { transform: [{ scale }], opacity },
      ]}
    />
  );
}

// ─── Three-dot generating indicator ─────────────────────────────────────────────
export function GeneratingDots({ color }: { color?: string }) {
  return (
    <View style={styles.dotsRow}>
      <PulsingDot color={color} delay={0} />
      <PulsingDot color={color} delay={180} />
      <PulsingDot color={color} delay={360} />
    </View>
  );
}

// ─── Staggered list item entrance ───────────────────────────────────────────────
export function StaggerItem({ children, index, style }: {
  children: React.ReactNode;
  index: number;
  style?: object;
}) {
  return (
    <SlideUp delay={index * 80} style={style}>
      {children}
    </SlideUp>
  );
}

// ─── Page entrance wrapper ───────────────────────────────────────────────────────
export function PageEntrance({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  return <Animated.View style={[{ flex: 1, opacity }]}>{children}</Animated.View>;
}

// ─── Confetti burst ──────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#E8651A', '#F5A623', '#43C97A', '#8B5CF6', '#C0392B', '#F9C15E'];
function ConfettiPiece({ index }: { index: number }) {
  const angle    = (index / 18) * Math.PI * 2 + (Math.random() - 0.5);
  const distance = 90 + Math.random() * 90;
  const tx = Math.cos(angle) * distance;
  const ty = Math.sin(angle) * distance - 40;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const size = 6 + Math.random() * 5;
  const spinDir = Math.random() > 0.5 ? 540 : -540;

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.timing(progress, {
        toValue: 1,
        duration: 850 + Math.random() * 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, index * 8);
  }, []);

  const opacity    = progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] });
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, tx] });
  // Approximate gravity with extra keyframes
  const translateY = progress.interpolate({
    inputRange:  [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, ty * 0.25 + 7.5, ty * 0.5 + 30, ty * 0.75 + 67.5, ty + 120],
  });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${spinDir}deg`] });
  const scale  = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1, 0.6] });

  return (
    <Animated.View
      style={[
        { position: 'absolute', width: size, height: size * 1.6, borderRadius: 2, backgroundColor: color },
        { opacity, transform: [{ translateX }, { translateY }, { rotate }, { scale }] },
      ]}
    />
  );
}
export function ConfettiBurst({ trigger }: { trigger: number }) {
  const pieces = Array.from({ length: 22 }, (_, i) => i);
  return (
    <View pointerEvents="none" style={styles.confettiWrap}>
      {pieces.map(i => <ConfettiPiece key={`${trigger}-${i}`} index={i} />)}
    </View>
  );
}

// ─── Slow-spinning compass ───────────────────────────────────────────────────────
export function SpinningCompass({ size = 96 }: { size?: number }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, { toValue: 360, duration: 7000, easing: Easing.linear, useNativeDriver: true }),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const spinDeg    = rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });
  const glowScale   = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  return (
    <View style={{ width: size * 1.8, height: size * 1.8, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[
        { position: 'absolute', width: size * 1.8, height: size * 1.8, borderRadius: size,
          backgroundColor: 'rgba(245,166,35,0.25)' },
        { opacity: glowOpacity, transform: [{ scale: glowScale }] },
      ]} />
      <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={[styles.compassRing, { width: size, height: size, borderRadius: size / 2 }]} />
          <View style={styles.compassNeedle} />
        </View>
      </Animated.View>
      <View style={styles.compassCenter} />
    </View>
  );
}

const styles = StyleSheet.create({
  confettiWrap: {
    position: 'absolute', top: '50%', left: '50%',
    width: 1, height: 1, alignItems: 'center', justifyContent: 'center',
  },
  compassRing: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
    borderTopColor: '#F5A623',
    borderRightColor: '#E8651A',
  },
  compassNeedle: {
    width: 3, height: '70%',
    backgroundColor: '#F9C15E',
    borderRadius: 2,
  },
  compassCenter: {
    position: 'absolute',
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#fff',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
