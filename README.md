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

Without Supabase keys the app runs in **demo mode**: accounts and data live only in this browser's storage. A banner says so.

## Connect Supabase

1. Create a project at supabase.com. Pick the **EU (Frankfurt)** region.
2. Run the migration in `supabase/migrations/` (SQL editor, or `supabase db push` with the Supabase CLI). It creates the tables, privacy rules (row-level security), the avatars bucket, the import function and the daily job that removes accounts 7 days after deletion. If the `pg_cron` line fails, enable **pg_cron** under Database › Extensions and run the file again.
3. Under Authentication › URL Configuration, add your site URL plus `/login` and `/update-password` as redirect URLs.
4. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Project Settings › API).

## Before anyone else signs up

- Set up a real email service (custom SMTP, for example Resend) with your own domain. Supabase's built-in sender is only meant for testing.
- Replace the placeholder text on `/privacy` and `/terms` (`src/features/legal/LegalPage.tsx`).
- Google sign-in (later): it must use Google's official button and needs the privacy policy and a domain.

## How the code is organised

| Layer | Folder | Depends on |
|---|---|---|
| Domain: dates, schedules, streaks and stats, import/export format. Pure TypeScript, fully unit-tested | `src/domain` | nothing |
| Data: interfaces (`ports.ts`) with two implementations, Supabase and local demo | `src/data` | domain |
| State: queries, optimistic writes with rollback, forms, export/import | `src/state` | domain, data interfaces |
| UI kit: buttons, fields, dialog/bottom sheet, toast, banner, calendar grid, date picker | `src/ui` | nothing app-specific |
| Features: one folder per screen | `src/features` | all of the above |

Rules the code follows:

- **One source of truth for numbers.** Every streak, percentage and chart shade comes from `LedgerStats`, so screens always agree.
- **Screens depend on interfaces, not Supabase.** Swapping or adding a backend means writing one new implementation of `ports.ts`.
- **One way to write data.** `useOptimistic` updates the screen at once, saves in the background, and rolls back with an error toast and Retry if saving fails.
- **One component per pattern.** One toast system (bottom center, 5 s, pauses on hover), one dialog that becomes a bottom sheet on phones, one calendar grid behind every calendar, and one set of design tokens in `tailwind.config.js`.
- The app name lives in `src/app/config.ts` only.
