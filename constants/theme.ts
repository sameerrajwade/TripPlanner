// ─── Roamly Design System — "Golden Hour" Theme ─────────────────────────────
// Deep dusk purple → warm amber · No competitor owns this space in travel apps

export const Colors = {
  // ── Brand / CTA ───────────────────────────────────────────────────────────
  primary:      '#F05A28',   // Saturated orange — all CTAs
  primaryLight: '#F0832E',
  primaryDark:  '#C4501A',
  primaryGlow:  'rgba(240, 90, 40, 0.45)',

  // ── Golden accent ─────────────────────────────────────────────────────────
  gold:         '#F5A623',   // Golden yellow accent
  goldLight:    '#F9C15E',
  goldDark:     '#D4891A',

  // ── Hero / dark surfaces (dusk purple) ────────────────────────────────────
  dusk:         '#0D0520',   // Deepest background
  duskMid:      '#1C1035',   // Mid purple
  duskPurple:   '#3D1F6E',   // Purple zone
  duskBurn:     '#7B3F00',   // Burn/amber bridge
  duskGlow:     'rgba(232, 101, 26, 0.30)',

  // ── Light surfaces (content screens) ─────────────────────────────────────
  cream:        '#F5F5FA',   // Cool neutral background
  creamDark:    '#EEEEF4',   // Slightly deeper cool neutral
  surface:      '#FFFFFF',
  surfaceWarm:  '#FFFBF7',

  // ── Glass / overlay ───────────────────────────────────────────────────────
  glassLight:   'rgba(255, 248, 240, 0.75)',
  glassDark:    'rgba(12, 5, 32, 0.80)',
  glassBorder:  'rgba(232, 101, 26, 0.18)',
  glassBorderDark: 'rgba(255, 255, 255, 0.12)',

  // ── Text ──────────────────────────────────────────────────────────────────
  textDark:     '#1C1C2E',   // Cool near-black
  textMid:      '#6B5444',   // Slightly darker mid-brown
  textLight:    '#8A5A3A',   // Better WCAG AA contrast
  textOnDark:   '#FFF8F0',
  textOnPrimary:'#FFFFFF',

  // ── Semantic ──────────────────────────────────────────────────────────────
  success:      '#43C97A',
  mint:         '#00E5A0',   // Mint/success accent
  warning:      '#F5A623',
  danger:       '#E74C3C',
  info:         '#8B5CF6',   // Purple — stays on-brand

  // ── Activity category colors ──────────────────────────────────────────────
  catActivity:  '#E8651A',   // Orange — activities
  catDining:    '#C0392B',   // Red — dining
  catTransit:   '#8B5CF6',   // Purple — transit
  catRest:      '#B07050',   // Muted — rest
};

export const Gradients = {
  heroWelcome: ['#0A0118', '#1A0B3E', '#2D1B69', '#4A2B8F', '#6C3FC0'] as const,
  heroItinerary: ['#0A0118', '#1A0B3E', '#2D1B69', '#4A2B8F', '#5B3DAE'] as const,
  headerLight: ['#F5F5FA', '#EEEEF4'] as const,
  primaryCTA:  ['#F05A28', '#C4501A'] as const,
  glow:        ['transparent', 'rgba(232,101,26,0.18)', 'rgba(232,101,26,0.42)'] as const,
};

export const Typography = {
  regular:   'Nunito_400Regular',
  semiBold:  'Nunito_600SemiBold',
  bold:      'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
  black:     'Nunito_900Black',

  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  '2xl': 28,
  '3xl': 34,
  '4xl': 42,
};

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  '2xl': 48,
  '3xl': 64,
};

export const Radius = {
  sm:   8,
  md:   14,
  lg:   20,
  xl:   28,
  '2xl': 36,
  full: 999,
};

export const Shadow = {
  soft: {
    shadowColor: '#2D1B0E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  medium: {
    shadowColor: '#2D1B0E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  strong: {
    shadowColor: '#0D0520',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 30,
    elevation: 16,
  },
  glow: {
    shadowColor: '#F05A28',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
};
