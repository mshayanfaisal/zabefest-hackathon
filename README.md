# KarachiPulse

> **EFEST / ZABEFEST Hackathon 2026 — Theme: "Fix Karachi"**
> A civic issue reporting, verification, and resolution platform for Karachi.

KarachiPulse lets citizens report urban problems (potholes, garbage, broken
streetlights, sewerage leaks, unsafe zones, water shortages, load shedding) and
send emergency SOS alerts — while authorities triage, assign, and resolve them
through a live console with smart prioritization, a heatmap, and analytics.

```
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────────────┐
│  Citizen app    │      │      Supabase         │      │   Admin console     │
│  (Expo / RN)    │─────▶│  Postgres + PostGIS   │◀────▶│   (React + Vite)    │
│  report · SOS   │      │  Auth · Storage       │      │  queue · heatmap    │
│  verify · map   │      │  Realtime · EdgeFn    │      │  analytics · SOS    │
│  offline · i18n │      │  severity scoring     │      │  public dashboard   │
└─────────────────┘      └──────────────────────┘      └─────────────────────┘
```

## Components implemented (10 of 12 from the brief)

1. **Citizen issue reporting** — category/sub-type, photo, GPS, anonymous option
2. **Geo-tagging / location intelligence** — auto GPS, PostGIS dedup, map views
3. **Smart prioritization** — automated severity scoring (1–10) + rule-based fallback
4. **Real-time notifications/alerts** — Supabase Realtime to admin queue + SOS panel
5. **Public transparency dashboard** — read-only, no login
6. **Crowdsourced verification** — community confirms; auto-verify at 3 confirmations
7. **Emergency escalation (SOS)** — one-tap, severity 10, live alert + sound on admin
8. **Offline-first** — AsyncStorage queue, auto-sync on reconnect
9. **Urdu / English support** — in-app toggle, RTL
10. **Authority/admin workflow** — status lifecycle, audit trail, role-gated

Plus **data analytics / heatmap visualization** on the admin side.

## Repo layout
- [`mobile/`](mobile/) — Expo React Native citizen app
- [`admin/`](admin/) — React + Vite authority console
- [`supabase/`](supabase/) — schema, RLS, seed, and the severity scoring Edge Function

## Quick start

1. **Backend** — follow [`supabase/README.md`](supabase/README.md): create the project,
   run `migrations/001_initial_schema.sql`, create the `report-photos` bucket, run
   `seed.sql`, deploy `score-report`, and add an admin user.
2. **Admin** —
   ```bash
   cd admin
   cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
   npm run dev
   ```
3. **Mobile** —
   ```bash
   cd mobile
   cp .env.example .env   # fill in EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
   npx expo start         # open in Expo Go
   ```

## Mandatory constraints — how we meet them
| Constraint | Approach |
|---|---|
| Low-end Android | Expo Go compatible; map via lightweight Leaflet WebView (no native maps build); compressed photos (quality 0.5) |
| Poor/unstable internet | Offline queue + auto-sync; async severity scoring never blocks the UI |
| Scalability | Supabase (managed Postgres) + auto-scaling Edge Functions; indexed queries |
| Data authenticity | GPS-stamped reports, photo evidence, crowdsourced verification threshold |
| Privacy & security | Row Level Security on every table; anonymous auth (no PII required); optional phone trust-boost |
| Spam/fake prevention | Per-device rate limit (5/hr), 100 m/1 h geo-dedup, verification threshold, admin reject |

## Target users
- **Citizens** of Karachi — fast, low-friction reporting (anonymous, offline, Urdu).
- **City authorities** (KMC, KWSB, K-Electric, Police, Rangers, PDMA, SSWMB) — a
  prioritized, real-time work queue with audit trail.
- **The public & press** — the transparency dashboard for accountability.

## Sustainability / operational model
- **Phase 1 (prototype):** single city, free-tier Supabase, manual assignment.
- **Phase 2 (pilot):** KMC partnership; route reports to departmental email/WhatsApp; ward-level routing; government grant funding.
- **Phase 3 (scale):** multi-city (Lahore, Islamabad); municipal SaaS subscription; anonymized civic-data API licensed to urban-planning researchers.

## Future scalability plan
- Push notifications (FCM) for assignment + status updates.
- Department SSO and per-department dashboards.
- Severity model fine-tuned on resolved-report outcomes.
- Read replicas + materialized heatmap tiles for very large datasets.

## Demo script (judges)
1. Citizen reports a pothole with photo — GPS auto-fills.
2. Toggle airplane mode, submit again → "saved offline"; reconnect → auto-syncs.
3. Switch to Urdu.
4. Tap SOS → appears instantly on the admin SOS panel with a sound + map link.
5. Admin queue is sorted by SOS → severity; show the scoring reason on a card.
6. Change a status (verified → in progress) — persisted + audit-logged.
7. Open heatmap (density across Karachi) and analytics (category/status charts).
8. Open the public dashboard — works with no login.

## Tech
React Native (Expo SDK 56) · React 19 + Vite · Supabase (Postgres + PostGIS, Auth,
Storage, Realtime, Edge Functions / Deno) · Leaflet · Recharts.
