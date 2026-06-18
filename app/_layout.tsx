import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore, useTripStore } from '../store';
import { subscribeToAuthChanges } from '../lib/auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Load fonts — failures fall back to system font silently
  useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  const { setUser, setLoading } = useAuthStore();
  const { loadSavedTrips, loadDailyCount, syncFromCloud } = useTripStore();

  useEffect(() => {
    loadSavedTrips();
    loadDailyCount();

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToAuthChanges((firebaseUser) => {
        setUser(firebaseUser);
        setLoading(false);
        if (firebaseUser) syncFromCloud(firebaseUser.uid);
      });
    } catch {
      setLoading(false);
    }

    // Always hide splash after 4 seconds maximum — no matter what
    const hide = setTimeout(() => {
      setLoading(false);
      SplashScreen.hideAsync().catch(() => {});
    }, 4000);

    return () => {
      unsubscribe?.();
      clearTimeout(hide);
    };
  }, []);

  // Render the navigator immediately — no blocking null return.
  // The native splash screen stays visible until hideAsync() fires.
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/welcome" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="itinerary" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}
