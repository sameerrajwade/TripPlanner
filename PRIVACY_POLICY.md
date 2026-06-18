# FamilyQuest Privacy Policy (Stub — replace with hosted version before Play Store submission)

_Last updated: [DATE]_

## What we collect

- **Account info**: email address (if you sign in), display name/initials shown in-app.
- **Trip data**: destinations, travel dates, group composition (number of adults and
  children), and **children's ages**, which you provide to personalise itineraries.
  Ages are stored only as numbers (e.g. "8"), never names, photos, or other
  identifying information about children.
- **Device/usage**: basic crash and rate-limit telemetry to keep the service reliable.

## Children's data (COPPA notice)

FamilyQuest is intended for use **by parents/guardians** planning trips on behalf of
their family. We do not knowingly collect personal information directly from children
under 13. The only child-related data point is an **age number** entered by the
parent to tailor activity recommendations (e.g. ride height limits, nap schedules).
This data:

- is associated with the parent's account, not a separate child account,
- is never used for advertising or shared with third parties,
- can be deleted at any time by deleting the associated saved trip or account.

If you are a parent and believe your child has provided us with personal information
beyond what is described here, contact us at **[SUPPORT EMAIL]** and we will delete it.

## How we use your data

- To generate AI-powered itineraries (sent to Google's Gemini API for processing —
  see Google's privacy policy for how prompt data is handled on their end).
- To sync your saved trips across your devices when signed in (stored in Firebase
  Cloud Firestore, access-controlled so only you can read/write your own data).
- To show optional destination photos (queries sent to Unsplash; no personal data
  included in image search requests).

## Data retention & deletion

Saved trips are stored locally on your device and, if signed in, mirrored to your
private Firestore record. Deleting a trip removes it from both. Deleting your
account removes all associated cloud data.

## Third-party services

- **Google Firebase** (Auth, Firestore, Cloud Functions) — see Google's privacy policy
- **Google Gemini API** — processes trip-planning prompts to generate itineraries
- **Unsplash API** — supplies destination photography (search-query only, no PII)

## Contact

Questions about this policy or your data: **[SUPPORT EMAIL]**

---
> ⚠️ **Before Play Store submission**: host this on a public URL (e.g. via
> termly.io or a simple GitHub Pages page), fill in `[DATE]` and `[SUPPORT EMAIL]`,
> and link it from Settings → Privacy Policy and your Play Console listing.
