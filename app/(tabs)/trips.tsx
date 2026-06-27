import React from 'react';
import {
  View, Text, StyleSheet, Platform, StatusBar,
  ScrollView, TouchableOpacity, Alert, TextInput, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { SlideUp, StaggerItem } from '../../components/ui/Animations';
import { Button } from '../../components/ui';
import { useTripStore, useAuthStore } from '../../store';
import { Itinerary } from '../../types';

// ─── Vibe → emoji map ─────────────────────────────────────────────────────────
const VIBE_EMOJI: Record<string, string> = {
  'Kid-Friendly': '🧒', 'Foodie': '🍽️', 'Hiking': '🥾', 'Beach': '🏖️',
  'Museums': '🏛️', 'Adventure': '🎢', 'Nature': '🌲', 'History': '🏰',
  'Shopping': '🛍️', 'Relaxation': '🧘', 'Photography': '📸', 'Nightlife': '🌃',
};

// ─── Trip card colours — cycling through 4 palettes ──────────────────────────
const CARD_PALETTES = [
  { from: '#E8651A', to: '#C4501A', text: '#fff' },
  { from: '#3D1F6E', to: '#1C1035', text: '#fff' },
  { from: '#7B3F00', to: '#4A2500', text: '#fff' },
  { from: '#8B5CF6', to: '#6D28D9', text: '#fff' },
];

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Individual Trip Card ─────────────────────────────────────────────────────
function TripCard({
  trip, index, onView, onDelete, onShare,
}: {
  trip: Itinerary;
  index: number;
  onView: () => void;
  onDelete: () => void;
  onShare: () => void;
}) {
  const palette = CARD_PALETTES[index % CARD_PALETTES.length];
  const { destination, days, tripInput, generatedAt } = trip;
  const dateRange = `${formatShortDate(tripInput.startDate)} – ${formatDate(tripInput.endDate)}`;
  const groupDesc = `${tripInput.adults} adult${tripInput.adults !== 1 ? 's' : ''}${tripInput.kids > 0 ? ` · ${tripInput.kids} kid${tripInput.kids !== 1 ? 's' : ''}` : ''}`;
  const activityCount = days.reduce((sum, d) => sum + d.activities.length, 0);
  const topVibes = tripInput.vibes.slice(0, 4);

  return (
    <TouchableOpacity onPress={onView} activeOpacity={0.88} style={styles.card}>
      {/* Coloured header */}
      <LinearGradient
        colors={[palette.from, palette.to]}
        style={styles.cardHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative orb */}
        <View style={styles.cardOrb} />

        <View style={styles.cardHeaderContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardDest}>{destination}</Text>
            <Text style={styles.cardDates}>{dateRange}</Text>
          </View>
          <View style={styles.cardDayBadge}>
            <Text style={styles.cardDayNum}>{days.length}</Text>
            <Text style={styles.cardDayLabel}>days</Text>
          </View>
        </View>

        {/* Vibe pills */}
        <View style={styles.cardPills}>
          {topVibes.map(v => (
            <View key={v} style={styles.cardPill}>
              <Text style={styles.cardPillText}>{VIBE_EMOJI[v] ?? '✨'} {v}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Card body */}
      <View style={styles.cardBody}>
        <View style={styles.cardStats}>
          <View style={styles.cardStat}>
            <Text style={styles.cardStatNum}>{activityCount}</Text>
            <Text style={styles.cardStatLabel}>activities</Text>
          </View>
          <View style={styles.cardStatDivider} />
          <View style={styles.cardStat}>
            <Text style={styles.cardStatNum}>{groupDesc}</Text>
            <Text style={styles.cardStatLabel}>group</Text>
          </View>
          <View style={styles.cardStatDivider} />
          <View style={styles.cardStat}>
            <Text style={styles.cardStatNum}>
              {tripInput.accessibility.length > 0
                ? tripInput.accessibility.map(a => a === 'wheelchair' ? '♿' : a === 'stroller' ? '👶' : '🦯').join('')
                : '—'}
            </Text>
            <Text style={styles.cardStatLabel}>access</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <Text style={styles.cardGenerated}>
            Saved {formatDate(generatedAt)}
          </Text>
          <View style={styles.cardBtns}>
            <TouchableOpacity onPress={onShare} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>⬆</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>🗑</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onView} style={styles.viewBtn}>
              <Text style={styles.viewBtnText}>View Trip →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function TripsScreen() {
  const { savedTrips, deleteTrip, setItinerary } = useTripStore();
  const { user } = useAuthStore();
  const [query, setQuery] = React.useState('');

  const filteredTrips = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return savedTrips;
    return savedTrips.filter(t =>
      t.destination.toLowerCase().includes(q) ||
      t.tripInput.vibes.some(v => v.toLowerCase().includes(q))
    );
  }, [savedTrips, query]);

  const handleShare = async (trip: Itinerary) => {
    try {
      await Share.share({
        message: `Check out my FamilyQuest trip to ${trip.destination}! 🌍\n${trip.days.length} days · ${trip.tripInput.vibes.join(', ')}\n\nPlanned with FamilyQuest 🌍`,
        title: `${trip.destination} Trip`,
      });
    } catch (_) {}
  };

  const handleView = (trip: Itinerary) => {
    setItinerary(trip);
    router.push('/itinerary');
  };

  const handleDelete = (trip: Itinerary) => {
    Alert.alert(
      'Remove trip',
      `Remove ${trip.destination} from saved trips?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteTrip(trip.id, user?.uid),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.cream} />
      <LinearGradient colors={Gradients.headerLight} style={styles.header}>
        <SlideUp>
          <Text style={styles.title}>My Trips</Text>
          <Text style={styles.sub}>
            {savedTrips.length > 0
              ? `${savedTrips.length} trip${savedTrips.length !== 1 ? 's' : ''} saved`
              : 'All your planned adventures'}
          </Text>
        </SlideUp>
      </LinearGradient>

      {savedTrips.length > 0 && (
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by destination or vibe…"
            placeholderTextColor={Colors.textLight}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.searchClear}>
              <Text style={styles.searchClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {savedTrips.length === 0 ? (
        /* Empty state */
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🗺️</Text>
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptyText}>
            Generate your first family itinerary and save it — it'll appear here forever, even offline.
          </Text>
          <Button
            label="Plan a trip 🌍"
            onPress={() => router.push('/(tabs)')}
            style={{ marginTop: Spacing.lg }}
          />
        </View>
      ) : filteredTrips.length === 0 ? (
        /* No search results */
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔎</Text>
          <Text style={styles.emptyTitle}>No matches</Text>
          <Text style={styles.emptyText}>
            No saved trips match "{query}". Try a different destination or vibe.
          </Text>
          <Button label="Clear search" onPress={() => setQuery('')} style={{ marginTop: Spacing.lg }} />
        </View>
      ) : (
        /* Trip list */
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {filteredTrips.map((trip, i) => (
            <StaggerItem key={trip.id} index={i}>
              <TripCard
                trip={trip}
                index={i}
                onView={() => handleView(trip)}
                onDelete={() => handleDelete(trip)}
                onShare={() => handleShare(trip)}
              />
            </StaggerItem>
          ))}

          {/* Plan another */}
          <TouchableOpacity
            style={styles.planMoreRow}
            onPress={() => router.push('/(tabs)')}
            activeOpacity={0.8}
          >
            <Text style={styles.planMoreText}>🌍  Plan another adventure</Text>
            <Text style={styles.planMoreArrow}>→</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    paddingTop: Platform.OS === 'ios' ? 58 : 40,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  title: { fontSize: Typography['3xl'], fontFamily: Typography.black, color: Colors.textDark },
  sub:   { fontSize: Typography.base, fontFamily: Typography.regular, color: Colors.textMid, marginTop: 3 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: Spacing.lg, marginTop: Spacing.sm, marginBottom: 4,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    borderWidth: 1.5, borderColor: 'rgba(232,101,26,0.15)',
    ...Shadow.soft,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    flex: 1, fontSize: Typography.sm, fontFamily: Typography.regular,
    color: Colors.textDark, paddingVertical: 6,
  },
  searchClear: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(232,101,26,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  searchClearText: { fontSize: 11, color: Colors.primary, fontFamily: Typography.bold },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyEmoji: { fontSize: 64, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: Typography.xl, fontFamily: Typography.extraBold, color: Colors.textDark, marginBottom: 8 },
  emptyText:  { fontSize: Typography.base, fontFamily: Typography.regular, color: Colors.textMid, textAlign: 'center', lineHeight: 22 },

  list: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 40 },

  // Card
  card: { borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: Colors.surface, ...Shadow.medium },
  cardHeader: { padding: Spacing.lg, overflow: 'hidden' },
  cardOrb: {
    position: 'absolute', top: -30, right: -30,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cardHeaderContent: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  cardDest:  { fontSize: Typography.xl, fontFamily: Typography.black, color: '#fff', letterSpacing: -0.3 },
  cardDates: { fontSize: Typography.sm, fontFamily: Typography.semiBold, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  cardDayBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8,
    alignItems: 'center',
  },
  cardDayNum:   { fontSize: Typography['2xl'], fontFamily: Typography.black, color: '#fff' },
  cardDayLabel: { fontSize: Typography.xs, fontFamily: Typography.semiBold, color: 'rgba(255,255,255,0.65)' },
  cardPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cardPill: {
    paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },
  cardPillText: { fontSize: Typography.xs, fontFamily: Typography.semiBold, color: '#fff' },

  cardBody:    { padding: Spacing.md },
  cardStats:   { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  cardStat:    { flex: 1, alignItems: 'center' },
  cardStatNum: { fontSize: Typography.sm, fontFamily: Typography.bold, color: Colors.textDark },
  cardStatLabel: { fontSize: Typography.xs, fontFamily: Typography.regular, color: Colors.textLight, marginTop: 2 },
  cardStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(232,101,26,0.12)' },

  cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardGenerated: { fontSize: Typography.xs, fontFamily: Typography.regular, color: Colors.textLight },
  cardBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: 'rgba(231,76,60,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(231,76,60,0.20)',
  },
  deleteBtnText: { fontSize: 16 },
  viewBtn: {
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    ...Shadow.soft,
  },
  viewBtnText: { fontSize: Typography.sm, fontFamily: Typography.bold, color: '#fff' },

  planMoreRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5, borderColor: 'rgba(232,101,26,0.15)',
    ...Shadow.soft,
  },
  planMoreText:  { fontSize: Typography.base, fontFamily: Typography.bold, color: Colors.primary },
  planMoreArrow: { fontSize: Typography.xl, color: Colors.primary },
});
