# Ledger

A habit tracker for desktop, tablet and phone: check habits off in a tap, keep streaks honest with rest days, and see any period of progress: week, month, year, or a custom From–Until range.

Design: [`docs/superpowers/specs/2026-11-10-ledger-habit-tracker-design.md`](docs/superpowers/specs/2026-11-10-ledger-habit-tracker-design.md) · Logo: [`docs/brand/`](docs/brand)

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + end-to-end tests (Vitest)
npm run build      # type-check + production build into dist/
```

Without any keys the app runs in **demo mode**: accounts and data live only in this browser's storage. A banner says so.

## Connect Firebase (free plan)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and click **Add project** (Google Analytics is not needed).
2. **Build › Authentication › Get started**, then enable **Email/Password**.
3. **Authentication › Settings › Authorized domains**: add your Vercel domain, e.g. `your-app.vercel.app`.
4. **Build › Firestore Database › Create database**: production mode, location `eur3 (europe-west)` or the one nearest you. Then open the **Rules** tab, paste the contents of [`firestore.rules`](firestore.rules) and click **Publish**.
5. **Project settings › General › Your apps**: add a **Web app** (`</>`) and copy `apiKey`, `authDomain`, `projectId` and `appId`.
6. In **Vercel › Settings › Environment Variables**, add `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_APP_ID`. Then **redeploy**: the keys are built in at build time.
7. Optional: under **Authentication › Templates**, set the sender name of the confirmation and reset emails to "Ledger".

On the free plan, deleting an account removes it immediately (there are no scheduled jobs), profile photos are stored as small 256 px images inside the profile, and "Sign out everywhere" is hidden.

Firebase sends the confirmation and password-reset emails itself, so no separate email service is needed.

### Supabase (alternative)

The Supabase version is still included: run `supabase/migrations/` in a Supabase project, add its URL and its `/login` and `/update-password` redirect URLs under Authentication › URL Configuration, and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. It is used only when the Firebase keys are empty.

## Before anyone else signs up

- Replace the placeholder text on `/privacy` and `/terms` (`src/features/legal/LegalPage.tsx`).
- Google sign-in (later): it must use Google's official button and needs the privacy policy and a domain.

## How the code is organised

| Layer | Folder | Depends on |
|---|---|---|
| Domain: dates, schedules, streaks and stats, import/export format. Pure TypeScript, fully unit-tested | `src/domain` | nothing |
| Data: interfaces (`ports.ts`) with three implementations: Firebase, Supabase and the local demo | `src/data` | domain |
| State: queries, optimistic writes with rollback, forms, export/import | `src/state` | domain, data interfaces |
| UI kit: buttons, fields, dialog/bottom sheet, toast, banner, calendar grid, date picker | `src/ui` | nothing app-specific |
| Features: one folder per screen | `src/features` | all of the above |

Rules the code follows:

- **One source of truth for numbers.** Every streak, percentage and chart shade comes from `LedgerStats`, so screens always agree.
- **Screens depend on interfaces, not Supabase.** Firebase was added this way: one new implementation of `ports.ts`, with no screen changes. What a backend can't do (for example, sign out on every device) is declared in its `capabilities`, and the screens adapt.
- **One way to write data.** `useOptimistic` updates the screen at once, saves in the background, and rolls back with an error toast and Retry if saving fails.
- **One component per pattern.** One toast system (bottom center, 5 s, pauses on hover), one dialog that becomes a bottom sheet on phones, one calendar grid behind every calendar, and one set of design tokens in `tailwind.config.js`.
- The app name lives in `src/app/config.ts` only.
