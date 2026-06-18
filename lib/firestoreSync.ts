// ─── Firestore sync layer for saved trips ────────────────────────────────────
// AsyncStorage remains the source of truth for instant offline access;
// this layer mirrors trips to Firestore when the user is signed in, so trips
// survive reinstalls and sync across devices. Fails silently when Firebase
// isn't configured yet — the app works fully offline-first regardless.
//
// Firestore structure:
//   /users/{uid}/trips/{tripId}  →  serialized Itinerary

import firestore from '@react-native-firebase/firestore';
import { Itinerary } from '../types';

function tripsCollection(uid: string) {
  return firestore().collection('users').doc(uid).collection('trips');
}

// ─── Push a trip up to the cloud (called after local save) ───────────────────
export async function syncTripToCloud(uid: string, itinerary: Itinerary): Promise<void> {
  try {
    await tripsCollection(uid).doc(itinerary.id).set({
      ...itinerary,
      generatedAt: itinerary.generatedAt.toISOString(),
      tripInput: {
        ...itinerary.tripInput,
        startDate: itinerary.tripInput.startDate.toISOString(),
        endDate:   itinerary.tripInput.endDate.toISOString(),
      },
      syncedAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (_) {
    // Offline or Firebase not configured — local save already succeeded, no-op
  }
}

// ─── Remove a trip from the cloud ─────────────────────────────────────────────
export async function removeTripFromCloud(uid: string, tripId: string): Promise<void> {
  try {
    await tripsCollection(uid).doc(tripId).delete();
  } catch (_) {}
}

// ─── Pull all trips from the cloud (e.g. after sign-in on a new device) ──────
export async function fetchTripsFromCloud(uid: string): Promise<Itinerary[]> {
  try {
    const snap = await tripsCollection(uid).orderBy('syncedAt', 'desc').get();
    return snap.docs.map(doc => {
      const raw: any = doc.data();
      return {
        ...raw,
        generatedAt: new Date(raw.generatedAt),
        tripInput: {
          ...raw.tripInput,
          startDate: new Date(raw.tripInput.startDate),
          endDate:   new Date(raw.tripInput.endDate),
        },
      } as Itinerary;
    });
  } catch (_) {
    return [];
  }
}

// ─── Merge cloud + local trips (cloud wins on conflict by id) ────────────────
export function mergeTrips(local: Itinerary[], cloud: Itinerary[]): Itinerary[] {
  const map = new Map<string, Itinerary>();
  local.forEach(t => map.set(t.id, t));
  cloud.forEach(t => map.set(t.id, t)); // cloud overwrites local on same id
  return Array.from(map.values()).sort(
    (a, b) => b.generatedAt.getTime() - a.generatedAt.getTime(),
  );
}
