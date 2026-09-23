# Supabase Setup — Kaya Leo

Follow these steps once to connect the app to a real backend.

## 1. Create the project

1. Go to [supabase.com](https://supabase.com) → **New project** (any region close to Tanzania, e.g. `eu-central-1`).
2. Save your database password somewhere safe.

## 2. Run the SQL migrations

Open **SQL Editor** in the Supabase dashboard and run these files **in order**
(each is a single paste + Run):

| Order | File | What it does |
|---|---|---|
| 1 | `database/migrations/001_init.sql` | Tables, enums, indexes, triggers (auto-creates a `profiles` row on signup) |
| 2 | `database/migrations/002_rls.sql` | Row Level Security policies (users own their data, hosts own listings, participants own chats, admin-only moderation) |
| 3 | `database/migrations/003_storage.sql` | `avatars` + `property-images` buckets with per-user folder policies |
| 4 | `database/migrations/004_amenities.sql` | Amenity catalogue + `increment_property_views()` |

## 3. Get your keys

**Project Settings → API**:

- `Project URL` → this is `SUPABASE_URL`
- `anon public` key → safe for the mobile app (`EXPO_PUBLIC_SUPABASE_ANON_KEY`)
- `service_role` key → **SERVER ONLY** (`SUPABASE_SERVICE_ROLE_KEY`). Never put this
  in the mobile app, never commit it.

## 4. Seed demo data (optional but recommended)

```bash
cd database/seeds
npm install
SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ... \
npm run seed
```

This creates demo accounts (password `kayaleo123`):

| Email | Role |
|---|---|
| `amina@kayaleo.app` | Verified host with 6 listings |
| `baraka@kayaleo.app` | Host with 3 listings |
| `juma@kayaleo.app` | Renter |
| `admin@kayaleo.app` | Admin |

…and 9 approved Tanzanian listings with photos.

## 5. Configure the mobile app

```bash
cd mobile
cp .env.example .env
# EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# EXPO_PUBLIC_API_URL=http://YOUR-LAN-IP:4000   (or your deployed server)
npx expo start
```

## 6. Configure the server (production mode)

```bash
cd server
cp .env.example .env
# DATA_MODE=supabase
# SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...
# SUPABASE_ANON_KEY=...
npm run dev
```

## 7. Auth settings worth knowing

- **Email confirmation**: Auth → Providers → Email. For the smoothest demo,
  turn **Confirm email** off (sign-up returns a session immediately). Leave it
  on for production; the app handles the "check your email" flow.
- **Phone auth / Google**: add them in Auth → Providers. The login screen can
  be extended with `supabase.auth.signInWithOtp` / `signInWithOAuth` — the
  backend already accepts any valid Supabase JWT.

## 8. Maps key (Android release builds)

`react-native-maps` uses Google Maps on Android. Expo Go works out of the box.
For standalone builds, create a Maps SDK for Android key in Google Cloud and put
it in `mobile/app.json` → `expo.android.config.googleMaps.apiKey`. iOS uses
Apple Maps — no key needed.

## Security model recap

- Mobile app holds only the **anon** key; all privileged work happens through
  the Express API with the **service-role** key kept server-side.
- Postgres RLS is enabled on every table as defense-in-depth — even if someone
  talked to Postgres directly with the anon key, they could only touch rows the
  policies allow.
- Storage uploads are made by the user's own JWT into `uid/…` folders only.
- The server re-validates ownership of every mutation (host owns the listing,
  participants own the conversation, admin role required for moderation).
