import { Redirect } from 'expo-router';
import { useAuthStore } from '../store';

// Smart redirect based on auth state.
// Splash hides only after both fonts + auth are resolved (see _layout.tsx),
// so by the time this renders the decision is always known.
export default function Index() {
  const { user, isLoading } = useAuthStore();

  // Still waiting for auth state — stay on splash (null renders nothing)
  if (isLoading) return null;

  // Authenticated user → straight to app
  if (user) return <Redirect href="/(tabs)" />;

  // No user / guest → welcome screen
  return <Redirect href="/auth/welcome" />;
}
