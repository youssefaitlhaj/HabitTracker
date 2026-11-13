# Ledger: habit tracker web app (design)

Date: 2026-11-10 · Status: ready for owner review

## 1. What this is and why

Ledger is a personal habit tracker that runs in the browser on desktop, tablet and phone. You set up a few small daily habits, check them off in a tap, and watch your progress fill in over weeks, months and the year.

What makes it Ledger:

- A warm **whisky and oat** look: calm, modern, and clearly *not* a generic AI-made template.
- A **progress chart you can point at any period**: this week, this month, the past year, or any custom From–Until range.
- **Streaks that forgive**: an optional rest day each week keeps a streak alive when life gets busy.
- **Your data is yours**: a full JSON export and import, and real account deletion.

The owner decided the look by choosing between interactive prototypes. The design canvas is the visual source of truth:
https://claude.ai/artifact/MiKNQWUDknBjHy7NVD3VFH (private to the owner; the screens referenced below are artboards on it).

## 2. Goals

1. Sign up and log in with email + password; manage your own profile.
2. Create, edit, archive and delete habits with flexible schedules.
3. Check habits off for today (and fix past days) with one tap, with undo.
4. See progress: today's ring, streaks, last 7 days, per-habit stats, and a range chart (Week / Month / Year / Custom From–Until).
5. Export all data as JSON and import it back (merge or replace).
6. Work well and feel native on phone, tablet and desktop.
7. Every component (calendar, popups, warnings, info messages, forms) shares one visual style.

## 3. Non-goals for v1

- **Google sign-in.** The owner decided "email only for now." Add later, once the app has a public domain and a privacy policy. When added, it must use Google's official "Sign in with Google" button (Google's branding rules forbid restyling it).
- Delivering notifications (web push or email reminders). See §8.6.
- Languages other than English.
- Offline-first sync. The app needs a connection to save.
- Native iOS or Android apps, social features, sharing, payments.
- Quantity habits ("8 glasses"). Every habit is yes/no per day; the detail text can describe the amount.

## 4. Anti-goals (fails even if it technically works)

- It looks like a stock template or AI-generated site: gradient washes, emoji as icons, purple/blue SaaS defaults, cards with a coloured left border, or generic stock illustrations.
- Any surface that breaks the shared style: browser `alert()`/`confirm()`, unstyled native popups, or toasts anywhere except bottom center.
- Losing user data silently: a destructive action without confirmation, or an import "Replace" without a backup.
- Tiny tap targets or unreadable text on a phone.
- Streak numbers that disagree between screens.

## 5. Decided by the owner

| Topic | Decision |
|---|---|
| Name | **Ledger** (kept for now; may change later, so keep the name in one constant) |
| Layout | Design **D** ("Blend.dc.html" on the canvas): side navigation, progress ring card, perfect-day streak card, last-7-days card, habit cards with "Mark done", progress section with range switch |
| Colours | Whisky & oat palette from design A (tokens in §7.1) |
| Headings font | **Fraunces** (serif); body text **Geist** |
| Logo | Based on `image_2.png` (arches + sprout figure + open book), redrawn as a flat vector. Files in `docs/brand/`. Used as the **browser tab icon** too |
| Backend | **Supabase** (auth + Postgres database + file storage) |
| Messages (toasts) | Bottom center, disappear after **5 seconds** |
| Responsive | Must be easy to use on phone and tablet |
| Progress range | Week, Month, Year, and a custom **From–Until** date range |
| Data | JSON import and export |
| Google sign-in | Not in v1 |

## 6. Screens (all on the canvas)

| Screen | Canvas artboard | Notes |
|---|---|---|
| Today (desktop) | `Blend.dc.html` (D) | Primary layout reference |
| Sign up / log in / reset password | `Auth.dc.html` | Remove the "Continue with Google" button and its divider for v1 |
| First-run setup (3 steps) | `Onboarding.dc.html` | Pick starter habits → reminder time and week start → summary |
| New / edit habit dialog | `HabitEditor.dc.html` | Includes the custom date picker and the "Discard changes?" warning |
| Habit detail | `HabitDetail.dc.html` | Stats, month calendar, notes, archive, delete confirmation |
| Settings | `Settings.dc.html` | Profile, Preferences, Data (import/export), Account. Hide the tabs and controls marked out of scope in §8 |
| Component kit | `Components.dc.html` | Buttons, fields, banners, toasts, range picker, dialog, empty state, loading |
| Toast | `Toast.dc.html` | The one toast component |
| Logo | `Brand.dc.html`, `Logo.dc.html` | Lockups, dark version, app icon, small sizes |
| Phone: Today, Progress | `PhoneToday.dc.html`, `PhoneProgress.dc.html` | Bottom tab bar with centre "+" button; custom range opens a bottom sheet |
| Tablet: Today | `TabletToday.dc.html` | Icon rail navigation |

Designs A, B, C and D2 on the canvas are earlier explorations and are **not** to be built. Sample names, numbers and habits on the canvas are placeholders.

Additional pages not drawn on the canvas, to be built in the same style: **All habits** list (active + archived, with restore), **Progress** page (the range chart from D at full width, plus a per-habit breakdown table), **Privacy policy** and **Terms** pages (static content; the owner supplies the text, so ship clearly marked placeholder text), **404**, and the **email confirmation / password reset landing** pages.

## 7. Visual system

### 7.1 Colour tokens

| Token | Hex | Use |
|---|---|---|
| paper | `#F4EEE2` | page background |
| surface | `#FBF8F2` | cards |
| oat | `#EFE7D8` | wells, segmented controls |
| line | `#E2D7C4` | borders |
| line-strong | `#CDBFA8` | input borders |
| ink | `#2E1C10` | main text |
| muted | `#6B5643` | secondary text |
| whisky | `#A0521D` | primary actions, progress |
| oak | `#7A3E14` | pressed / selected text |
| cask | `#3A2416` | dark cards, active nav |
| amber | `#E8B67A` | accents on dark |
| success | `#4E6B2A` | on `#E6EDD8` |
| warning | `#8A5A00` | on `#F7E8C6` |
| error | `#A1311F` | on `#F7E1DA` |
| heat 0–4 | `#E6DCCB` `#EBCFA8` `#D9A066` `#9A4E1B` `#5E2F10` | chart shades, fewer → all |

All text meets WCAG AA contrast (4.5:1, or 3:1 at 24 px+). Text on heat 3–4 uses `#FBF8F2`.

### 7.2 Type, shape, motion

- Headings: Fraunces 400 (page titles) and 600 (section titles). Body: Geist 400/500/600. Small uppercase labels: Geist Mono.
- Radii: inputs and buttons 12 px, cards 18–20 px, dialogs 24 px, chips fully rounded.
- Touch targets ≥ 44 px. Inputs 48 px tall.
- Motion is short and calm (150–250 ms); respect `prefers-reduced-motion`.
- Icons: simple stroke icons (one consistent set), never emoji.

### 7.3 Logo and icons

- `docs/brand/ledger-mark.svg` (for light backgrounds) and `docs/brand/ledger-mark-dark.svg` (for dark backgrounds) are the masters. `docs/brand/logo-source.png` is the owner's original, for reference only.
- Browser tab icon: an SVG favicon from the mark, plus a PNG fallback, a 180 px Apple touch icon (mark on cask background, as on the canvas), and a web app manifest with 192/512 px icons so the app can be added to a phone home screen.

## 8. Behaviour

### 8.1 Accounts (Supabase Auth)

- Sign up: name, email, password (≥ 8 characters, strength bar), accept terms (links to the Terms and Privacy pages). Supabase sends a confirmation email; the user can't log in until confirmed.
- Log in, "Keep me signed in" (unticked = session ends when the browser closes), log out, forgot password → email link → set new password.
- Settings › Account: change password (current password, new password, confirm new password; the current one is checked first; a "Forgot your current password?" link emails a reset link), sign out everywhere, delete account.
- Email links (reset password, confirm email, change email) open Ledger's own `/auth/action` page; the reset page asks for the new password twice (added 2026-11-13).
- **Delete account**: type `DELETE` to enable the button. The account is marked for deletion and the user is signed out. Logging in within 7 days cancels it. After 7 days a scheduled job removes the auth user and all their data and files.
- Change email: Supabase's email-change confirmation flow; until it's confirmed, the old email stays active.
- Every user's data is private. Enforce this with database row-level security, not just in the UI.

### 8.2 Habits

Fields: name (required, ≤ 60 chars), category (Health, Mind, Learning, Home, Social), colour (Whisky, Oak, Amber, Sage `#6E7B4F`, Clay `#A8584A`, Slate `#5C6670`), schedule, start date, optional reminder time (stored now, used when notifications ship), rest days per week (0, 1 or 2; the default comes from Preferences), optional "why it matters" text.

Schedules:

- **Every day**
- **Specific days**: any subset of Mon–Sun, at least one
- **Times a week**: 1–7 times on any days

Habits can be reordered (drag on desktop; "Move up/down" in the card menu everywhere), archived (hidden from Today, history kept, restorable from All habits) and deleted (confirmation dialog offering "Archive instead"; permanent).

### 8.3 Check-ins, streaks and stats (one shared module, fully unit-tested)

All "today" and date logic uses the **user's time zone** from their profile.

- A check-in is "habit H was done on date D." Only *done* is stored. Missed and rest days are computed.
- Users can check off today and any past day since the habit's start date. Future days are disabled.
- **Scheduled day**: for *every day* and *specific days* habits, a day on or after the start date that matches the schedule.
- **Rest days**: within each week (using the user's week-start setting), up to `rest_days_per_week` missed scheduled days are shown as "Rest" and don't break the streak. They don't count toward the streak either. The earliest misses in the week use up the allowance first.
- **Current streak** (every day / specific days): the number of done scheduled days counted backward from today. Today counts if done and is skipped (not a break) if not done yet. Unscheduled days are skipped. The streak stops at the first missed scheduled day that isn't a rest day.
- **Times-a-week habits**: the streak is counted in **weeks** in which the target was met. The current week counts once the target is met and doesn't break while still in progress. `rest_days_per_week` doesn't apply to them (the field is hidden for this schedule).
- **Best streak**: the longest streak ever, using the same rules.
- **Day-scheduled vs weekly habits.** All *per-day* numbers use only *every day* and *specific days* habits scheduled that day ("day habits"). These numbers are today's ring, "x of y" on Today, the last-7-days card, the heatmap shade, the day hover, perfect days and the perfect-day streak. Times-a-week habits ("weekly habits") appear on Today in their own "This week" group, showing progress like "2 of 3 this week". They stay checkable every day, including after the target is met (shown as met). They count only in weekly and range numbers: their own streak and completion %.
- **Not scheduled today**: specific-days habits that aren't scheduled today appear in a collapsed "Not today (n)" group on Today, read-only.
- **Rest days are excused, not missed.** A habit-day that became a rest day is removed from that day's set of scheduled habit-days. It's not in the completion % denominator, doesn't lower the heatmap shade, and doesn't stop a day from being perfect. A day on which every scheduled habit was rested is skipped, like a day with nothing scheduled.
- **Perfect day**: a past day (or today, once complete) on which every remaining day habit (after rest days are removed) was done, with at least one done. Days with nothing scheduled are skipped.
- **Perfect-day streak**: consecutive perfect days, using the same skipping rules as the current streak.
- **Completion %** for any range: done day-habit check-ins ÷ scheduled, non-rested day-habit days in the range, counting only up to today. Today's unfinished habits count as expected, so the % matches the "x of y" ring (changed 2026-11-13: excluding them made a new account show 100% after one check-off). Weekly habits add min(done, target) ÷ target per week, prorated for partial weeks at the range edges.
- **Heatmap shade** for a day = that day's completion ratio for day habits: 0% → heat 0, 1–39% → 1, 40–69% → 2, 70–99% → 3, 100% → 4. A day with no day habits scheduled is shown in the plain oat colour. Days before the earliest date (below) or in the future are shown empty with a dashed outline.
- **Earliest date** = the earliest habit start date, or the account creation date if that's earlier. Start dates may be set in the past to backfill, and imported history is visible.
- **Editing a habit keeps its history.** Schedule and rest-day changes apply from the day they're saved. Past days are judged by the schedule that was active then. A habit can't start later than its earliest check-in (the edit dialog shows an inline error). Archived periods are excluded entirely, so they're neither missed nor counted, and restoring doesn't create a gap of misses. Changing the week start in Preferences does recalculate week-based rules (rest days, weekly habits) for all history. The setting shows a one-line note saying so.

### 8.4 Progress chart

- Range switch: **Week** (the current week as a calendar row, or bars on phone), **Month** (calendar), **Year** (past 12 months as a GitHub-style grid on desktop/tablet; 12 month tiles with % on phone), **Custom** (From and Until dates; presets: last 7 days, last 30 days, last 90 days, this year).
- Custom ranges of up to 6 weeks render as a calendar; longer ranges render as the week-column grid.
- From must be on or before Until. Otherwise show an inline error and keep Apply disabled. The earliest date allowed is the earliest date in §8.3; the latest is today.
- The four stats above the chart follow the selected range, counting only up to today:
  - **Completion %**: as defined in §8.3.
  - **Perfect days**: the count of perfect days.
  - **Habits checked**: the total number of check-ins, all habits.
  - **Days tracked**: the number of days in the range from the earliest date up to today.
- Hovering or focusing a day shows its date and "x of y habits".
- The chosen range is remembered per device.

### 8.5 Settings

- **Profile**: avatar (upload a square image ≥ 256 px, stored in Supabase Storage; initials if none), display name, email, time zone (auto-detected at sign-up). Save/Discard are only enabled when something changed.
- **Preferences**: week starts on Monday or Sunday, default rest days per week (0–2), show streaks (on/off), celebrate perfect days (a short, reduced-motion-aware animation). **Theme**: Light, Dark or System, remembered per device (added 2026-11-13). Dark uses the cask/amber palette from design B; every colour is a token with a light and a dark value in `src/index.css`. The **Language** select is hidden in v1.
- **Notifications** tab: hidden in v1.
- **Data**: see §8.7.
- **Account**: see §8.1.

### 8.6 Notifications

Added 2026-11-13. Each habit's reminder time sends a web push notification when the habit is scheduled that day and not done yet (weekly habits: until the weekly target is met), at most once per habit per day, and never more than 3 hours late. Reminders are turned on per device in Settings › Notifications (on iPhone, only after adding Ledger to the Home Screen). A GitHub Actions job checks every 5 minutes, using the same stats rules as the app (`src/domain/reminders.ts`). The weekly summary email is not built.

### 8.7 Export and import (JSON)

Export downloads `ledger-export-YYYY-MM-DD.json`:

```json
{
  "app": "ledger",
  "version": 1,
  "exportedAt": "2026-11-10T09:41:00Z",
  "profile": { "name": "…", "timezone": "Europe/Berlin", "weekStart": "monday", "defaultRestDays": 1, "showStreaks": true, "celebrate": true },
  "habits": [{
    "id": "uuid", "name": "Morning walk", "category": "health", "color": "whisky",
    "schedules": [
      { "effectiveFrom": "2026-03-02", "type": "daily", "days": null, "timesPerWeek": null, "restDaysPerWeek": 1 },
      { "effectiveFrom": "2026-06-01", "type": "days", "days": ["mon","tue","wed","thu","fri"], "timesPerWeek": null, "restDaysPerWeek": 1 }
    ],
    "pauses": [{ "from": "2026-08-01", "to": "2026-08-14" }],
    "reminder": "07:30", "startDate": "2026-03-02", "why": "…", "archived": false, "order": 0,
    "createdAt": "…", "updatedAt": "…"
  }],
  "checkins": [{ "habitId": "uuid", "date": "2026-11-10" }],
  "notes": [{ "id": "uuid", "habitId": "uuid", "date": "2026-11-09", "text": "…", "createdAt": "…" }]
}
```

The avatar image isn't included. Settings › Data shows when the last export happened.

Import:

1. Pick a `.json` file (≤ 10 MB) or drop it on the drop zone.
2. Validate it against the schema. Errors are shown inline plus an error toast: "not valid JSON", "not a Ledger export", "made by a newer version", or the first few field problems.
3. Preview: file name, number of habits, check-ins and notes.
4. Choose **Merge** (default) or **Replace**:
   - **Merge** adds habits whose id is new and updates existing ones when the file's `updatedAt` is newer. Check-ins and notes are combined (duplicates ignored).
   - **Replace** shows a warning, **automatically downloads a backup export first**, then deletes the user's habits, check-ins and notes and imports the file.
5. The import runs as one transaction: it either fully succeeds or changes nothing. Show a success toast with the counts.

### 8.8 Messages (toasts, banners, dialogs)

- **Toast**: one at a time, bottom center, above the phone tab bar. Disappears after **5 s**. A thin bar shows the time left, and hovering or focusing pauses it (accessibility). Kinds: info, success, warning, error, each with its own icon (not colour alone). Optional single action (Undo, Retry) and a close button. A new toast replaces the current one. Screen readers: `status` for info/success, `alert` for warning/error.
- **Undo** via toast: check-off, uncheck, archive, and fixing a past day.
- **Banners**: inline in the page, stay until dismissed (for example the "Your streak is safe" rest-day notice on habit detail).
- **Dialogs**: centred on desktop and tablet, bottom sheets on phone. Focus is trapped while open, Esc closes, and focus returns to the trigger. Destructive dialogs always offer a safer option.
- **Form errors**: inline under the field (icon + text, red border), plus a toast summary when submit fails.
- Network or save failure: an error toast with Retry. The UI rolls back any optimistic change.

### 8.9 Responsive behaviour

| Width | Navigation | Notes |
|---|---|---|
| < 768 px (phone) | Bottom tab bar: Today, Progress, (+ New habit), Habits, Profile | Dialogs as bottom sheets; habit list as compact rows with a 48 px check button; week strip on Today |
| 768–1199 px (tablet) | Icon rail with labels | Two-column habit grid |
| ≥ 1200 px (desktop) | Sidebar | Layout of design D |

No horizontal page scrolling at any width. The year grid scrolls inside its own box.

### 8.10 First run

After the first log-in with no habits, show the three-step setup (`Onboarding.dc.html`). It can be skipped and never shows again once the user has a habit. A warning toast appears when picking a sixth starter habit ("three to five tends to stick"), but it's allowed.

## 9. Data model (Supabase Postgres, row-level security on every table)

- `profiles`: `id` (= auth user id), `display_name`, `avatar_path`, `timezone`, `week_start` (`monday`|`sunday`), `default_rest_days`, `show_streaks`, `celebrate`, `onboarded_at`, `last_export_at`, `deletion_requested_at`, timestamps.
- `habits`: `id`, `user_id`, `name`, `category`, `color`, `reminder_time`, `start_date`, `why`, `sort_order`, `archived_at` (current state), timestamps.
- `habit_schedules`: `habit_id`, `user_id`, `effective_from` (date), `schedule_type` (`daily`|`days`|`times`), `schedule_days` (weekday numbers), `times_per_week`, `rest_days_per_week`. One row per change. The row with the latest `effective_from` on or before a date applies to that date.
- `habit_pauses`: `habit_id`, `user_id`, `from_date`, `to_date` (null while archived). One row per archive period; these days are excluded from all stats.
- `checkins`: `habit_id`, `user_id`, `date`; primary key (`habit_id`, `date`).
- `notes`: `id`, `habit_id`, `user_id`, `date`, `text` (≤ 500 chars), `created_at`.
- Storage bucket `avatars`, path `{user_id}/…`, readable and writable only by the owner.

Policies: a user can only select, insert, update and delete rows where `user_id = auth.uid()`. Deleting a habit cascades to its check-ins and notes.

## 10. Constraints

- **Audience: the owner only, for now** (owner's decision). Use Supabase's built-in email sender for confirmation and reset emails. Before anyone else signs up, switch to a real email service (custom SMTP) with a sending domain, and finalise the privacy policy and terms. Keep this as a documented step in the README; it's not part of v1. The end-to-end test must not depend on receiving real email: use the local Supabase stack's email inbox (Inbucket/Mailpit).
- Supabase for auth, database and storage. Pick the **EU (Frankfurt)** region unless the owner says otherwise (GDPR is the stricter case).
- Secrets never go in the repo: `.env` is git-ignored, and an `.env.example` documents the variables.
- Repo: https://github.com/youssefaitlhaj/HabitTracker (`main` branch).
- Accessibility: WCAG 2.2 AA (contrast, keyboard use, focus visibility, labels, reduced motion).
- Performance: the Today screen is interactive in under 2 s on a mid-range phone over 4G.

## 11. Calls Claude made (owner may override)

1. **Front end**: React + TypeScript single-page app built with Vite. Routing with React Router. Server data with TanStack Query (optimistic updates for check-offs). Validation with Zod (forms and import).
2. **Styling**: Tailwind CSS configured with the tokens in §7.1, with components built in-house to match the canvas. No off-the-shelf UI kit look.
3. **Testing**: Vitest unit tests for the streak/stats module (§8.3) and the import validator, written test-first. Component tests for the dialog, toast, date picker and range picker. One Playwright end-to-end run: sign up → create habit → check off → export.
4. **Hosting**: any static host (Vercel's free tier is the default suggestion). The owner sets up their own Supabase and hosting accounts.
5. Dark theme, notifications delivery and other languages wait for later versions, and their settings are hidden.
6. Times-a-week habits are excluded from perfect days, and their streaks count in weeks.
7. Import "Replace" downloads an automatic backup instead of offering an Undo.
8. Account deletion has a 7-day grace period, as shown on the canvas.
9. Editing a habit keeps its past exactly as it was: schedule versions and archive periods are stored (§8.3, §9).
10. Rest days are excused: they don't lower completion %, the heatmap or perfect days.
11. Weekly (times-a-week) habits get their own "This week" group on Today and stay out of the per-day numbers.
12. Range stats: "Habits checked" = total check-ins; "Days tracked" = days in the range since the earliest date.
13. The earliest date is the earliest habit start (backfilling allowed), so imported history shows up.

## 12. Left to the builder

Folder structure, state management details, the exact icon set (stroke style, consistent), how the scheduled deletion job runs (Supabase cron or an Edge Function), database migrations tooling (Supabase CLI recommended), and how to split the work into tasks.
