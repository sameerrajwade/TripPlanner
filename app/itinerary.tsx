import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Platform, StatusBar, Share, Image, Alert, ActivityIndicator,
} from 'react-native';
import { Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import RNPrint from 'react-native-print';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { GlassCard, Button } from '../components/ui';
import { SlideUp, StaggerItem, ConfettiBurst, PressScale } from '../components/ui/Animations';
import { useTripStore, useAuthStore } from '../store';
import { fetchDestinationImage } from '../lib/unsplash';
import { fetchWeather, isBadWeather, getWeatherAlert, WeatherAlert } from '../lib/weather';
import { generateItinerary, getApiErrorMessage } from '../lib/api';
import { Activity, DiningSpot, WeatherDay } from '../types';
import { Linking } from 'react-native';

// ─── Intl-free date helpers ────────────────────────────────────────────────────
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function shortDate(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${MONTH_SHORT[dt.getMonth()]} ${dt.getDate()}`;
}

const { width: W, height: H } = Dimensions.get('window');
const HEADER_H   = H * 0.42;
const HEADER_MIN = Platform.OS === 'ios' ? 90 : 72;

const AnimatedScrollView = Animated.ScrollView;

const CATEGORY_META = {
  activity: { color: Colors.catActivity, bg: 'rgba(232,101,26,0.10)', icon: '🎯' },
  dining:   { color: Colors.catDining,   bg: 'rgba(192,57,43,0.10)',  icon: '🍽️' },
  transit:  { color: Colors.catTransit,  bg: 'rgba(139,92,246,0.10)', icon: '🚇' },
  rest:     { color: Colors.catRest,     bg: 'rgba(176,112,80,0.10)', icon: '😴' },
};

// ─── Build HTML for PDF export ────────────────────────────────────────────────
function buildPdfHtml(itinerary: NonNullable<ReturnType<typeof useTripStore.getState>['currentItinerary']>): string {
  const { destination, days, highlights, packingTips, tripInput } = itinerary;
  const dateRange = `${tripInput.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${tripInput.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const groupDesc = `${tripInput.adults} adult${tripInput.adults !== 1 ? 's' : ''}${tripInput.kids > 0 ? ` · ${tripInput.kids} kid${tripInput.kids !== 1 ? 's' : ''}` : ''}`;

  const catColor: Record<string, string> = {
    activity: '#E8651A',
    dining:   '#C0392B',
    transit:  '#8B5CF6',
    rest:     '#B07050',
  };
  const catIcon: Record<string, string> = {
    activity: '🎯', dining: '🍽️', transit: '🚇', rest: '😴',
  };

  const daysHtml = days.map(day => `
    <div class="day-block">
      <div class="day-header">
        <span class="day-num">Day ${day.day}</span>
        <span class="day-date">${day.date}</span>
        <span class="day-theme">${day.theme}</span>
      </div>
      ${day.activities.map(a => `
        <div class="activity" style="border-left: 3px solid ${catColor[a.category] ?? '#E8651A'}">
          <div class="activity-top">
            <span class="act-time">${a.time}</span>
            <span class="act-icon">${catIcon[a.category] ?? '🎯'}</span>
            <div class="act-main">
              <div class="act-title">${a.title}</div>
              <div class="act-meta">${a.duration}${a.cost ? ` · ${a.cost}` : ''}</div>
            </div>
          </div>
          <div class="act-desc">${a.description}</div>
          ${a.tips ? `<div class="act-tip">💡 ${a.tips}</div>` : ''}
          ${a.accessibilityNotes ? `<div class="act-access">♿ ${a.accessibilityNotes}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `).join('');

  const highlightsHtml = highlights.map(h => `<li>${h}</li>`).join('');
  const packingHtml    = packingTips.map(t => `<li>${t}</li>`).join('');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Helvetica Neue', sans-serif; background: #FFF8F0; color: #2D1B0E; font-size: 13px; }

  .cover {
    background: linear-gradient(160deg, #0D0520 0%, #1C1035 25%, #3D1F6E 50%, #7B3F00 75%, #C4622D 100%);
    padding: 48px 32px 40px;
    color: white;
  }
  .cover-brand { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.45); margin-bottom: 16px; }
  .cover-dest  { font-size: 36px; font-weight: 900; letter-spacing: -1px; margin-bottom: 8px; }
  .cover-meta  { font-size: 14px; color: rgba(255,255,255,0.60); margin-bottom: 6px; }
  .cover-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
  .cover-pill  { padding: 4px 12px; border-radius: 100px; border: 1px solid rgba(245,166,35,0.40); background: rgba(245,166,35,0.12); font-size: 11px; color: #F9C15E; }

  .body { padding: 24px 32px; }

  .day-block { margin-bottom: 28px; }
  .day-header {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 12px; padding-bottom: 8px;
    border-bottom: 2px solid rgba(232,101,26,0.15);
  }
  .day-num  { font-size: 11px; font-weight: 800; color: #E8651A; letter-spacing: 1px; text-transform: uppercase; }
  .day-date { font-size: 13px; font-weight: 600; color: #2D1B0E; }
  .day-theme {
    margin-left: auto; font-size: 11px; font-weight: 600;
    background: rgba(232,101,26,0.10); color: #E8651A;
    padding: 3px 10px; border-radius: 100px;
    border: 1px solid rgba(232,101,26,0.25);
  }

  .activity {
    background: white; border-radius: 10px;
    padding: 12px 14px; margin-bottom: 8px;
    page-break-inside: avoid;
  }
  .activity-top { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
  .act-time  { font-size: 10px; font-weight: 700; color: #B07050; min-width: 52px; padding-top: 2px; }
  .act-icon  { font-size: 16px; }
  .act-main  { flex: 1; }
  .act-title { font-size: 13px; font-weight: 800; color: #2D1B0E; }
  .act-meta  { font-size: 10px; color: #B07050; margin-top: 2px; }
  .act-desc  { font-size: 12px; color: #7A4E35; line-height: 1.6; margin-left: 76px; }
  .act-tip   { font-size: 11px; color: #7A4E35; margin-left: 76px; margin-top: 6px; padding: 6px 10px; background: rgba(245,166,35,0.08); border-radius: 6px; }
  .act-access { font-size: 11px; color: #7A4E35; margin-left: 76px; margin-top: 4px; padding: 5px 10px; background: rgba(139,92,246,0.08); border-radius: 6px; }

  .info-section { margin-top: 24px; padding-top: 20px; border-top: 2px solid rgba(232,101,26,0.12); }
  .info-title   { font-size: 14px; font-weight: 800; color: #2D1B0E; margin-bottom: 12px; }
  .info-section ul { list-style: none; padding: 0; }
  .info-section li {
    font-size: 12px; color: #7A4E35; line-height: 1.6;
    padding: 6px 0; border-bottom: 1px solid rgba(232,101,26,0.07);
    padding-left: 14px; position: relative;
  }
  .info-section li::before { content: "●"; position: absolute; left: 0; color: #E8651A; font-size: 7px; top: 8px; }

  .footer { padding: 20px 32px; text-align: center; font-size: 10px; color: #B07050; border-top: 1px solid rgba(232,101,26,0.10); margin-top: 16px; }
  .footer strong { color: #E8651A; }
</style>
</head>
<body>

<div class="cover">
  <div class="cover-brand">FamilyQuest · AI-Powered Family Travel</div>
  <div class="cover-dest">✈️ ${destination}</div>
  <div class="cover-meta">${dateRange} · ${days.length} day${days.length !== 1 ? 's' : ''} · ${groupDesc}</div>
  <div class="cover-pills">
    ${(tripInput.vibes ?? []).map((v: string) => `<div class="cover-pill">${v}</div>`).join('')}
  </div>
</div>

<div class="body">
  ${daysHtml}

  <div class="info-section">
    <div class="info-title">✨ Trip Highlights</div>
    <ul>${highlightsHtml}</ul>
  </div>

  <div class="info-section">
    <div class="info-title">🎒 What to Pack</div>
    <ul>${packingHtml}</ul>
  </div>
</div>

<div class="footer">
  Generated by <strong>FamilyQuest</strong> · familyquest.app · AI-curated, human-approved
</div>

</body>
</html>`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ItineraryScreen() {
  const { currentItinerary, setItinerary, setGenerating, isGenerating, saveTrip, savedTrips } = useTripStore();
  const { user } = useAuthStore();
  const scrollY    = useRef(new Animated.Value(0)).current;
  const [activeDay,   setActiveDay]   = useState(0);
  const [heroImage,   setHeroImage]   = useState<string | null>(null);
  const [isSaved,     setIsSaved]     = useState(false);
  const [exporting,   setExporting]   = useState(false);
  const [regenError,  setRegenError]  = useState<string | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [weather,         setWeather]         = useState<WeatherDay[]>([]);
  const isGuest = !user || user.isGuest;
  // -1 = activity days, days.length = dining tab
  const DINING_TAB = currentItinerary?.days.length ?? 99;

  // ── Check if already saved ─────────────────────────────────────────────────
  useEffect(() => {
    if (currentItinerary) {
      setIsSaved(savedTrips.some(t => t.id === currentItinerary.id));
    }
  }, [currentItinerary, savedTrips]);

  // ── Fetch Unsplash hero image ──────────────────────────────────────────────
  useEffect(() => {
    if (currentItinerary?.destinationImageQuery) {
      fetchDestinationImage(currentItinerary.destinationImageQuery)
        .then(url => setHeroImage(url));
    }
  }, [currentItinerary?.destinationImageQuery]);

  // ── Fetch weather forecast for trip dates ─────────────────────────────────
  useEffect(() => {
    if (!currentItinerary) return;
    const { destination, tripInput: { startDate, endDate } } = currentItinerary;
    fetchWeather(destination, startDate, endDate).then(setWeather);
  }, [currentItinerary?.id]);

  const scrollHandler = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false },
  );

  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_H - HEADER_MIN],
    outputRange: [HEADER_H, HEADER_MIN],
    extrapolate: 'clamp',
  });
  const headerContentOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_H * 0.4],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const headerContentTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_H],
    outputRange: [0, -HEADER_H * 0.3],
    extrapolate: 'clamp',
  });
  const miniHeaderOpacity = scrollY.interpolate({
    inputRange: [HEADER_H * 0.55, HEADER_H * 0.75],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // ── PDF export via react-native-print ─────────────────────────────────────
  const handleExportPdf = async () => {
    if (!currentItinerary) return;
    setExporting(true);
    try {
      const html = buildPdfHtml(currentItinerary);
      await RNPrint.print({ html });
    } catch (err: any) {
      // User cancelled print dialog — not an error
      if (!err?.message?.includes('cancel')) {
        Alert.alert('Export failed', 'Could not export PDF. Please try again.');
      }
    } finally {
      setExporting(false);
    }
  };

  // ── Share plain text (fallback) ────────────────────────────────────────────
  const handleShare = async () => {
    if (!currentItinerary) return;
    try {
      await Share.share({
        message: `My FamilyQuest itinerary for ${currentItinerary.destination}! ✈️\n${currentItinerary.days.length} days · ${currentItinerary.tripInput.vibes.join(', ')}\n\nCreated with FamilyQuest 🌍`,
        title: `${currentItinerary.destination} Trip`,
      });
    } catch (_) {}
  };

  // ── Save trip ──────────────────────────────────────────────────────────────
  const handleSaveTrip = async () => {
    if (!currentItinerary) return;
    if (isGuest) {
      Alert.alert(
        'Sign in to save',
        'Create a free account to save your itinerary and access it any time.',
        [
          { text: 'Sign in / Register', onPress: () => router.push('/auth/login') },
          { text: 'Not now', style: 'cancel' },
        ],
      );
      return;
    }
    if (isSaved) return;
    await saveTrip(currentItinerary, user?.uid);
    setIsSaved(true);
    setConfettiTrigger(t => t + 1);
  };

  // ── Regenerate with same inputs ────────────────────────────────────────────
  const handleRegenerate = async () => {
    if (!currentItinerary) return;
    Alert.alert(
      'Regenerate itinerary?',
      'This will replace the current itinerary with a fresh one using the same trip details.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate', style: 'destructive',
          onPress: async () => {
            setRegenError(null);
            setGenerating(true);
            try {
              const newItinerary = await generateItinerary(currentItinerary.tripInput);
              setItinerary(newItinerary);
              setActiveDay(0);
              setHeroImage(null);
              setIsSaved(false);
            } catch (err: any) {
              setRegenError(getApiErrorMessage(err));
            } finally {
              setGenerating(false);
            }
          },
        },
      ],
    );
  };

  if (!currentItinerary) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>✈️</Text>
        <Text style={styles.emptyText}>No itinerary yet.</Text>
        <Button label="Plan a trip" onPress={() => router.push('/(tabs)')} />
      </View>
    );
  }

  const { destination, days, highlights, packingTips } = currentItinerary;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Parallax Golden Hour hero */}
      <Animated.View style={[styles.heroHeader, { height: headerHeight }]}>
        {/* Unsplash photo if available */}
        {heroImage ? (
          <Image source={{ uri: heroImage }} style={styles.heroImage} resizeMode="cover" />
        ) : null}

        {/* Golden Hour gradient overlay (always shown — acts as overlay on photo, full gradient without) */}
        <LinearGradient
          colors={heroImage
            ? ['rgba(13,5,32,0.65)', 'rgba(28,16,53,0.55)', 'rgba(61,31,110,0.50)', 'rgba(123,63,0,0.60)', 'rgba(196,98,45,0.75)'] as const
            : Gradients.heroItinerary}
          locations={[0, 0.22, 0.5, 0.75, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Ambient glow at bottom */}
        <LinearGradient
          colors={['transparent', 'rgba(232,101,26,0.30)', 'rgba(232,101,26,0.55)']}
          style={styles.heroGlow}
        />
        {/* Decorative orbs (only without photo) */}
        {!heroImage && (
          <>
            <View style={styles.orbHeroTL} />
            <View style={styles.orbHeroBR} />
          </>
        )}

        {/* Back + share */}
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => router.back()} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>⬆</Text>
          </TouchableOpacity>
        </View>

        {/* Hero content */}
        <Animated.View style={[styles.heroContent, { opacity: headerContentOpacity, transform: [{ translateY: headerContentTranslateY }] }]}>
          <Text style={styles.heroEmoji}>{currentItinerary.heroEmoji ?? '✈️'}</Text>
          <Text style={styles.heroDestination}>{destination}</Text>
          {/* Date range */}
          <Text style={styles.heroDateRange}>
            {shortDate(currentItinerary.tripInput.startDate)} – {shortDate(currentItinerary.tripInput.endDate)}
            {' · '}{days.length} day{days.length !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.heroMeta}>
            {currentItinerary.tripInput.adults} adult{currentItinerary.tripInput.adults !== 1 ? 's' : ''}
            {currentItinerary.tripInput.kids > 0 ? ` · ${currentItinerary.tripInput.kids} kid${currentItinerary.tripInput.kids !== 1 ? 's' : ''}` : ''}
            {' · '}{currentItinerary.tripInput.pace ?? 'balanced'} pace
          </Text>
          {/* Vibe pills */}
          <View style={styles.heroPills}>
            {currentItinerary.tripInput.vibes.slice(0, 3).map(v => (
              <View key={v} style={styles.heroPill}>
                <Text style={styles.heroPillText}>{v}</Text>
              </View>
            ))}
          </View>
          {/* Stay location map link */}
          {currentItinerary.tripInput.stayLocation && (
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(currentItinerary.tripInput.stayLocation!)}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.mapBtnText}>📍 {currentItinerary.tripInput.stayLocation} · View on map →</Text>
            </TouchableOpacity>
          )}

          {/* Accessibility chips */}
          {currentItinerary.tripInput.accessibility && currentItinerary.tripInput.accessibility.length > 0 && (
            <View style={styles.heroAccessRow}>
              {currentItinerary.tripInput.accessibility.map(a => (
                <View key={a} style={styles.heroAccessChip}>
                  <Text style={styles.heroAccessText}>
                    {a === 'stroller' ? '👶 Stroller' : a === 'wheelchair' ? '♿ Wheelchair' : '🦯 Limited mobility'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Save / Sign-in button */}
          <View>
            <PressScale onPress={handleSaveTrip} disabled={!isGuest && isSaved}>
              <View style={[styles.saveHeroBtn, !isGuest && isSaved && styles.saveHeroBtnSaved]}>
                <Text style={styles.saveHeroBtnText}>
                  {isGuest ? '🔒 Sign in to save' : isSaved ? '✓ Saved' : '＋ Save Trip'}
                </Text>
              </View>
            </PressScale>
            {confettiTrigger > 0 && <ConfettiBurst trigger={confettiTrigger} />}
          </View>
        </Animated.View>

        {/* Mini header */}
        <Animated.View style={[styles.miniHeader, { opacity: miniHeaderOpacity }]}>
          <Text style={styles.miniHeaderText}>{destination}</Text>
        </Animated.View>
      </Animated.View>

      {/* Scrollable body */}
      <AnimatedScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.scrollContent, { paddingTop: HEADER_H }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Day tabs */}
        <View style={styles.dayTabsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabs}>
            {days.map((day, i) => {
              const tripStart = currentItinerary.tripInput.startDate;
              const tabDate = new Date(tripStart);
              tabDate.setDate(tabDate.getDate() + i);
              const w = weather[i];
              const rainy = w ? isBadWeather(w) : false;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => setActiveDay(i)}
                  style={[styles.dayTab, activeDay === i && styles.dayTabActive, rainy && styles.dayTabRainy]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayTabNum, activeDay === i && styles.dayTabTextActive]}>Day {day.day}</Text>
                  <Text style={[styles.dayTabDate, activeDay === i && { color: 'rgba(255,255,255,0.65)' }]}>
                    {shortDate(tabDate)}
                  </Text>
                  {w && (
                    <Text style={styles.dayTabWeather}>{w.icon} {w.tempMax}°</Text>
                  )}
                </TouchableOpacity>
              );
            })}
            {/* Dining tab — always last */}
            <TouchableOpacity
              onPress={() => setActiveDay(DINING_TAB)}
              style={[styles.dayTab, activeDay === DINING_TAB && styles.dayTabActive, styles.dayTabDining]}
              activeOpacity={0.8}
            >
              <Text style={[styles.dayTabNum, activeDay === DINING_TAB && styles.dayTabTextActive]}>🍽️</Text>
              <Text style={[styles.dayTabDate, activeDay === DINING_TAB && { color: 'rgba(255,255,255,0.65)' }]}>Dining</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Active day */}
        {activeDay !== DINING_TAB && days[activeDay] && (
          <View style={styles.daySection}>
            <SlideUp key={activeDay}>
              <View style={styles.dayThemeRow}>
                <View style={styles.dayThemeBadge}>
                  <Text style={styles.dayThemeText}>{days[activeDay].theme}</Text>
                </View>
                <Text style={styles.activityCount}>
                  {days[activeDay].activities.length} activities
                </Text>
              </View>
              {/* Weather banner for this day */}
              {weather[activeDay] && (
                <WeatherBanner weather={weather[activeDay]} />
              )}

              {days[activeDay].activities.map((activity, i) => (
                <StaggerItem key={i} index={i} style={styles.activityItem}>
                  <ActivityCard activity={activity} />
                </StaggerItem>
              ))}
            </SlideUp>
          </View>
        )}

        {/* Dining tab — all dining spots across all days */}
        {activeDay === DINING_TAB && (
          <View style={styles.daySection}>
            <SlideUp key="dining">
              <View style={styles.dayThemeRow}>
                <View style={styles.dayThemeBadge}>
                  <Text style={styles.dayThemeText}>Local dining picks</Text>
                </View>
                <Text style={styles.activityCount}>All {days.length} days</Text>
              </View>
              <Text style={styles.diningPageSub}>
                Locally celebrated spots — not tourist traps.{'\n'}2-3 options per meal so you can pick what you're in the mood for.
              </Text>
              {days.map((day, di) =>
                day.diningSpots && day.diningSpots.length > 0 ? (
                  <View key={di} style={styles.diningDayBlock}>
                    <View style={styles.diningDayHeader}>
                      <Text style={styles.diningDayLabel}>Day {day.day}</Text>
                      <Text style={styles.diningDayTheme}>{day.theme}</Text>
                    </View>
                    {day.diningSpots.map((spot, si) => (
                      <DiningSpotCard key={si} spot={spot} />
                    ))}
                  </View>
                ) : null
              )}
            </SlideUp>
          </View>
        )}

        {/* Highlights */}
        <SlideUp delay={200}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✨ Trip Highlights</Text>
            <GlassCard style={styles.infoCard}>
              {highlights.map((h, i) => (
                <View key={i} style={styles.infoRow}>
                  <Text style={styles.infoDot}>●</Text>
                  <Text style={styles.infoText}>{h}</Text>
                </View>
              ))}
            </GlassCard>
          </View>
        </SlideUp>

        {/* Packing */}
        <SlideUp delay={300}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎒 Pack These</Text>
            <GlassCard style={styles.infoCard}>
              {packingTips.map((t, i) => (
                <View key={i} style={styles.infoRow}>
                  <Text style={styles.infoDot}>○</Text>
                  <Text style={styles.infoText}>{t}</Text>
                </View>
              ))}
            </GlassCard>
          </View>
        </SlideUp>

        {/* Regenerate + new trip */}
        <SlideUp delay={400}>
          <View style={styles.section}>
            {regenError && (
              <View style={styles.regenError}>
                <Text style={styles.regenErrorText}>⚠️  {regenError}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.regenBtn}
              onPress={handleRegenerate}
              activeOpacity={0.8}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.regenBtnText}>🔄  Regenerate itinerary</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.newTripRow}
              onPress={() => router.push('/(tabs)')}
              activeOpacity={0.8}
            >
              <Text style={styles.newTripText}>🗺️  Plan another trip</Text>
              <Text style={styles.newTripArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </SlideUp>

        <View style={{ height: 130 }} />
      </AnimatedScrollView>

      {/* Floating PDF export button */}
      <View style={styles.fab}>
        <PressScale onPress={handleExportPdf} disabled={exporting} scale={0.97}>
          <View style={styles.fabButton}>
            <LinearGradient colors={Gradients.primaryCTA} style={styles.fabGradient}>
              <Text style={styles.fabIcon}>📄</Text>
              <Text style={styles.fabLabel}>{exporting ? 'Preparing…' : 'Export PDF'}</Text>
            </LinearGradient>
          </View>
        </PressScale>
      </View>
    </View>
  );
}

// ─── Weather Banner ────────────────────────────────────────────────────────────
const ALERT_META: Record<NonNullable<WeatherAlert>, { bg: string; border: string; textColor: string; message: (w: WeatherDay) => string }> = {
  storm: { bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.35)', textColor: '#4338CA',
           message: () => '⛈️ Thunderstorm likely — move all outdoor activities indoors. Check local emergency alerts.' },
  snow:  { bg: 'rgba(186,230,253,0.25)', border: 'rgba(56,189,248,0.40)', textColor: '#0369A1',
           message: () => '❄️ Snow expected — dress in layers, check venue closures, use indoor backup plans.' },
  rain:  { bg: 'rgba(74,144,217,0.09)', border: 'rgba(74,144,217,0.30)', textColor: '#2563EB',
           message: (w) => `☔ ${w.rainChance}% chance of rain — backup plans shown when you expand each outdoor activity.` },
  heat:  { bg: 'rgba(253,186,116,0.20)', border: 'rgba(234,88,12,0.35)', textColor: '#C2410C',
           message: (w) => `🌡️ ${w.tempMax}°C expected — avoid outdoor activity 11AM–3PM. Carry water, seek shade, apply sunscreen.` },
  cold:  { bg: 'rgba(186,230,253,0.20)', border: 'rgba(56,189,248,0.35)', textColor: '#075985',
           message: (w) => `🧊 Only ${w.tempMax}°C — bundle up. Some outdoor activities may be uncomfortable; prefer heated indoor venues.` },
};

function WeatherBanner({ weather }: { weather: WeatherDay }) {
  const alert = getWeatherAlert(weather);
  const meta  = alert ? ALERT_META[alert] : null;
  return (
    <View style={[styles.weatherBanner, meta && { backgroundColor: meta.bg, borderColor: meta.border }]}>
      <Text style={styles.weatherIcon}>{weather.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.weatherDesc}>{weather.description} · {weather.tempMin}°–{weather.tempMax}°C</Text>
        {meta && (
          <Text style={[styles.weatherRainWarning, { color: meta.textColor }]}>
            {meta.message(weather)}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Dining Spot Card ─────────────────────────────────────────────────────────
const MEAL_META: Record<string, { icon: string; label: string; color: string }> = {
  breakfast: { icon: '☕', label: 'Breakfast',  color: '#E8651A' },
  lunch:     { icon: '🥗', label: 'Lunch',      color: '#2E7D32' },
  dinner:    { icon: '🌙', label: 'Dinner',     color: '#5C35A0' },
  coffee:    { icon: '☕', label: 'Coffee stop', color: '#795548' },
};

function DiningSpotCard({ spot }: { spot: DiningSpot }) {
  const meta = MEAL_META[spot.meal] ?? MEAL_META.lunch;
  return (
    <View style={[styles.diningCard, { borderLeftColor: meta.color }]}>
      {/* Meal header */}
      <View style={styles.diningCardHeader}>
        <View style={[styles.diningMealBadge, { backgroundColor: meta.color + '18' }]}>
          <Text style={styles.diningMealIcon}>{meta.icon}</Text>
          <Text style={[styles.diningMealLabel, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <Text style={styles.diningNear}>📍 Near {spot.nearActivity}</Text>
      </View>

      {/* 2-3 options */}
      {spot.options.map((opt, i) => (
        <View key={i} style={[styles.diningOption, i > 0 && styles.diningOptionBorder]}>
          <View style={styles.diningOptionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.diningName}>{opt.name}</Text>
              <Text style={styles.diningCuisine}>{opt.cuisine}</Text>
            </View>
            <Text style={styles.diningCost}>{opt.cost}</Text>
          </View>
          <Text style={styles.diningWhy}>{opt.why}</Text>
          {opt.dietaryTags && opt.dietaryTags.length > 0 && (
            <View style={styles.diningTagRow}>
              {opt.dietaryTags.map((tag, j) => (
                <View key={j} style={styles.diningTag}>
                  <Text style={styles.diningTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Activity Card ─────────────────────────────────────────────────────────────
function ActivityCard({ activity }: { activity: Activity }) {
  const meta = CATEGORY_META[activity.category] ?? CATEGORY_META.activity;
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      onPress={() => setExpanded(v => !v)}
      activeOpacity={0.92}
      style={styles.activityCard}
    >
      <View style={styles.activityTime}>
        <Text style={styles.activityTimeText}>{activity.time}</Text>
        <View style={[styles.timelineDot, { backgroundColor: meta.color }]} />
        <View style={[styles.timelineLine, { backgroundColor: meta.color }]} />
      </View>

      <View style={[styles.activityBody, { borderLeftColor: meta.color }]}>
        <View style={styles.activityHeader}>
          <View style={[styles.activityBadge, { backgroundColor: meta.bg }]}>
            <Text style={styles.activityBadgeIcon}>{meta.icon}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.activityTitle}>{activity.title}</Text>
            <Text style={styles.activityDuration}>{activity.duration}</Text>
          </View>
          {activity.cost && (
            <View style={styles.costBadge}>
              <Text style={styles.costText}>{activity.cost}</Text>
            </View>
          )}
        </View>

        <Text style={styles.activityDesc} numberOfLines={expanded ? undefined : 2}>
          {activity.description}
        </Text>

        {expanded && (
          <>
            {activity.accessibilityNotes && (
              <View style={styles.noteRow}>
                <Text style={styles.noteIcon}>♿</Text>
                <Text style={styles.noteText}>{activity.accessibilityNotes}</Text>
              </View>
            )}
            {activity.tips && (
              <View style={styles.noteRow}>
                <Text style={styles.noteIcon}>💡</Text>
                <Text style={styles.noteText}>{activity.tips}</Text>
              </View>
            )}
            {activity.isOutdoor && activity.indoorAlternative && (
              <View style={styles.backupRow}>
                <Text style={styles.backupIcon}>🏠</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.backupLabel}>Rainy day backup</Text>
                  <Text style={styles.backupText}>{activity.indoorAlternative}</Text>
                </View>
              </View>
            )}
          </>
        )}

        <Text style={styles.expandHint}>{expanded ? 'Show less ▲' : 'Tap for tips ▼'}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: Spacing.lg },
  emptyEmoji: { fontSize: 56 },
  emptyText: { fontSize: Typography.lg, fontFamily: Typography.semiBold, color: Colors.textMid },

  heroHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 10, overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
    width: W,
  },
  heroGlow: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
  },
  orbHeroTL: {
    position: 'absolute', top: -50, left: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(61,31,110,0.30)',
  },
  orbHeroBR: {
    position: 'absolute', bottom: -20, right: -20,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(123,63,0,0.28)',
  },
  topActions: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
  },
  actionBtn: {
    width: 42, height: 42, borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },
  actionBtnText: { fontSize: 18, color: '#fff' },
  heroContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  heroEmoji:       { fontSize: 42, marginBottom: 8 },
  heroDestination: { fontSize: Typography['3xl'], fontFamily: Typography.black, color: '#fff', textAlign: 'center', letterSpacing: -0.5 },
  heroDateRange:   { fontSize: Typography.md, fontFamily: Typography.extraBold, color: 'rgba(255,255,255,0.90)', marginTop: 4 },
  heroMeta:        { fontSize: Typography.sm, fontFamily: Typography.semiBold, color: 'rgba(255,255,255,0.55)', marginTop: 3, marginBottom: Spacing.sm },
  heroPills:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: Spacing.sm },
  heroAccessRow:   { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: Spacing.sm },
  heroAccessChip:  { paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.full, backgroundColor: 'rgba(139,92,246,0.20)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.40)' },
  heroAccessText:  { fontSize: Typography.xs, fontFamily: Typography.semiBold, color: 'rgba(255,255,255,0.80)' },
  mapBtn: {
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: Radius.full, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
  },
  mapBtnText: { fontSize: Typography.xs, fontFamily: Typography.semiBold, color: 'rgba(255,255,255,0.90)' },
  heroPill: {
    paddingVertical: 6, paddingHorizontal: 13,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(245,166,35,0.18)',
    borderWidth: 1, borderColor: 'rgba(245,166,35,0.40)',
  },
  heroPillText: { color: Colors.gold, fontSize: Typography.sm, fontFamily: Typography.semiBold },
  saveHeroBtn: {
    paddingVertical: 10, paddingHorizontal: 22,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.40)',
  },
  saveHeroBtnSaved: {
    backgroundColor: 'rgba(67,201,122,0.25)',
    borderColor: 'rgba(67,201,122,0.60)',
  },
  saveHeroBtnText: { color: '#fff', fontFamily: Typography.bold, fontSize: Typography.sm },
  miniHeader: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: HEADER_MIN, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 14,
  },
  miniHeaderText: { fontSize: Typography.lg, fontFamily: Typography.extraBold, color: '#fff' },

  scrollContent: {
    backgroundColor: Colors.cream,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    minHeight: H,
  },
  dayTabsWrap:  { paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  dayTabs:      { paddingHorizontal: Spacing.lg },
  dayTab: {
    paddingVertical: 10, paddingHorizontal: 18,
    borderRadius: Radius.full, backgroundColor: Colors.surface,
    marginRight: 10, borderWidth: 1.5,
    borderColor: 'rgba(232,101,26,0.18)',
    alignItems: 'center', ...Shadow.soft,
  },
  dayTabActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary, ...Shadow.glow },
  dayTabNum:       { fontSize: Typography.sm, fontFamily: Typography.extraBold, color: Colors.textDark },
  dayTabDate:      { fontSize: Typography.xs, fontFamily: Typography.regular, color: Colors.textLight, marginTop: 1 },
  dayTabTextActive:{ color: '#fff' },

  daySection:   { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  dayThemeRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  dayThemeBadge: {
    alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(232,101,26,0.10)',
    borderWidth: 1, borderColor: 'rgba(232,101,26,0.28)',
  },
  dayThemeText:   { fontSize: Typography.sm, fontFamily: Typography.bold, color: Colors.primary },
  activityCount:  { fontSize: Typography.xs, fontFamily: Typography.regular, color: Colors.textLight },

  activityItem: { marginBottom: Spacing.md },
  activityCard: { flexDirection: 'row', gap: 12 },
  activityTime: { width: 62, alignItems: 'center', paddingTop: 4 },
  activityTimeText: { fontSize: Typography.xs, fontFamily: Typography.bold, color: Colors.textMid, textAlign: 'center' },
  timelineDot:  { width: 10, height: 10, borderRadius: 5, marginTop: 8, marginBottom: 2 },
  timelineLine: { flex: 1, width: 2, borderRadius: 1, opacity: 0.25 },
  activityBody: {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing.md,
    borderLeftWidth: 3, ...Shadow.soft,
  },
  activityHeader:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  activityBadge:     { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  activityBadgeIcon: { fontSize: 18 },
  activityTitle:     { fontSize: Typography.base, fontFamily: Typography.extraBold, color: Colors.textDark, flexShrink: 1, flexWrap: 'wrap' },
  activityDuration:  { fontSize: Typography.xs, fontFamily: Typography.regular, color: Colors.textLight, marginTop: 2 },
  costBadge:  { paddingVertical: 4, paddingHorizontal: 8, borderRadius: Radius.sm, backgroundColor: Colors.creamDark },
  costText:   { fontSize: Typography.xs, fontFamily: Typography.bold, color: Colors.textMid },
  activityDesc: { fontSize: Typography.sm, fontFamily: Typography.regular, color: Colors.textMid, lineHeight: 20 },
  noteRow:    { flexDirection: 'row', gap: 6, marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(232,101,26,0.08)' },
  noteIcon:   { fontSize: 13, marginTop: 1 },
  noteText:   { flex: 1, fontSize: Typography.xs, fontFamily: Typography.regular, color: Colors.textMid, lineHeight: 18 },
  expandHint: { fontSize: Typography.xs, fontFamily: Typography.semiBold, color: Colors.gold, marginTop: 8, textAlign: 'right' },

  section:      { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionTitle: { fontSize: Typography.lg, fontFamily: Typography.extraBold, color: Colors.textDark, marginBottom: Spacing.sm },
  infoCard:     { padding: Spacing.md, backgroundColor: Colors.surface, gap: 10 },
  infoRow:      { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoDot:      { fontSize: 8, color: Colors.primary, marginTop: 5 },
  infoText:     { flex: 1, fontSize: Typography.sm, fontFamily: Typography.regular, color: Colors.textMid, lineHeight: 20 },

  regenBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.lg, paddingVertical: 14,
    marginBottom: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1.5, borderColor: 'rgba(232,101,26,0.30)',
    ...Shadow.soft,
  },
  regenBtnText: { fontSize: Typography.base, fontFamily: Typography.bold, color: Colors.primary },
  regenError: {
    marginBottom: 10, padding: Spacing.sm, borderRadius: Radius.md,
    backgroundColor: 'rgba(231,76,60,0.09)', borderWidth: 1, borderColor: 'rgba(231,76,60,0.25)',
  },
  regenErrorText: { fontSize: Typography.xs, fontFamily: Typography.semiBold, color: Colors.danger, textAlign: 'center' },

  newTripRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5, borderColor: 'rgba(232,101,26,0.15)',
    ...Shadow.soft,
  },
  newTripText:  { fontSize: Typography.base, fontFamily: Typography.bold, color: Colors.primary },
  newTripArrow: { fontSize: Typography.xl, color: Colors.primary },

  fab:       { position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 28, left: Spacing.lg, right: Spacing.lg },
  fabButton: { borderRadius: Radius.full, overflow: 'hidden', ...Shadow.glow },
  fabGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  fabIcon:  { fontSize: 20 },
  fabLabel: { fontSize: Typography.md, fontFamily: Typography.extraBold, color: '#fff', letterSpacing: 0.3 },

  // ── Dining section ────────────────────────────────────────────────────────
  diningSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(232,101,26,0.12)',
  },
  diningSectionTitle: {
    fontSize: Typography.md, fontFamily: Typography.extraBold,
    color: Colors.textDark, marginBottom: 2,
  },
  diningSectionSub: {
    fontSize: Typography.xs, fontFamily: Typography.regular,
    color: Colors.textLight, marginBottom: Spacing.md,
  },
  diningCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: 10,
    borderLeftWidth: 3, ...Shadow.soft,
  },
  diningCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6,
  },
  diningMealBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.full, gap: 4,
  },
  diningMealIcon:  { fontSize: 12 },
  diningMealLabel: { fontSize: Typography.xs, fontFamily: Typography.bold },
  diningCost:  { fontSize: Typography.xs, fontFamily: Typography.semiBold, color: Colors.textLight },
  diningOption: { paddingTop: 10 },
  diningOptionBorder: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.07)', marginTop: 10 },
  diningOptionHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  diningName:  { fontSize: Typography.base, fontFamily: Typography.extraBold, color: Colors.textDark, marginBottom: 1 },
  diningCuisine: { fontSize: Typography.xs, fontFamily: Typography.semiBold, color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.4 },
  diningWhy:   { fontSize: Typography.sm, fontFamily: Typography.regular, color: Colors.textDark, lineHeight: 20, marginBottom: 6 },
  diningNear:  { fontSize: Typography.xs, fontFamily: Typography.semiBold, color: Colors.primary, opacity: 0.7 },
  diningTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  diningTag: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(92,53,160,0.10)',
  },
  diningTagText: { fontSize: 10, fontFamily: Typography.bold, color: '#5C35A0' },

  // ── Day tab variants ──────────────────────────────────────────────────────
  dayTabWeather: { fontSize: Typography.xs, color: Colors.textLight, marginTop: 2 },
  dayTabRainy:   { borderColor: '#4A90D9', backgroundColor: 'rgba(74,144,217,0.08)' },
  dayTabDining:  { borderColor: 'rgba(192,57,43,0.35)', backgroundColor: 'rgba(192,57,43,0.06)' },

  // ── Dining page (consolidated tab) ───────────────────────────────────────
  diningPageSub: {
    fontSize: Typography.sm, fontFamily: Typography.regular,
    color: Colors.textMid, lineHeight: 20,
    marginBottom: Spacing.md, opacity: 0.75,
  },
  diningDayBlock: { marginBottom: Spacing.lg },
  diningDayHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: Spacing.sm,
    paddingBottom: 8, borderBottomWidth: 1,
    borderBottomColor: 'rgba(232,101,26,0.12)',
  },
  diningDayLabel: { fontSize: Typography.xs, fontFamily: Typography.extraBold, color: Colors.primary, letterSpacing: 0.8, textTransform: 'uppercase' },
  diningDayTheme: { fontSize: Typography.xs, fontFamily: Typography.semiBold, color: Colors.textLight, flex: 1 },

  // ── Weather banner ────────────────────────────────────────────────────────
  weatherBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.70)',
    borderRadius: Radius.md, padding: 10,
    marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(232,101,26,0.12)',
  },
  weatherBannerRainy: {
    backgroundColor: 'rgba(74,144,217,0.09)',
    borderColor: 'rgba(74,144,217,0.30)',
  },
  weatherIcon: { fontSize: 28 },
  weatherDesc: { fontSize: Typography.sm, fontFamily: Typography.semiBold, color: Colors.textDark },
  weatherRainWarning: { fontSize: Typography.xs, fontFamily: Typography.regular, color: '#2563EB', marginTop: 2 },

  // ── Backup plan ───────────────────────────────────────────────────────────
  backupRow: {
    flexDirection: 'row', gap: 6, marginTop: Spacing.sm,
    paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(74,144,217,0.15)',
    backgroundColor: 'rgba(74,144,217,0.06)',
    borderRadius: Radius.sm, padding: 8,
  },
  backupIcon:  { fontSize: 14, marginTop: 1 },
  backupLabel: { fontSize: Typography.xs, fontFamily: Typography.bold, color: '#2563EB', marginBottom: 2 },
  backupText:  { fontSize: Typography.xs, fontFamily: Typography.regular, color: Colors.textMid, lineHeight: 17 },
});
