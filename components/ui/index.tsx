import React from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, Typography, Radius, Shadow, Spacing } from '../../constants/theme';

// ─── Glass Card ────────────────────────────────────────────────────────────────
interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  dark?: boolean;
}
export function GlassCard({ children, style, intensity = 40, dark = false }: GlassCardProps) {
  return (
    <BlurView
      intensity={intensity}
      tint={dark ? 'dark' : 'light'}
      style={[styles.glassCard, dark && styles.glassCardDark, style]}
    >
      {children}
    </BlurView>
  );
}

// ─── Primary Button ─────────────────────────────────────────────────────────────
interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}
export function Button({
  label, onPress, loading, disabled, variant = 'primary', style, textStyle, icon,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
      style={[
        styles.button,
        isPrimary && styles.buttonPrimary,
        isOutline && styles.buttonOutline,
        variant === 'ghost' && styles.buttonGhost,
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : Colors.primary} size="small" />
      ) : (
        <>
          {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
          <Text style={[
            styles.buttonText,
            isPrimary && styles.buttonTextPrimary,
            isOutline && styles.buttonTextOutline,
            variant === 'ghost' && styles.buttonTextGhost,
            textStyle,
          ]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Chip / Pill ────────────────────────────────────────────────────────────────
interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: string;
}
export function Chip({ label, selected, onPress, icon }: ChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon && <Text style={styles.chipIcon}>{icon}</Text>}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  light?: boolean;
  style?: ViewStyle;
}
export function SectionHeader({ title, subtitle, light, style }: SectionHeaderProps) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={[styles.sectionTitle, light && { color: Colors.textOnDark }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.sectionSubtitle, light && { color: 'rgba(255,255,255,0.55)' }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

// ─── Divider ────────────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  glassCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glassLight,
    ...Shadow.soft,
  },
  glassCardDark: {
    borderColor: Colors.glassBorderDark,
    backgroundColor: Colors.glassDark,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    minHeight: 54,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
    ...Shadow.glow,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: Typography.md,
    fontFamily: Typography.bold,
    letterSpacing: 0.3,
  },
  buttonTextPrimary: { color: '#fff' },
  buttonTextOutline: { color: Colors.primary },
  buttonTextGhost:   { color: Colors.textDark },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(232,101,26,0.32)',
    backgroundColor: 'rgba(232,101,26,0.07)',
    margin: 4,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...Shadow.glow,
  },
  chipIcon: { fontSize: 15, marginRight: 6 },
  chipText: {
    fontSize: Typography.sm,
    fontFamily: Typography.semiBold,
    color: Colors.textMid,
  },
  chipTextSelected: { color: '#fff' },
  sectionHeader: { marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: Typography.xl,
    fontFamily: Typography.extraBold,
    color: Colors.textDark,
  },
  sectionSubtitle: {
    fontSize: Typography.sm,
    fontFamily: Typography.regular,
    color: Colors.textMid,
    marginTop: 3,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(232,101,26,0.10)',
    marginVertical: Spacing.md,
  },
});
