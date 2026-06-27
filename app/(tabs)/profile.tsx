import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Platform, StatusBar,
  TouchableOpacity, Alert, ScrollView, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import auth from '@react-native-firebase/auth';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { GlassCard } from '../../components/ui';
import { SlideUp } from '../../components/ui/Animations';
import { useAuthStore, useTripStore } from '../../store';
import { signOutUser } from '../../lib/auth';

export default function ProfileScreen() {
  const { user, setUser } = useAuthStore();
  const { savedTrips }    = useTripStore();
  const [signingOut, setSigningOut]     = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const handleDeactivate = () => {
    Alert.alert(
      'Deactivate account?',
      'This permanently deletes your account and all saved trips. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete my account',
          style: 'destructive',
          onPress: async () => {
            setDeactivating(true);
            try {
              await auth().currentUser?.delete();
              setUser(null);
              router.replace('/auth/welcome');
            } catch (err: any) {
              // Firebase requires recent sign-in for deletion
              if (err?.code === 'auth/requires-recent-login') {
                Alert.alert(
                  'Sign in again to confirm',
                  'For security, please sign out and sign back in before deleting your account.',
                );
              } else {
                Alert.alert('Error', 'Could not delete account. Please try again.');
              }
            } finally {
              setDeactivating(false);
            }
          },
        },
      ],
    );
  };

  const MENU_ITEMS = [
    {
      icon: '🔔', label: 'Notifications',
      onPress: () => Linking.openSettings(),
    },
    {
      icon: '💬', label: 'Send feedback',
      onPress: () => Linking.openURL('mailto:support@familyquest.app?subject=FamilyQuest%20Feedback'),
    },
    {
      icon: '⭐', label: 'Rate FamilyQuest',
      onPress: () => Linking.openURL('https://play.google.com/store/apps/details?id=com.familyquest.app'),
    },
    {
      icon: '📋', label: 'Terms & Privacy',
      onPress: () => Linking.openURL('https://familyquest.app/privacy'),
    },
  ];

  const handleSignOut = () => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await signOutUser();
            } catch (_) {}
            setUser(null);
            setSigningOut(false);
            router.replace('/auth/welcome');
          },
        },
      ],
    );
  };

  // Get initials for avatar from display name or email
  const getInitials = (): string => {
    if (user?.displayName) {
      const parts = user.displayName.trim().split(' ');
      return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
    }
    if (user?.email) return user.email.slice(0, 2).toUpperCase();
    return '👤';
  };

  const isLoggedIn = !!user && !user.isGuest;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.cream} />
      <LinearGradient colors={Gradients.headerLight} style={styles.header}>
        <SlideUp><Text style={styles.title}>Profile</Text></SlideUp>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar card */}
        <SlideUp delay={100}>
          <GlassCard style={styles.avatarCard}>
            <View style={[
              styles.avatarCircle,
              isLoggedIn && { backgroundColor: Colors.primary },
            ]}>
              {isLoggedIn ? (
                <Text style={styles.avatarInitials}>{getInitials()}</Text>
              ) : (
                <Text style={styles.avatarEmoji}>🧭</Text>
              )}
            </View>

            <Text style={styles.userName}>
              {user?.displayName ?? (isLoggedIn ? 'Traveller' : 'Guest Explorer')}
            </Text>
            <Text style={styles.userEmail}>
              {user?.email ?? 'Not signed in'}
            </Text>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{savedTrips.length}</Text>
                <Text style={styles.statLabel}>Saved trips</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statNum}>
                  {savedTrips.reduce((sum, t) => sum + t.days.length, 0)}
                </Text>
                <Text style={styles.statLabel}>Days planned</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statNum}>
                  {new Set(savedTrips.map(t => t.destination.split(',')[0])).size}
                </Text>
                <Text style={styles.statLabel}>Destinations</Text>
              </View>
            </View>

            {isLoggedIn ? (
              <View style={{ width: '100%', gap: 10 }}>
                <TouchableOpacity
                  onPress={handleSignOut}
                  style={styles.signOutBtn}
                  disabled={signingOut}
                >
                  <Text style={styles.signOutText}>
                    {signingOut ? 'Signing out…' : 'Sign Out'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeactivate}
                  style={styles.deactivateBtn}
                  disabled={deactivating}
                >
                  <Text style={styles.deactivateText}>
                    {deactivating ? 'Deleting…' : 'Deactivate Account'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => router.push('/auth/login')}
                style={styles.signInBtn}
              >
                <LinearGradient
                  colors={Gradients.primaryCTA}
                  style={styles.signInGradient}
                >
                  <Text style={styles.signInText}>Sign In to Save Trips</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </GlassCard>
        </SlideUp>

        {/* Menu */}
        <SlideUp delay={200}>
          <GlassCard style={styles.menuCard}>
            {MENU_ITEMS.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.menuRow, i < MENU_ITEMS.length - 1 && styles.menuBorder]}
                activeOpacity={0.7}
                onPress={item.onPress}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </GlassCard>
        </SlideUp>

        <SlideUp delay={300}>
          <Text style={styles.version}>FamilyQuest v1.0.0</Text>
        </SlideUp>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header:  {
    paddingTop: Platform.OS === 'ios' ? 58 : 40,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  title:   { fontSize: Typography['3xl'], fontFamily: Typography.black, color: Colors.textDark },
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },

  avatarCard:     { padding: Spacing.lg, alignItems: 'center', backgroundColor: Colors.surface },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.creamDark,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md, ...Shadow.soft,
  },
  avatarEmoji:    { fontSize: 36 },
  avatarInitials: { fontSize: 28, fontFamily: Typography.black, color: '#fff' },
  userName:  { fontSize: Typography.xl, fontFamily: Typography.extraBold, color: Colors.textDark },
  userEmail: { fontSize: Typography.sm, fontFamily: Typography.regular, color: Colors.textLight, marginTop: 4, marginBottom: Spacing.lg },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.creamDark,
    borderRadius: Radius.lg, paddingVertical: Spacing.md,
    width: '100%', marginBottom: Spacing.lg,
  },
  stat:      { flex: 1, alignItems: 'center' },
  statNum:   { fontSize: Typography.xl, fontFamily: Typography.black, color: Colors.primary },
  statLabel: { fontSize: Typography.xs, fontFamily: Typography.regular, color: Colors.textLight, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(232,101,26,0.15)' },

  signInBtn:      { width: '100%', borderRadius: Radius.full, overflow: 'hidden', ...Shadow.glow },
  signInGradient: { paddingVertical: 14, alignItems: 'center' },
  signInText:     { color: '#fff', fontFamily: Typography.bold, fontSize: Typography.base },
  signOutBtn: {
    paddingVertical: 10, paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(231,76,60,0.35)',
    backgroundColor: 'rgba(231,76,60,0.06)',
  },
  signOutText: { color: Colors.danger, fontFamily: Typography.semiBold, fontSize: Typography.base },
  deactivateBtn: {
    paddingVertical: 10, paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full, alignSelf: 'center',
  },
  deactivateText: { color: Colors.textLight, fontFamily: Typography.regular, fontSize: Typography.sm, textDecorationLine: 'underline' },

  menuCard:   { padding: 4, backgroundColor: Colors.surface },
  menuRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.md, gap: 14 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(232,101,26,0.07)' },
  menuIcon:   { fontSize: 20 },
  menuLabel:  { flex: 1, fontSize: Typography.base, fontFamily: Typography.semiBold, color: Colors.textDark },
  menuArrow:  { fontSize: Typography.lg, color: Colors.textLight, fontFamily: Typography.regular },

  version:    { textAlign: 'center', fontSize: Typography.xs, fontFamily: Typography.regular, color: Colors.textLight },
});
