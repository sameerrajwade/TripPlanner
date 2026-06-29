import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { useSubscriptionStore } from '../../store';

const FEATURES = [
  'Unlimited PDF exports',
  'Unlimited regenerations',
  'Weather & indoor alternatives',
  'Unlimited saved trips',
];

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ visible, onClose }: UpgradeModalProps) {
  const { setPremium } = useSubscriptionStore();

  const handlePurchase = (plan: 'monthly' | 'yearly') => {
    setPremium(plan);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.badge}>PRO</Text>
              <Text style={styles.title}>Upgrade to Roamly Pro</Text>
              <Text style={styles.subtitle}>Unlock the full travel planning experience</Text>
            </View>

            {/* Features */}
            <View style={styles.features}>
              {FEATURES.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Text style={styles.featureCheck}>✓</Text>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            {/* Plan cards */}
            <View style={styles.plans}>
              {/* Monthly */}
              <TouchableOpacity
                style={styles.planCard}
                activeOpacity={0.85}
                onPress={() => handlePurchase('monthly')}
              >
                <Text style={styles.planName}>Monthly</Text>
                <Text style={styles.planPrice}>$2.99</Text>
                <Text style={styles.planPer}>/month</Text>
              </TouchableOpacity>

              {/* Yearly */}
              <TouchableOpacity
                style={[styles.planCard, styles.planCardHighlight]}
                activeOpacity={0.85}
                onPress={() => handlePurchase('yearly')}
              >
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>SAVE 44%</Text>
                </View>
                <Text style={[styles.planName, { color: '#fff' }]}>Yearly</Text>
                <Text style={[styles.planPrice, { color: '#fff' }]}>$19.99</Text>
                <Text style={[styles.planPer, { color: 'rgba(255,255,255,0.7)' }]}>/year</Text>
              </TouchableOpacity>
            </View>

            {/* Restore */}
            <TouchableOpacity style={styles.restoreBtn} onPress={onClose}>
              <Text style={styles.restoreText}>Restore Purchase</Text>
            </TouchableOpacity>

            {/* Close */}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>Not now</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  header: { alignItems: 'center', marginBottom: Spacing.lg },
  badge: {
    fontSize: Typography.xs, fontFamily: Typography.black, color: '#fff',
    backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: Radius.full, overflow: 'hidden', letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.xl, fontFamily: Typography.extraBold,
    color: Colors.textDark, textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sm, fontFamily: Typography.regular,
    color: Colors.textMid, textAlign: 'center', marginTop: 4,
  },
  features: { marginBottom: Spacing.lg },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8,
  },
  featureCheck: {
    fontSize: Typography.base, fontFamily: Typography.bold,
    color: Colors.success, width: 24, textAlign: 'center',
  },
  featureText: {
    fontSize: Typography.base, fontFamily: Typography.semiBold,
    color: Colors.textDark, flex: 1,
  },
  plans: {
    flexDirection: 'row', gap: 12, marginBottom: Spacing.lg,
  },
  planCard: {
    flex: 1, alignItems: 'center',
    backgroundColor: Colors.cream, borderRadius: Radius.lg,
    padding: Spacing.md, paddingVertical: Spacing.lg,
    borderWidth: 1.5, borderColor: 'rgba(232,101,26,0.20)',
    ...Shadow.soft,
  },
  planCardHighlight: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
    ...Shadow.glow,
  },
  saveBadge: {
    position: 'absolute', top: -10,
    backgroundColor: Colors.gold, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: Radius.full,
  },
  saveBadgeText: {
    fontSize: 10, fontFamily: Typography.black, color: '#fff', letterSpacing: 0.5,
  },
  planName: {
    fontSize: Typography.sm, fontFamily: Typography.bold,
    color: Colors.textDark, marginBottom: 4,
  },
  planPrice: {
    fontSize: Typography['2xl'], fontFamily: Typography.black,
    color: Colors.primary,
  },
  planPer: {
    fontSize: Typography.xs, fontFamily: Typography.regular,
    color: Colors.textLight, marginTop: 2,
  },
  restoreBtn: { alignItems: 'center', marginBottom: Spacing.sm },
  restoreText: {
    fontSize: Typography.sm, fontFamily: Typography.semiBold,
    color: Colors.textLight, textDecorationLine: 'underline',
  },
  closeBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  closeText: {
    fontSize: Typography.base, fontFamily: Typography.semiBold,
    color: Colors.textMid,
  },
});
