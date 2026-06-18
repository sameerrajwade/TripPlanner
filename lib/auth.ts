import auth from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { User } from '../types';

// ─── Google Sign-In configuration ─────────────────────────────────────────────
// Web Client ID (type 3 OAuth client) from the Firebase project's google-services.json
GoogleSignin.configure({
  webClientId: '995597164731-2gq1uq99kipj3i756glfc414mq7qspve.apps.googleusercontent.com',
  offlineAccess: false,
});

// ─── Google Sign-In ────────────────────────────────────────────────────────────
export async function signInWithGoogle(): Promise<User> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  const idToken = (response as any).idToken ?? (response as any).data?.idToken;
  if (!idToken) throw new Error('No ID token returned from Google Sign-In.');
  const credential = auth.GoogleAuthProvider.credential(idToken);
  const { user } = await auth().signInWithCredential(credential);
  return mapFirebaseUser(user);
}

export function isGoogleSignInCancelled(err: any): boolean {
  return err?.code === statusCodes.SIGN_IN_CANCELLED;
}

// ─── Map Firebase user to our User type ───────────────────────────────────────
export function mapFirebaseUser(fbUser: any): User {
  return {
    uid: fbUser.uid,
    email: fbUser.email ?? null,
    displayName: fbUser.displayName ?? null,
    photoURL: fbUser.photoURL ?? null,
    isGuest: false,
  };
}

// ─── Email / Password Sign In ─────────────────────────────────────────────────
export async function signInWithEmail(email: string, password: string): Promise<User> {
  const { user } = await auth().signInWithEmailAndPassword(email.trim(), password);
  return mapFirebaseUser(user);
}

// ─── Register with Email ──────────────────────────────────────────────────────
export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<User> {
  const { user } = await auth().createUserWithEmailAndPassword(email.trim(), password);
  if (displayName?.trim()) {
    await user.updateProfile({ displayName: displayName.trim() });
  }
  return mapFirebaseUser({ ...user, displayName: displayName ?? user.displayName });
}

// ─── Password Reset ───────────────────────────────────────────────────────────
export async function sendPasswordReset(email: string): Promise<void> {
  await auth().sendPasswordResetEmail(email.trim());
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────
export async function signOutUser(): Promise<void> {
  await auth().signOut();
}

// ─── Auth State Observer — returns unsubscribe fn ────────────────────────────
export function subscribeToAuthChanges(
  callback: (user: User | null) => void,
): () => void {
  return auth().onAuthStateChanged(fbUser => {
    callback(fbUser ? mapFirebaseUser(fbUser) : null);
  });
}

// ─── Map Firebase error codes to friendly messages ───────────────────────────
export function getAuthErrorMessage(err: any): string {
  const code: string = err?.code ?? '';
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'No internet connection. Please check your network.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled. Contact support.';
    default:
      if (err?.message?.includes('Firebase')) {
        return 'Firebase is not configured yet. Add google-services.json to enable auth.';
      }
      return 'Authentication failed. Please try again.';
  }
}
