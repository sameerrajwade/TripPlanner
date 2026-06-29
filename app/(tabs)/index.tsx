import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Platform, StatusBar, Alert, Dimensions,
} from 'react-native';

const { height: SCREEN_H } = Dimensions.get('window');
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { Button, Chip, GlassCard, SectionHeader } from '../../components/ui';
import { SlideUp, PressScale } from '../../components/ui/Animations';
import { GeneratingOverlay } from '../../components/ui/GeneratingOverlay';
import { useTripStore, useAuthStore } from '../../store';
import { Vibe, AccessibilityNeed, TripPace, BudgetLevel, DietaryNeed, CuisinePreference } from '../../types';
import { generateItinerary, getApiErrorMessage } from '../../lib/api';
import * as Haptics from 'expo-haptics';

// ─── Constants ────────────────────────────────────────────────────────────────
const VIBES: { label: Vibe; icon: string }[] = [
  { label: 'Kid-Friendly', icon: '🧒' },
  { label: 'Foodie',       icon: '🍽️' },
  { label: 'Hiking',       icon: '🥾' },
  { label: 'Beach',        icon: '🏖️' },
  { label: 'Museums',      icon: '🏛️' },
  { label: 'Adventure',    icon: '🎢' },
  { label: 'Nature',       icon: '🌲' },
  { label: 'History',      icon: '🏰' },
  { label: 'Shopping',     icon: '🛍️' },
  { label: 'Relaxation',   icon: '🧘' },
  { label: 'Photography',  icon: '📸' },
  { label: 'Nightlife',    icon: '🌃' },
];

const ACCESS_OPTIONS: { id: AccessibilityNeed; label: string; icon: string }[] = [
  { id: 'stroller',         label: 'Stroller friendly',    icon: '👶' },
  { id: 'wheelchair',       label: 'Wheelchair accessible', icon: '♿' },
  { id: 'limited_mobility', label: 'Limited mobility',     icon: '🦯' },
];

const PACE_OPTIONS: { value: TripPace; label: string; icon: string; desc: string }[] = [
  { value: 'relaxed',  label: 'Relaxed',  icon: '🌅', desc: '2–3 activities/day, plenty of downtime' },
  { value: 'balanced', label: 'Balanced', icon: '⚖️', desc: '4–5 activities/day, some breathing room' },
  { value: 'packed',   label: 'Packed',   icon: '🚀', desc: '6+ activities/day, maximise every hour' },
];

const BUDGET_OPTIONS: { value: BudgetLevel; label: string; icon: string; desc: string }[] = [
  { value: 'budget',    label: 'Budget',    icon: '💰', desc: 'Free & cheap options, local eats' },
  { value: 'mid-range', label: 'Mid-range', icon: '💳', desc: 'Mix of value & comfort' },
  { value: 'luxury',    label: 'Luxury',    icon: '💎', desc: 'Premium experiences, fine dining' },
];

const POPULAR_DESTINATIONS = [
  'Amsterdam, Netherlands', 'Athens, Greece', 'Bali, Indonesia', 'Bangkok, Thailand',
  'Barcelona, Spain', 'Berlin, Germany', 'Bora Bora, French Polynesia', 'Buenos Aires, Argentina',
  'Cairo, Egypt', 'Cancún, Mexico', 'Cape Town, South Africa', 'Chicago, USA',
  'Copenhagen, Denmark', 'Dubai, UAE', 'Dublin, Ireland', 'Edinburgh, Scotland',
  'Florence, Italy', 'Hong Kong', 'Istanbul, Turkey', 'Kyoto, Japan',
  'Lisbon, Portugal', 'London, UK', 'Los Angeles, USA', 'Madrid, Spain',
  'Maldives', 'Marrakech, Morocco', 'Melbourne, Australia', 'Mexico City, Mexico',
  'Miami, USA', 'Milan, Italy', 'Mykonos, Greece', 'Nairobi, Kenya',
  'New York City, USA', 'New Zealand', 'Nice, France', 'Oslo, Norway',
  'Paris, France', 'Phuket, Thailand', 'Prague, Czech Republic', 'Queenstown, New Zealand',
  'Reykjavik, Iceland', 'Rio de Janeiro, Brazil', 'Rome, Italy', 'Santorini, Greece',
  'Sapporo, Japan', 'Seoul, South Korea', 'Singapore', 'Stockholm, Sweden',
  'Sydney, Australia', 'Taipei, Taiwan', 'Tokyo, Japan', 'Toronto, Canada',
  'Vancouver, Canada', 'Venice, Italy', 'Vienna, Austria', 'Zürich, Switzerland',
];

const DIETARY_OPTIONS: { id: DietaryNeed; label: string; icon: string }[] = [
  { id: 'vegetarian', label: 'Vegetarian', icon: '🥦' },
  { id: 'vegan',      label: 'Vegan',      icon: '🌱' },
  { id: 'halal',      label: 'Halal',      icon: '☪️'  },
  { id: 'kosher',     label: 'Kosher',     icon: '✡️'  },
  { id: 'gluten-free',label: 'Gluten-free',icon: '🌾' },
  { id: 'nut-free',   label: 'Nut-free',   icon: '🚫🥜'},
  { id: 'dairy-free', label: 'Dairy-free', icon: '🥛' },
];

const CUISINE_OPTIONS: { id: CuisinePreference; label: string; icon: string }[] = [
  { id: 'Local',         label: 'Local',         icon: '🏠' },
  { id: 'Italian',       label: 'Italian',       icon: '🍕' },
  { id: 'Asian',         label: 'Asian',         icon: '🍜' },
  { id: 'Japanese',      label: 'Japanese',      icon: '🍣' },
  { id: 'Indian',        label: 'Indian',        icon: '🍛' },
  { id: 'Mexican',       label: 'Mexican',       icon: '🌮' },
  { id: 'Mediterranean', label: 'Mediterranean', icon: '🫒' },
  { id: 'Middle Eastern',label: 'Middle Eastern',icon: '🧆' },
  { id: 'French',        label: 'French',        icon: '🥐' },
  { id: 'American',      label: 'American',      icon: '🍔' },
];

// ─── Daily limit (mirrors server) ─────────────────────────────────────────────
const DAILY_LIMIT_GUEST = 3;

// ─── Contextual emoji based on destination + vibes ────────────────────────────
function getContextualEmoji(destination: string, vibes: Vibe[]): string {
  const d = destination.trim().toLowerCase();
  if (d.length < 3) return '🧭';
  // Destination keyword overrides vibe
  if (d.includes('bali') || d.includes('maldives') || d.includes('phuket') || d.includes('goa') || d.includes('cancun') || d.includes('bora bora')) return '🏖️';
  if (d.includes('japan') || d.includes('tokyo') || d.includes('kyoto') || d.includes('osaka')) return '⛩️';
  if (d.includes('paris') || d.includes('france') && d.includes('nice')) return '🗼';
  if (d.includes('new york') || d.includes('nyc') || d.includes('manhattan')) return '🗽';
  if (d.includes('dubai') || d.includes('abu dhabi')) return '🌆';
  if (d.includes('kenya') || d.includes('safari') || d.includes('serengeti') || d.includes('africa')) return '🦁';
  if (d.includes('iceland') || d.includes('reykjavik')) return '🌋';
  if (d.includes('rome') || d.includes('athens') || d.includes('istanbul')) return '🏛️';
  if (d.includes('new zealand') || d.includes('queenstown') || d.includes('swiss') || d.includes('alps')) return '🏔️';
  if (d.includes('sydney') || d.includes('australia')) return '🦘';
  if (d.includes('egypt') || d.includes('cairo')) return '🏺';
  if (d.includes('india') || d.includes('rajasthan') || d.includes('mumbai') || d.includes('delhi')) return '🕌';
  if (d.includes('rio') || d.includes('brazil')) return '🌴';
  if (d.includes('london') || d.includes('edinburgh') || d.includes('dublin')) return '🏰';
  if (d.includes('amsterdam') || d.includes('copenhagen') || d.includes('stockholm')) return '🚲';
  if (d.includes('singapore') || d.includes('hong kong') || d.includes('shanghai')) return '🌃';
  // Vibe-based fallback
  if (vibes.includes('Beach')) return '🏖️';
  if (vibes.includes('Hiking') || vibes.includes('Nature')) return '🏔️';
  if (vibes.includes('Foodie')) return '🌮';
  if (vibes.includes('Museums') || vibes.includes('History')) return '🏛️';
  if (vibes.includes('Adventure')) return '🎢';
  if (vibes.includes('Shopping')) return '🛍️';
  if (vibes.includes('Relaxation')) return '🧘';
  if (vibes.includes('Nightlife')) return '🌃';
  if (vibes.includes('Photography')) return '📸';
  if (vibes.includes('Kid-Friendly')) return '👨‍👩‍👧';
  return '🌍';
}

// ─── Date helpers (Intl-free — Hermes release builds lack ICU data) ───────────
const MONTH_NAMES   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function formatDate(d: Date | null): string {
  if (!d) return '';
  try {
    return `${WEEKDAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  }
}

function formatDateShort(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function PlannerScreen() {
  const { setItinerary, setGenerating, isGenerating, dailyGenerationCount, bumpDailyCount } = useTripStore();
  const { user } = useAuthStore();

  const [destination,     setDestination]     = useState('');
  const [startDate,       setStartDate]       = useState<Date | null>(null);
  const [endDate,         setEndDate]         = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker,   setShowEndPicker]   = useState(false);
  const [adults,          setAdults]          = useState(2);
  const [kids,            setKids]            = useState(0);
  const [kidAges,         setKidAges]         = useState<number[]>([]);
  const [selectedVibes,   setSelectedVibes]   = useState<Vibe[]>(['Kid-Friendly', 'Foodie']);
  const [selectedAccess,  setSelectedAccess]  = useState<AccessibilityNeed[]>([]);
  const [pace,            setPace]            = useState<TripPace>('balanced');
  const [budget,          setBudget]          = useState<BudgetLevel>('mid-range');
  const [stayLocation,    setStayLocation]    = useState('');
  const [dietaryNeeds,    setDietaryNeeds]    = useState<DietaryNeed[]>([]);
  const [cuisinePrefs,    setCuisinePrefs]    = useState<CuisinePreference[]>(['Local']);
  const [step,            setStep]            = useState(1);
  const [showSummary,     setShowSummary]     = useState(false);
  const [errorMsg,        setErrorMsg]        = useState<string | null>(null);
  const [destSuggestions, setDestSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const isGuest = !user || user.isGuest;
  const remaining = DAILY_LIMIT_GUEST - (dailyGenerationCount ?? 0);

  const toggleVibe = (v: Vibe) =>
    setSelectedVibes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const toggleAccess = (id: AccessibilityNeed) =>
    setSelectedAccess(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleDietary = (id: DietaryNeed) =>
    setDietaryNeeds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleCuisine = (id: CuisinePreference) =>
    setCuisinePrefs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── Destination autocomplete — live geocoding + local fallback ─────────────
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDestinationChange = (text: string) => {
    setDestination(text);
    if (text.trim().length < 2) { setShowSuggestions(false); return; }
    const q = text.toLowerCase();

    // Immediate local matches
    const localMatches = POPULAR_DESTINATIONS.filter(d => d.toLowerCase().includes(q)).slice(0, 3);
    if (localMatches.length > 0) {
      setDestSuggestions(localMatches);
      setShowSuggestions(true);
    }

    // Debounced live geocoding for anything not in the local list
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(text.trim())}&count=5&language=en&format=json`,
        );
        if (!res.ok) return;
        const data = await res.json();
        const results: string[] = (data?.results ?? []).map((r: any) => {
          const parts = [r.name];
          if (r.admin1) parts.push(r.admin1);
          if (r.country) parts.push(r.country);
          return parts.join(', ');
        });
        if (results.length > 0) {
          // Merge local + remote, deduplicate
          const merged = [...new Set([...localMatches, ...results])].slice(0, 6);
          setDestSuggestions(merged);
          setShowSuggestions(true);
        }
      } catch {}
    }, 300);
  };

  const adjustKids = (delta: number) => {
    setKids(n => {
      const next = Math.max(0, Math.min(8, n + delta));
      setKidAges(prev => {
        if (next > prev.length) return [...prev, ...Array.from({ length: next - prev.length }, () => 6)];
        return prev.slice(0, next);
      });
      return next;
    });
  };

  const adjustKidAge = (index: number, delta: number) =>
    setKidAges(prev => prev.map((age, i) => i === index ? Math.max(0, Math.min(17, age + delta)) : age));

  const canGenerate = destination.trim().length > 2 && !!startDate && !!endDate && endDate >= startDate;

  // Show summary card before generating
  const handleBuildPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!canGenerate) return;
    if (isGuest && remaining <= 0) {
      Alert.alert(
        'Daily limit reached',
        'Guest accounts can generate 3 itineraries per day. Sign in for a higher limit.',
        [
          { text: 'Sign in', onPress: () => router.push('/auth/login') },
          { text: 'OK', style: 'cancel' },
        ],
      );
      return;
    }
    setShowSummary(true);
  };

  const handleGenerate = async () => {
    if (!canGenerate || !startDate || !endDate) return;
    setShowSummary(false);
    setErrorMsg(null);
    setGenerating(true);

    try {
      const tripInput = {
        destination,
        startDate,
        endDate,
        adults,
        kids,
        kidAges,
        accessibility: selectedAccess,
        vibes:         selectedVibes,
        includeDining: true,
        pace,
        budget,
        stayLocation: stayLocation.trim() || undefined,
        dietaryNeeds,
        cuisinePrefs,
      };

      const itinerary = await generateItinerary(tripInput);
      bumpDailyCount?.();
      setItinerary(itinerary);
      router.push('/itinerary');

    } catch (err: any) {
      console.error('[handleGenerate] failed:', { code: err?.code, message: err?.message });
      setErrorMsg(getApiErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  // ── Number of trip days ────────────────────────────────────────────────────
  const numDays = startDate && endDate
    ? Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1)
    : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.cream} />

      {/* Header */}
      <LinearGradient colors={Gradients.headerLight} style={styles.header}>
        <SlideUp delay={0}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Plan a Trip {getContextualEmoji(destination, selectedVibes)}</Text>
            </View>
            {isGuest && (
              <View style={[styles.limitBadge, remaining <= 1 && styles.limitBadgeLow]}>
                <Text style={[styles.limitBadgeText, remaining <= 1 && styles.limitBadgeTextLow]}>
                  {remaining} left today
                </Text>
              </View>
            )}
          </View>
        </SlideUp>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress bar */}
        <View style={styles.progressBar}>
          {[1, 2, 3].map(s => (
            <View key={s} style={styles.progressStep}>
              <View style={[styles.progressDot, s <= step && styles.progressDotActive]} />
              {s < 3 && <View style={[styles.progressLine, s < step && styles.progressLineActive]} />}
            </View>
          ))}
          <Text style={styles.progressLabel}>Step {step} of 3</Text>
        </View>

        {/* ── Step 1: Essentials ── */}
        {step === 1 && (<>
        {/* Destination */}
        <SlideUp delay={80}>
          <SectionHeader title="Where to?" />
          {/* Outer View must have zIndex so absolute dropdown floats over siblings */}
          <View style={styles.destWrapper}>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>🌍</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Barcelona, Japan, Bali..."
                placeholderTextColor={Colors.textLight}
                value={destination}
                onChangeText={handleDestinationChange}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
                autoCapitalize="words"
              />
              {destination.length > 0 && (
                <TouchableOpacity onPress={() => { setDestination(''); setShowSuggestions(false); }}>
                  <Text style={{ fontSize: 16, color: Colors.textLight, paddingHorizontal: 4 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            {/* Absolute dropdown — floats over content below, no layout shift */}
            {showSuggestions && (
              <View style={styles.suggestionsBox}>
                {destSuggestions.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.suggestionRow, i > 0 && styles.suggestionDivider]}
                    onPress={() => { setDestination(s); setShowSuggestions(false); }}
                  >
                    <Text style={styles.suggestionIcon}>📍</Text>
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Stay location (optional) */}
          <SectionHeader title="Where are you staying?" subtitle="Optional — routes each day from your accommodation" style={{ marginTop: Spacing.lg }} />
          <View style={styles.inputWrap}>
            <Text style={styles.inputIcon}>🏨</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Eixample, near Times Square, Shibuya..."
              placeholderTextColor={Colors.textLight}
              value={stayLocation}
              onChangeText={setStayLocation}
              autoCapitalize="words"
            />
            {stayLocation.length > 0 && (
              <TouchableOpacity onPress={() => setStayLocation('')}>
                <Text style={{ fontSize: 16, color: Colors.textLight, paddingHorizontal: 4 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </SlideUp>

        {/* Dates */}
        <SlideUp delay={160}>
          <SectionHeader title="When?" style={{ marginTop: Spacing.xl }} />
          <View style={styles.dateStack}>
            <PressScale onPress={() => setShowStartPicker(true)}>
              <View style={[styles.inputWrap, styles.dateBox]}>
                <Text style={styles.inputIcon}>🗓️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dateLabel}>Departing</Text>
                  <Text style={[styles.dateValue, !startDate && styles.datePlaceholder]}>
                    {startDate ? formatDate(startDate) : 'Tap to select'}
                  </Text>
                </View>
                {startDate && <Text style={styles.dateChevron}>✏️</Text>}
              </View>
            </PressScale>
            <PressScale onPress={() => setShowEndPicker(true)} style={{ marginTop: 10 }}>
              <View style={[styles.inputWrap, styles.dateBox]}>
                <Text style={styles.inputIcon}>🗓️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dateLabel}>Returning</Text>
                  <Text style={[styles.dateValue, !endDate && styles.datePlaceholder]}>
                    {endDate ? formatDate(endDate) : 'Tap to select'}
                  </Text>
                </View>
                {endDate && <Text style={styles.dateChevron}>✏️</Text>}
              </View>
            </PressScale>
          </View>
          {startDate && endDate && endDate < startDate && (
            <Text style={styles.dateError}>Return date must be after departure date</Text>
          )}
          {numDays && (
            <Text style={styles.dateSummary}>
              📆 {numDays} day{numDays !== 1 ? 's' : ''} · {formatDateShort(startDate!)} – {formatDateShort(endDate!)}
            </Text>
          )}

          {showStartPicker && (
            <DateTimePicker
              value={startDate ?? new Date()}
              mode="date"
              minimumDate={new Date()}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, selected) => {
                setShowStartPicker(Platform.OS === 'ios');
                if (selected) {
                  setStartDate(selected);
                  if (endDate && endDate < selected) setEndDate(null);
                }
                if (Platform.OS === 'android') setShowStartPicker(false);
              }}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={endDate ?? startDate ?? new Date()}
              mode="date"
              minimumDate={startDate ?? new Date()}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, selected) => {
                setShowEndPicker(Platform.OS === 'ios');
                if (selected) setEndDate(selected);
                if (Platform.OS === 'android') setShowEndPicker(false);
              }}
            />
          )}
        </SlideUp>

        {/* Group */}
        <SlideUp delay={240}>
          <SectionHeader title="Who's coming?" style={{ marginTop: Spacing.xl }} />
          <GlassCard style={styles.groupCard}>
            <View style={styles.counterRow}>
              <View>
                <Text style={styles.counterLabel}>Adults</Text>
                <Text style={styles.counterSub}>Age 13+</Text>
              </View>
              <View style={styles.counter}>
                <TouchableOpacity style={styles.counterBtn} onPress={() => setAdults(n => Math.max(1, n - 1))}>
                  <Text style={styles.counterBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.counterValue}>{adults}</Text>
                <TouchableOpacity style={styles.counterBtn} onPress={() => setAdults(n => Math.min(10, n + 1))}>
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.counterDivider} />
            <View style={styles.counterRow}>
              <View>
                <Text style={styles.counterLabel}>Kids</Text>
                <Text style={styles.counterSub}>Under 13</Text>
              </View>
              <View style={styles.counter}>
                <TouchableOpacity style={styles.counterBtn} onPress={() => adjustKids(-1)}>
                  <Text style={styles.counterBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.counterValue}>{kids}</Text>
                <TouchableOpacity style={styles.counterBtn} onPress={() => adjustKids(1)}>
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            {kids > 0 && (
              <View style={styles.kidsAgeRow}>
                <Text style={styles.kidsAgeLabel}>How old is each child?</Text>
                <View style={styles.kidsAgeGrid}>
                  {kidAges.map((age, i) => (
                    <View key={i} style={styles.kidAgeChip}>
                      <Text style={styles.kidAgeChipLabel}>Child {i + 1}</Text>
                      <View style={styles.kidAgeStepper}>
                        <TouchableOpacity style={styles.kidAgeBtn} onPress={() => adjustKidAge(i, -1)}>
                          <Text style={styles.kidAgeBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.kidAgeValue}>{age}</Text>
                        <TouchableOpacity style={styles.kidAgeBtn} onPress={() => adjustKidAge(i, 1)}>
                          <Text style={styles.kidAgeBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </GlassCard>
        </SlideUp>

        {/* Step 1 Next button */}
        <View style={styles.stepNav}>
          <View />
          <TouchableOpacity style={styles.stepNavBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep(2); }}>
            <Text style={styles.stepNavBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>
        </>)}

        {/* ── Step 2: Preferences ── */}
        {step === 2 && (<>
        {/* Trip Pace */}
        <SlideUp delay={300}>
          <SectionHeader title="Trip pace?" style={{ marginTop: Spacing.xl }} />
          <View style={styles.paceRow}>
            {PACE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setPace(opt.value)}
                activeOpacity={0.8}
                style={[styles.paceCard, pace === opt.value && styles.paceCardActive]}
              >
                <Text style={styles.paceIcon}>{opt.icon}</Text>
                <Text style={[styles.paceLabel, pace === opt.value && styles.paceLabelActive]}>{opt.label}</Text>
                <Text style={[styles.paceDesc, pace === opt.value && styles.paceDescActive]}>{opt.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SlideUp>

        {/* Budget */}
        <SlideUp delay={340}>
          <SectionHeader title="Budget level?" style={{ marginTop: Spacing.xl }} />
          <View style={styles.budgetRow}>
            {BUDGET_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setBudget(opt.value)}
                activeOpacity={0.8}
                style={[styles.budgetCard, budget === opt.value && styles.budgetCardActive]}
              >
                <Text style={styles.budgetIcon}>{opt.icon}</Text>
                <Text style={[styles.budgetLabel, budget === opt.value && styles.budgetLabelActive]}>{opt.label}</Text>
                <Text style={[styles.budgetDesc, budget === opt.value && styles.budgetDescActive]} numberOfLines={2}>{opt.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SlideUp>

        {/* Accessibility */}
        <SlideUp delay={380}>
          <SectionHeader title="Accessibility needs?" style={{ marginTop: Spacing.xl }} />
          <View style={styles.accessRow}>
            {ACCESS_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => toggleAccess(opt.id)}
                activeOpacity={0.8}
                style={[styles.accessCard, selectedAccess.includes(opt.id) && styles.accessCardSelected]}
              >
                <Text style={styles.accessIcon}>{opt.icon}</Text>
                <Text style={[styles.accessLabel, selectedAccess.includes(opt.id) && styles.accessLabelOn]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SlideUp>

        {/* Vibes */}
        <SlideUp delay={440}>
          <SectionHeader title="Pick your vibe" subtitle="Select all that apply" style={{ marginTop: Spacing.xl }} />
          <View style={styles.vibesGrid}>
            {VIBES.map(v => (
              <Chip
                key={v.label}
                label={v.label}
                icon={v.icon}
                selected={selectedVibes.includes(v.label)}
                onPress={() => toggleVibe(v.label)}
              />
            ))}
          </View>
        </SlideUp>

        {/* Step 2 nav buttons */}
        <View style={styles.stepNav}>
          <TouchableOpacity style={styles.stepNavBtnBack} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep(1); }}>
            <Text style={styles.stepNavBtnBackText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stepNavBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep(3); }}>
            <Text style={styles.stepNavBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>
        </>)}

        {/* ── Step 3: Dietary & Cuisine ── */}
        {step === 3 && (<>
        {/* Dining & cuisine (always included — dietary/cuisine prefs feed the AI) */}
        <SlideUp delay={500}>
          <GlassCard style={styles.groupCard}>
            <SectionHeader title="🥗 Dietary needs" subtitle="We'll filter dining options to match" compact />
            <View style={styles.chipWrap}>
              {DIETARY_OPTIONS.map(d => (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => toggleDietary(d.id)}
                  style={[styles.filterChip, dietaryNeeds.includes(d.id) && styles.filterChipActive]}
                >
                  <Text style={styles.filterChipIcon}>{d.icon}</Text>
                  <Text style={[styles.filterChipText, dietaryNeeds.includes(d.id) && styles.filterChipTextActive]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <SectionHeader title="🌍 Cuisine preferences" subtitle="Pick all that appeal — 2-3 restaurant options per meal" compact style={{ marginTop: Spacing.lg }} />
            <View style={styles.chipWrap}>
              {CUISINE_OPTIONS.map(c => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => toggleCuisine(c.id)}
                  style={[styles.filterChip, cuisinePrefs.includes(c.id) && styles.filterChipActive]}
                >
                  <Text style={styles.filterChipIcon}>{c.icon}</Text>
                  <Text style={[styles.filterChipText, cuisinePrefs.includes(c.id) && styles.filterChipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </SlideUp>

        {/* Step 3 Back + CTA */}
        <View style={styles.stepNav}>
          <TouchableOpacity style={styles.stepNavBtnBack} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setStep(2); }}>
            <Text style={styles.stepNavBtnBackText}>← Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>

        {/* CTA */}
        <SlideUp delay={560}>
          <View style={styles.ctaWrap}>
            <Button
              label={isGenerating ? 'Building…' : '✨  Build My Itinerary'}
              onPress={handleBuildPress}
              disabled={!canGenerate || isGenerating}
              loading={isGenerating}
              style={styles.ctaButton}
            />
            {!canGenerate && (
              <Text style={styles.ctaHint}>
                {!destination.trim()
                  ? 'Enter a destination to continue'
                  : !startDate || !endDate
                  ? '👆 Select your travel dates above to continue'
                  : 'Return date must be after departure'}
              </Text>
            )}
            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️  {errorMsg}</Text>
              </View>
            )}
          </View>
        </SlideUp>
        </>)}
      </ScrollView>

      {/* ── Pre-generation summary card ───────────────────────────────────── */}
      {showSummary && startDate && endDate && (
        <View style={styles.summaryOverlay}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Ready to build? {getContextualEmoji(destination, selectedVibes)}</Text>
            <Text style={styles.summaryDestination}>{destination}</Text>

            {/* Scrollable so all rows visible on small screens */}
            <ScrollView
              style={styles.summaryScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <SummaryRow icon="🛫" label={formatDate(startDate)} sub="Departure" />
              <SummaryRow icon="🛬" label={formatDate(endDate)} sub={`Return · ${numDays} day${numDays !== 1 ? 's' : ''}`} />
              <SummaryRow icon="👨‍👩‍👧" label={`${adults} adult${adults !== 1 ? 's' : ''}${kids > 0 ? `, ${kids} kid${kids !== 1 ? 's' : ''}` : ''}`} />
              <SummaryRow icon="⚖️" label={PACE_OPTIONS.find(p => p.value === pace)!.label + ' pace'} />
              <SummaryRow icon="💳" label={BUDGET_OPTIONS.find(b => b.value === budget)!.label} />
              {stayLocation.trim() && (
                <SummaryRow icon="🏨" label={stayLocation.trim()} sub="Staying near" />
              )}
              {selectedVibes.length > 0 && (
                <SummaryRow icon="🎯" label={selectedVibes.join(' · ')} />
              )}
              {selectedAccess.length > 0 && (
                <SummaryRow icon="♿" label={selectedAccess.map(a => ACCESS_OPTIONS.find(o => o.id === a)?.label).join(', ')} />
              )}
              {dietaryNeeds.length > 0 && (
                <SummaryRow icon="🥗" label={dietaryNeeds.join(', ')} sub="Dietary" />
              )}
              {cuisinePrefs.length > 0 && (
                <SummaryRow icon="🍴" label={cuisinePrefs.join(' · ')} sub="Cuisine" />
              )}
            </ScrollView>

            <View style={styles.summaryActions}>
              <TouchableOpacity
                onPress={() => setShowSummary(false)}
                style={styles.summaryEditBtn}
              >
                <Text style={styles.summaryEditText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleGenerate}
                style={styles.summaryConfirmBtn}
              >
                <LinearGradient colors={Gradients.primaryCTA} style={styles.summaryConfirmGradient}>
                  <Text style={styles.summaryConfirmText}>Build it! ✨</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Generating overlay */}
      <GeneratingOverlay
        visible={isGenerating}
        destination={destination}
        kids={kids}
        accessibility={selectedAccess}
        includeDining={true}
      />
    </View>
  );
}

function SummaryRow({ icon, label, sub }: { icon: string; label: string; sub?: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryRowIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.summaryRowLabel}>{label}</Text>
        {sub && <Text style={styles.summaryRowSub}>{sub}</Text>}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.cream },
  header: {
    paddingTop: Platform.OS === 'ios' ? 58 : 40,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerRow:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerTitle:  { fontSize: Typography['3xl'], fontFamily: Typography.black, color: Colors.textDark },
  headerSub:    { fontSize: Typography.base, fontFamily: Typography.regular, color: Colors.textMid, marginTop: 3 },

  limitBadge: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full, marginTop: 4,
    backgroundColor: 'rgba(232,101,26,0.10)',
    borderWidth: 1, borderColor: 'rgba(232,101,26,0.25)',
  },
  limitBadgeLow: { backgroundColor: 'rgba(231,76,60,0.12)', borderColor: 'rgba(231,76,60,0.35)' },
  limitBadgeText: { fontSize: Typography.xs, fontFamily: Typography.bold, color: Colors.primary },
  limitBadgeTextLow: { color: Colors.danger },

  scroll:        { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 120 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: 'rgba(232,101,26,0.15)',
    paddingHorizontal: Spacing.md, height: 54, ...Shadow.soft,
  },
  inputIcon:  { fontSize: 18, marginRight: 10 },
  textInput:  { flex: 1, fontSize: Typography.base, fontFamily: Typography.regular, color: Colors.textDark },

  // Destination wrapper: high zIndex so absolute dropdown floats above siblings
  destWrapper: { zIndex: 200, elevation: 200 },

  // Absolute dropdown — floats over content, no layout shift
  suggestionsBox: {
    position: 'absolute',
    top: 56,          // inputWrap height (54) + 2px gap
    left: 0, right: 0,
    zIndex: 200, elevation: 20,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: 'rgba(232,101,26,0.2)',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8,
  },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 13,
  },
  suggestionDivider: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  suggestionIcon: { fontSize: 14, marginRight: 10 },
  suggestionText: { fontSize: Typography.sm, fontFamily: Typography.semiBold, color: Colors.textDark, flex: 1 },

  dateStack:       { gap: 0 },
  dateBox:         { height: 70 },
  dateLabel:       { fontSize: Typography.xs, fontFamily: Typography.semiBold, color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateValue:       { fontSize: Typography.base, fontFamily: Typography.bold, color: Colors.textDark, marginTop: 3 },
  datePlaceholder: { color: Colors.textLight, fontFamily: Typography.regular },
  dateChevron:     { fontSize: 14, marginLeft: 4 },
  dateError:       { fontSize: Typography.xs, fontFamily: Typography.semiBold, color: Colors.danger, marginTop: 8, textAlign: 'center' },
  dateSummary:     { fontSize: Typography.xs, fontFamily: Typography.semiBold, color: Colors.primary, marginTop: 8, textAlign: 'center' },

  groupCard:    { padding: Spacing.md, backgroundColor: Colors.surface },
  counterRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  counterLabel: { fontSize: Typography.base, fontFamily: Typography.bold, color: Colors.textDark },
  counterSub:   { fontSize: Typography.xs, fontFamily: Typography.regular, color: Colors.textLight, marginTop: 2 },
  counter:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: Colors.creamDark, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(232,101,26,0.18)',
  },
  counterBtnText: { fontSize: Typography.lg, fontFamily: Typography.bold, color: Colors.primary, lineHeight: 22 },
  counterValue:   { fontSize: Typography.xl, fontFamily: Typography.extraBold, color: Colors.textDark, minWidth: 28, textAlign: 'center' },
  counterDivider: { height: 1, backgroundColor: 'rgba(232,101,26,0.08)', marginVertical: 4 },
  kidsAgeRow:     { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(232,101,26,0.08)' },
  kidsAgeLabel:   { fontSize: Typography.sm, fontFamily: Typography.semiBold, color: Colors.textMid, marginBottom: 10 },
  kidsAgeGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kidAgeChip: {
    backgroundColor: Colors.creamDark, borderRadius: Radius.lg,
    paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(232,101,26,0.12)', alignItems: 'center', gap: 6,
  },
  kidAgeChipLabel: { fontSize: Typography.xs, fontFamily: Typography.semiBold, color: Colors.textLight },
  kidAgeStepper:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kidAgeBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(232,101,26,0.20)',
  },
  kidAgeBtnText: { fontSize: Typography.md, fontFamily: Typography.bold, color: Colors.primary, lineHeight: 22 },
  kidAgeValue:   { fontSize: Typography.base, fontFamily: Typography.extraBold, color: Colors.textDark, minWidth: 22, textAlign: 'center' },

  // Pace
  paceRow:       { flexDirection: 'row', gap: 10 },
  paceCard: {
    flex: 1, alignItems: 'center', padding: 12,
    borderRadius: Radius.lg, borderWidth: 2,
    borderColor: 'rgba(232,101,26,0.18)',
    backgroundColor: Colors.surface, ...Shadow.soft,
  },
  paceCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  paceIcon:        { fontSize: 22, marginBottom: 4 },
  paceLabel:       { fontSize: Typography.sm, fontFamily: Typography.bold, color: Colors.textDark, textAlign: 'center' },
  paceLabelActive: { color: '#fff' },
  paceDesc:        { fontSize: Typography.xs, fontFamily: Typography.regular, color: Colors.textLight, textAlign: 'center', marginTop: 4, lineHeight: 14 },
  paceDescActive:  { color: 'rgba(255,255,255,0.75)' },

  // Budget
  budgetRow:       { flexDirection: 'row', gap: 10 },
  budgetCard: {
    flex: 1, alignItems: 'center', padding: 12,
    borderRadius: Radius.lg, borderWidth: 2,
    borderColor: 'rgba(232,101,26,0.18)',
    backgroundColor: Colors.surface, ...Shadow.soft,
  },
  budgetCardActive:  { borderColor: Colors.primary, backgroundColor: Colors.primary },
  budgetIcon:        { fontSize: 22, marginBottom: 4 },
  budgetLabel:       { fontSize: Typography.sm, fontFamily: Typography.bold, color: Colors.textDark, textAlign: 'center' },
  budgetLabelActive: { color: '#fff' },
  budgetDesc:        { fontSize: Typography.xs, fontFamily: Typography.regular, color: Colors.textLight, textAlign: 'center', marginTop: 4, lineHeight: 14 },
  budgetDescActive:  { color: 'rgba(255,255,255,0.75)' },

  accessRow: { flexDirection: 'row', gap: 10 },
  accessCard: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: 8,
    borderRadius: Radius.lg, borderWidth: 2, borderColor: 'rgba(232,101,26,0.18)',
    backgroundColor: Colors.surface, ...Shadow.soft,
  },
  accessCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  accessIcon:         { fontSize: 24, marginBottom: 6 },
  accessLabel:        { fontSize: Typography.xs, fontFamily: Typography.semiBold, color: Colors.textMid, textAlign: 'center' },
  accessLabelOn:      { color: '#fff' },

  vibesGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },

  diningCard:     { marginTop: Spacing.xl, padding: Spacing.md, backgroundColor: Colors.surface },
  diningRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  diningTitle:    { fontSize: Typography.base, fontFamily: Typography.bold, color: Colors.textDark },
  diningSubtitle: { fontSize: Typography.xs, fontFamily: Typography.regular, color: Colors.textMid, marginTop: 3, lineHeight: 16 },
  toggle:         { width: 50, height: 28, borderRadius: Radius.full, backgroundColor: 'rgba(232,101,26,0.18)', padding: 3, justifyContent: 'center' },
  toggleOn:       { backgroundColor: Colors.primary },
  toggleThumb:    { width: 22, height: 22, borderRadius: Radius.full, backgroundColor: '#fff', ...Shadow.soft },
  toggleThumbOn:  { alignSelf: 'flex-end' },

  mealTimingBlock: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(232,101,26,0.08)' },
  mealTimingRow:   { gap: 8 },
  mealTimingLabel: { fontSize: Typography.sm, fontFamily: Typography.semiBold, color: Colors.textMid, marginBottom: 6 },
  timeScroll:      { flexGrow: 0 },
  timeChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full,
    backgroundColor: Colors.creamDark, marginRight: 8,
    borderWidth: 1.5, borderColor: 'rgba(232,101,26,0.15)',
  },
  timeChipActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeChipText:      { fontSize: Typography.sm, fontFamily: Typography.semiBold, color: Colors.textMid },
  timeChipTextActive:{ color: '#fff' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.sm },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: 'rgba(232,101,26,0.2)',
    backgroundColor: Colors.surface,
  },
  filterChipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipIcon:       { fontSize: 14 },
  filterChipText:       { fontSize: Typography.sm, fontFamily: Typography.semiBold, color: Colors.textMid },
  filterChipTextActive: { color: '#fff' },

  // Progress bar
  progressBar: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg, paddingHorizontal: Spacing.sm },
  progressStep: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  progressDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.creamDark, borderWidth: 2, borderColor: 'rgba(240,90,40,0.2)' },
  progressDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  progressLine: { flex: 1, height: 3, backgroundColor: Colors.creamDark, marginHorizontal: 4 },
  progressLineActive: { backgroundColor: Colors.primary },
  progressLabel: { fontSize: Typography.xs, fontFamily: Typography.semiBold, color: Colors.textMid, marginLeft: Spacing.sm },

  // Step navigation
  stepNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xl },
  stepNavBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    borderRadius: Radius.full, backgroundColor: Colors.primary,
    ...Shadow.soft,
  },
  stepNavBtnText: { fontSize: Typography.base, fontFamily: Typography.bold, color: '#fff' },
  stepNavBtnBack: {
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    borderRadius: Radius.full, borderWidth: 2, borderColor: 'rgba(240,90,40,0.25)',
  },
  stepNavBtnBackText: { fontSize: Typography.base, fontFamily: Typography.bold, color: Colors.textMid },

  ctaWrap:   { marginTop: Spacing.xl },
  ctaButton: { ...Shadow.glow },
  ctaHint:   { textAlign: 'center', marginTop: Spacing.sm, fontSize: Typography.xs, fontFamily: Typography.regular, color: Colors.textLight },
  errorBox: {
    marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg,
    backgroundColor: 'rgba(231,76,60,0.08)', borderWidth: 1, borderColor: 'rgba(231,76,60,0.22)',
  },
  errorText: { fontSize: Typography.sm, fontFamily: Typography.semiBold, color: Colors.danger, textAlign: 'center', lineHeight: 20 },

  // Summary overlay
  summaryOverlay: {
    ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end', zIndex: 100,
  },
  summaryCard: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'], padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    maxHeight: SCREEN_H * 0.80,   // never taller than 80% of screen
  },
  summaryScroll:      { maxHeight: SCREEN_H * 0.45, marginBottom: Spacing.lg },
  summaryTitle:       { fontSize: Typography.lg, fontFamily: Typography.bold, color: Colors.textMid, marginBottom: 4 },
  summaryDestination: { fontSize: Typography['2xl'], fontFamily: Typography.black, color: Colors.textDark, marginBottom: Spacing.md },
  summaryRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  summaryRowIcon:     { fontSize: 16, width: 24 },
  summaryRowLabel:    { fontSize: Typography.sm, fontFamily: Typography.semiBold, color: Colors.textDark, flex: 1 },
  summaryRowSub:      { fontSize: Typography.xs, fontFamily: Typography.regular, color: Colors.textLight },
  summaryActions:     { flexDirection: 'row', gap: 12 },
  summaryEditBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: Radius.full,
    borderWidth: 2, borderColor: 'rgba(232,101,26,0.25)',
  },
  summaryEditText:       { fontSize: Typography.base, fontFamily: Typography.bold, color: Colors.textMid },
  summaryConfirmBtn:     { flex: 2, borderRadius: Radius.full, overflow: 'hidden', ...Shadow.glow },
  summaryConfirmGradient:{ paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  summaryConfirmText:    { fontSize: Typography.base, fontFamily: Typography.extraBold, color: '#fff' },
});
