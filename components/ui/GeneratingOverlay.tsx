import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Typography, Spacing } from '../../constants/theme';
import { SpinningCompass } from './Animations';

const { height: H } = Dimensions.get('window');

function buildMessages(opts: {
  destination: string;
  kids: number;
  accessibility: string[];
  includeDining: boolean;
}): string[] {
  const { destination, kids, accessibility, includeDining } = opts;
  const dest = destination.trim() || 'your destination';

  const messages = [
    `Researching the best of ${dest}…`,
    `Mapping neighborhoods so you never backtrack…`,
  ];

  if (kids > 0) messages.push(`Pacing each day for little explorers…`);
  if (accessibility.length > 0) messages.push(`Checking accessibility at every stop…`);
  if (includeDining) messages.push(`Finding family-friendly tables nearby…`);

  messages.push(
    `Curating insider tips locals love…`,
    `Putting together your perfect itinerary…`,
  );

  return messages;
}

interface Props {
  visible: boolean;
  destination: string;
  kids: number;
  accessibility: string[];
  includeDining: boolean;
}

export function GeneratingOverlay({ visible, destination, kids, accessibility, includeDining }: Props) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [rendered, setRendered] = useState(visible);
  const messages  = useRef(buildMessages({ destination, kids, accessibility, includeDining })).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const msgOpacity = useRef(new Animated.Value(1)).current;

  // Fade the overlay in/out
  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        setRendered(false);
        setMsgIndex(0);
      });
    }
  }, [visible]);

  // Cycle through messages with a cross-fade
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      Animated.timing(msgOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setMsgIndex(i => (i + 1) % messages.length);
        Animated.timing(msgOpacity, { toValue: 1, duration: 380, useNativeDriver: true }).start();
      });
    }, 2400);
    return () => clearInterval(interval);
  }, [visible]);

  if (!rendered) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
      <View style={styles.container}>
        <LinearGradient
          colors={Gradients.heroWelcome}
          locations={[0, 0.22, 0.5, 0.75, 1]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['transparent', 'rgba(232,101,26,0.30)', 'rgba(232,101,26,0.55)']}
          style={styles.glow}
        />

        <View style={styles.content}>
          <SpinningCompass size={88} />

          <Text style={styles.title}>Crafting your adventure</Text>

          <Animated.View style={{ opacity: msgOpacity }}>
            <Text style={styles.message}>{messages[msgIndex]}</Text>
          </Animated.View>

          <View style={styles.progressTrack}>
            {messages.map((_, i) => (
              <View
                key={i}
                style={[styles.progressDot, i === msgIndex && styles.progressDotActive]}
              />
            ))}
          </View>

          <Text style={styles.hint}>This usually takes 20–40 seconds ✨</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dusk },
  glow: { position: 'absolute', bottom: 0, left: 0, right: 0, height: H * 0.5 },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl, gap: Spacing.lg,
  },
  title: {
    fontSize: Typography['2xl'], fontFamily: Typography.black,
    color: '#fff', textAlign: 'center', letterSpacing: -0.4,
  },
  message: {
    fontSize: Typography.base, fontFamily: Typography.semiBold,
    color: Colors.gold, textAlign: 'center', minHeight: 24,
  },
  progressTrack: { flexDirection: 'row', gap: 8 },
  progressDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  progressDotActive: {
    backgroundColor: Colors.gold,
    width: 22,
  },
  hint: {
    fontSize: Typography.sm, fontFamily: Typography.regular,
    color: 'rgba(255,255,255,0.40)', textAlign: 'center',
    position: 'absolute', bottom: -Spacing['3xl'],
  },
});
