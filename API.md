# Kaya Leo API Reference

Base URL: `http://localhost:4000` (routes are mounted at `/` and `/api` —
both work). All authenticated routes expect `Authorization: Bearer <token>`
where token is a **Supabase access token** (production) or `demo-<userId>`
(demo mode).

Interactive test: `npm run smoke` in `server/` (56 assertions covering every journey).

## Meta
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | uptime check |
| GET | `/amenities` | amenity catalogue |
| GET | `/location/search?q=` | geocoding (Nominatim proxy, TZ-biased) |
| GET | `/location/reverse?lat=&lng=` | reverse geocoding |
| GET | `/location/regions` | curated TZ regions/districts/neighborhoods |

## Auth
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | full_name, phone?, email, password | creates auth user + profile (profile auto-created by DB trigger on Supabase signup) |
| POST | `/auth/login` | email, password | returns user + token (Supabase password grant) |
| POST | `/auth/logout` | — | client discards session |

## Profile
| Method | Path | Notes |
|---|---|---|
| GET | `/users/me` | own profile |
| PUT | `/users/me` | full_name, phone, email, avatar_url, bio |
| PUT | `/users/me/password` | change password (supabase mode) |

## Properties & search
| Method | Path | Notes |
|---|---|---|
| GET | `/properties` | public search — q, property_type, min_price, max_price, bedrooms, bathrooms, amenities (csv), furnished, available_now, region, city, near_lat/lng, sort=newest\|price_asc\|price_desc\|distance\|recommended, page, page_size |
| GET | `/properties/search` | alias of the above |
| GET | `/properties/:id` | detail incl. images, amenities, host, rating (coords rounded for non-owners) |
| POST | `/properties` | host only. status: `draft`\|`pending` |
| PUT | `/properties/:id` | owner host (or admin) |
| DELETE | `/properties/:id` | owner host (or admin) |
| POST | `/properties/:id/publish` | draft/rejected → pending (admin review) |
| POST | `/properties/:id/pause` | approved → draft (hidden from public) |
| POST | `/properties/:id/view` | increments views counter |
| POST | `/properties/:id/images` | replace image metadata set (binaries uploaded to Supabase Storage by the client) |
| DELETE | `/properties/:id/images/:imageId` | remove one image |

## Favorites
| Method | Path | Notes |
|---|---|---|
| GET | `/favorites` | full property objects |
| GET | `/favorites/ids` | light ids for heart states |
| POST | `/favorites/:propertyId` | save |
| DELETE | `/favorites/:propertyId` | unsave |

## Messaging
| Method | Path | Notes |
|---|---|---|
| GET | `/conversations` | list w/ property ref, last message, unread counts |
| POST | `/conversations` | `{ property_id }` → creates or returns existing thread with the host |
| GET | `/conversations/:id/messages` | participants only; marks incoming read |
| POST | `/conversations/:id/messages` | `{ message }` |

## Host
| Method | Path | Notes |
|---|---|---|
| POST | `/host/apply` | USER → HOST |
| GET | `/host/dashboard` | stats + latest inquiries |
| GET | `/host/properties?status=` | own listings |

## Reviews / inquiries / reports
| Method | Path | Notes |
|---|---|---|
| GET | `/properties/:id/reviews` | public |
| POST | `/properties/:id/reviews` | rating 1–5 + comment; owners excluded; one per user |
| GET | `/reviews/mine` | reviews written by me |
| POST | `/properties/:id/inquiries` | "Omba kukodisha" |
| GET | `/inquiries/mine` | my requests |
| PUT | `/inquiries/:id/status` | host: new → contacted/closed |
| POST | `/properties/:id/report` | reason + details |

## Admin (role ADMIN)
| Method | Path | Notes |
|---|---|---|
| GET | `/admin/stats` | totals + pending + open reports |
| GET | `/admin/properties?status=` | moderation queue |
| POST | `/admin/properties/:id/moderate` | approve / reject (reason) / suspend / request_changes |
| DELETE | `/admin/properties/:id` | remove fraudulent listing |
| GET | `/admin/users` | user list |
| PUT | `/admin/users/:id/verified` | approve/reject host verification |
| PUT | `/admin/users/:id/role` | USER / HOST / ADMIN |
| GET | `/admin/reports?status=open` | report queue |
| PUT | `/admin/reports/:id/status` | resolved / dismissed |

## Error format
All errors return `{ "error": "message in Swahili" }` with proper status codes
(400 validation, 401 auth, 403 ownership/role, 404, 409 conflict, 500).
