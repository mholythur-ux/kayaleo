# 🏠 KAYA LEO
### *Nyumba za kupanga Tanzania* — a real, working property-rental marketplace

Kaya Leo connects renters with hosts across Tanzania. Browse houses, apartments
and rooms, search by neighborhood or landmark, save favorites, chat with hosts,
request to rent — and become a host yourself with a guided 9-step listing
wizard that includes a map location picker, photo manager and admin moderation.

![stack](https://img.shields.io/badge/Expo-SDK%2053-1D4ED8) ![stack](https://img.shields.io/badge/React%20Native-0.79-2563EB) ![stack](https://img.shields.io/badge/TypeScript-strict-0A2A5E) ![stack](https://img.shields.io/badge/Express-4-123A78) ![stack](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth%20%2B%20Storage-3B82F6)

---

## ✅ What's inside (and verified working)

| Layer | Tech | Status |
|---|---|---|
| `mobile/` | Expo + React Native + TypeScript, React Navigation, TanStack Query, React Hook Form + Zod, expo-image/image-picker/location, react-native-maps, Supabase JS | Typechecks clean (`npm run typecheck`) |
| `server/` | Node + Express + TypeScript REST API, Zod validation, Supabase Auth/DB/Storage (service-role, server-side only) | **56/56 smoke tests pass** (`npm run smoke`) |
| `database/` | PostgreSQL schema, **Row Level Security** on every table, storage bucket policies, triggers, seed script | Runs in Supabase SQL editor |
| `docs/` | Supabase setup, API reference | |

### Every major journey works end-to-end
Signup → login → logout · profile edit + avatar upload · home (featured /
recommended / categories) · search with filters (type, price, beds, baths,
amenities, furnished, availability) and sorting (incl. by distance) · property
details (gallery, amenities, rules, map, host card, reviews) · **favorite
(persisted in DB)** · **message host (real conversations, unread counts)** ·
**"Omba kukodisha" inquiries** · report listing · **Become a Host** (9-step
wizard: host info → type → map location (search/GPS/drag-pin) → details →
amenities (+ custom) → photos (camera/gallery, categories, reorder, cover,
min. 2 to publish) → pricing → availability → preview) · **host dashboard**
(stats, listing lifecycle: edit / publish / pause / delete, inquiries) ·
**admin panel** (stats, approve/reject/suspend listings, verify hosts, roles,
reports) · error/empty/loading states in Swahili · i18n (Kiswahili ⇄ English).

**No dead buttons.** Every tap maps to a real API call or a native action
(call via `tel:`, share via the native share sheet, camera/gallery, GPS).

---

## 🚀 Quick start

### 1. Run the API immediately (zero external services — demo mode)

```bash
cd server
npm install
npm run dev          # DATA_MODE=demo by default → seeded in-memory DB
```

Test everything: `npm run smoke` → **56 passed, 0 failed**.
Demo logins (password `kayaleo123`): `amina@kayaleo.app` (host),
`baraka@kayaleo.app` (host), `juma@kayaleo.app` (renter), `admin@kayaleo.app`.
Demo tokens: `Authorization: Bearer demo-<userId>` (returned by login/register).

### 2. Connect Supabase (production data)

```bash
# one-time setup — full guide: docs/SUPABASE_SETUP.md
# 1) run database/migrations/001..004 in the Supabase SQL editor
# 2) seed:
cd database/seeds && npm install
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
# 3) server:
cd ../../server && cp .env.example .env   # DATA_MODE=supabase + keys
# 4) app:
cd ../mobile && cp .env.example .env      # supabase url/anon key + API url
```

### 3. Run the mobile app

```bash
cd mobile
npm install
npx expo start        # press a → Android, i → iOS (Expo Go)
```

> The app is a **native Expo project** — it runs on a real device/emulator via
> Expo Go, not in a browser. All images are bundled; seed listings use
> `database/seeds/images/*` (uploaded to Supabase Storage by the seed script).

---

## 🗂 Project structure

```
kaya-leo/
├── mobile/                      # Expo app (TypeScript)
│   ├── app.json                 # incl. iOS/Android permissions + maps config
│   └── src/
│       ├── screens/             # Home, Search, PropertyDetails, Favorites,
│       │                        # Messages(+Chat), Profile(+5), Host(wizard,
│       │                        # dashboard), Admin(4), Auth(3)
│       ├── components/          # PropertyCard, CategoryCard, ImageGallery,
│       │                        # HostCard, LocationPicker, Modals, ui kit
│       ├── navigation/          # Bottom tabs (5) + root stack, auth-gated
│       ├── hooks/queries.ts     # TanStack Query: caching, pagination, retries
│       ├── services/            # Supabase client + storage upload, fetch API
│       ├── api/                 # typed endpoint modules
│       ├── i18n/                # sw (default) + en + LanguageProvider
│       └── theme/               # Kaya Leo blue/white design system
├── server/                      # Express + TypeScript REST API
│   └── src/
│       ├── controllers/ routes/ # all endpoints (see docs/API.md)
│       ├── validators/          # Zod schemas for every request
│       ├── repo/                # DataRepo interface + Supabase & in-memory impls
│       └── middleware/          # JWT auth (Supabase), roles, errors, rate-limit
├── database/
│   ├── migrations/              # 001 schema · 002 RLS · 003 storage · 004 seeds
│   └── seeds/                   # seed.mjs (users, photos, 9 TZ listings)
├── docs/                        # SUPABASE_SETUP.md · API.md
└── scripts/smoke.sh             # 56-assertion journey test
```

## 🔐 Security model

- **Mobile holds only the anon key.** The service-role key lives exclusively in
  `server/.env` and is never shipped or committed.
- **RLS everywhere** — users edit only their profile, hosts only their listings,
  favorites are private, chats visible to participants only, moderation is
  admin-only (`database/migrations/002_rls.sql`).
- Server **re-validates ownership/roles** on every mutation (defense in depth)
  and validates all payloads with Zod.
- **Privacy**: the public API rounds listing coordinates (~110 m) — the exact
  pin is visible only to the listing's owner and admins.
- Storage: users upload only into their own `uid/…` folder via their own JWT.

## 🌍 Swap-in options (by design)

- **Storage → AWS S3**: only `repo/`/storage upload helpers change; the image
  metadata API (`POST /properties/:id/images`) already stores URLs/paths.
- **Maps → Mapbox/Google geocoding**: `locationController` wraps the provider.
- **English/Swahili**: `src/i18n` — pass `lang` through the provider.

## 🧪 Testing

```bash
cd server && npm run smoke     # 56 assertions across every journey
npm run typecheck              # tsc for server + mobile
```

The smoke suite covers: registration/duplicate rejection, profile updates,
auth guards, favorites (add/list/remove), messaging (send/read/participant
isolation), host apply, listing creation (pending → hidden from public search),
image replacement, admin login/moderation (approve → public), self-review
block, inquiries, reports + resolution, draft/publish/edit/pause/delete,
admin user verification and role guards.

## 📝 Notes

- The design is an **original Kaya Leo identity** (deep navy → royal → bright
  blue on white) inspired by modern marketplace apps, not a copy of any brand.
- Booking payments are intentionally out of scope; "Omba kukodisha" creates a
  real inquiry that the host manages (`new → contacted → closed`). Nothing
  pretends a booking happened until the backend confirms it.
- Google Maps on Android standalone builds needs your own API key in
  `mobile/app.json` (Expo Go works without one; iOS uses Apple Maps).
