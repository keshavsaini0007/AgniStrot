# 📱 Mobile Implementation Plan — Wiring `App-frontend` to the Live Backend

> **Project:** AgniStrot — Smart Governance & Compliance Monitoring System (coal mines)
> **Audience:** mobile/backend team building `App-frontend`
> **Last updated:** Sep 2026
> **Companion files:** `frontend_backend_conflicts.md`, `frontend_implementation_tasks.md`, `mobile-backend-endpoints.md`
> **Reference docs:** `docs/PRD.md` (approved MVP), `docs/PROJECT-UNDERSTANDING.md`

---

## 1. Objective & Scope

### 1.1 Goal

Make the **mobile field-capture loop** work end-to-end against the real backend's fully-built, fully-tested endpoints:

```
field officer logs in
→ captures inspections / incidents / attendance offline (geo + device timestamp)
→ uploads photos
→ syncs when connectivity returns (dedup, no duplicates)
→ reads back his records from the server
```

### 1.2 In scope (mobile app side only)

| Backend endpoint (fully built + tested) | Purpose |
|---|---|
| `POST /api/v1/auth/login` | Email/password → JWT + user |
| `POST /api/v1/inspections/sync` | Batch offline inspection submissions |
| `POST /api/v1/incidents/sync` | Batch offline incident submissions |
| `POST /api/v1/attendance/sync` | Batch geo-stamped check-in/out |
| `POST /api/v1/media/upload` | Photo upload (multipart) → Cloudinary URL |
| `GET /api/v1/inspections` + `GET /api/v1/inspections/:id` | Role-scoped list/detail read-back |

These are the **only** endpoints treated as live in this plan. They are already built, tested (`backend` `npm run verify` via Newman), and strictly aligned to the mobile offline-sync design (`clientUuid` dedup, device `capturedAt`).

### 1.3 Out of scope (explicit)

- **No backend changes.** No new endpoints, no `/auth/me`, no `/auth/refresh`, no site-scope enforcement changes, no response-shape rewrites.
- **Screens without a live backend stay on mocks** and must be visibly tagged `MOCK` in the UI: Mines, Observations, Notifications, Analytics, Reports, Audit Logs, Users, Documents, Corrective Actions, Compliance, GIS.
- **No new server-side features.**

### 1.4 Authority for API contracts

The authoritative contract source is **`backend/src/`** (routes, controllers, validators, models, `types/index.ts`, `roleScope.ts`) plus the Postman collection `backend/postman/AgniStrot_API_Collection.postman_collection.json`. `docs/MVP-IMPLEMENTATION-SPEC.md` (referenced by `docs/PRD.md`) does **not exist** in the repo — do not use it as a source.

---

## 2. Current-State Snapshot (verified)

### 2.1 Backend — real and tested

- Express 5 + TypeScript, MongoDB (Mongoose 9), JWT `Authorization: Bearer`, Socket.io alerts, cron batch rules.
- 4 roles: `field_officer`, `mine_official`, `corporate_manager`, `regulator`.
- Base URL `http://localhost:5000/api/v1` (also unversioned aliases at `/`).
- List responses: `{ data, pagination: { page, limit, total, totalPages } }`.
- Detail responses: `{ data: {...} }`. Login: `{ token, user: { id, name, role, siteId } }`.
- Errors: `{ error }`; Zod failures: `{ error, details: [{ field, message }] }`.
- Seed accounts: `rahul@agnistrot.com / password123` (field_officer, site: Jharia).

### 2.2 App-frontend — 100% mocks

- `src/repositories/index.ts` hard-sets `useMockApi = true` and both ternary branches point to the **mock** repos (real API repos do not exist).
- Service layer = thin 1:1 passthrough to repositories; hooks (React Query) and screens call services. **Repositories are the only layer that must change.**
- Mock repos return `{ success: true, data, meta: { page, limit, total, totalPages } }`.
- **No token storage** (no AsyncStorage/SecureStore/MMKV — zero matches in repo). Zustand auth is in-memory.
- **No offline queue** (no AsyncStorage/SQLite/WatermelonDB usage anywhere).
- `src/api/client.ts` is orphaned (no repository imports it); `withCredentials: true` (cookie mode) does not match the Bearer-JWT backend. `src/api/endpoints.ts` is unused and describes wrong paths (`/mines`, `/observations`, `/notifications`, `/analytics`).
- Login screen renders `user?.email` / `department`, which the backend login payload does **not** provide — adapt, don't break, the UI.

---

## 3. Target Architecture

```
Screen → Hook (React Query) → Service → Repository (API) → axios client → backend
                                          └── envelope adapter (backend ⇄ app)
                                          └── OfflineQueue (AsyncStorage) for the 3 sync types
```

### 3.1 Repository-boundary rule (hard constraint)

Real API repositories **must implement the same interfaces** as the mock repositories they replace. Services, hooks, query keys, and screens stay untouched. The switch happens in a single place: `src/repositories/index.ts`.

### 3.2 Envelope adapter

Backend `{ data, pagination }` ⇄ app `PaginatedResponse { success, data, meta { page, limit, total, totalPages } }`. Build one adapter util (`src/api/adapter.ts`) and use it in every list repository — never spread conversion logic across files.

### 3.3 Auth (no `/auth/me`)

- `POST /auth/login` returns `{ token, user: { id, name, role, siteId } }`.
- Store the token; attach it via an axios request interceptor (`Authorization: Bearer <token>`).
- On app launch, restore session by **decoding the JWT client-side** (no `/auth/me` call) — read `id`, `role`, `siteId` from the payload.
- On 401 response: clear token, redirect to `/(auth)/login`.
- Logout is client-side only (clear stored token + state). Do not call any logout endpoint.

### 3.4 Base URL configuration

Replace the hardcoded `http://localhost:5000/api/v1` in `client.ts` with an env-driven value:
- `.env` → `EXPO_PUBLIC_API_URL=http://<host>:5000/api/v1`
- `localhost` works for web/iOS simulator; a LAN IP or tunnel is required for a physical device/emulator. Document the value in the plan's setup steps.

---

## 4. Phased Build Plan

Work in order. Each phase ends with a **verifiable demo** and `npm run lint` green.

### Phase 0 — Backend readiness

**Tasks**
- Create `backend/.env` from `.env.example` if missing: `MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_*`, `PORT=5000`.
- Start MongoDB, run `npm run seed` in `backend/` (creates 3 sites, 6 users, inspections/incidents/attendance/alerts).
- Run `npm run verify` (Newman/Postman suite) — all suites green.
- Record **actual JSON fixtures** for `auth/login`, `inspections/sync`, `incidents/sync`, `attendance/sync`, `media/upload`, `GET /inspections`, `GET /inspections/:id` into a `src/api/fixtures/` folder for reference while building repositories.

**Definition of done**
- `curl` from the terminal: login returns a token; `GET /inspections` with that token returns data.

### Phase 1 — API foundation

**Tasks**
- Add Expo SDK-57-compatible dependencies: `@react-native-async-storage/async-storage`, `expo-secure-store` (token), `uuid` (v4 for `clientUuid`). Verify versions with `npx expo install`.
- Update `src/api/client.ts`:
  - base URL from `process.env.EXPO_PUBLIC_API_URL`.
  - request interceptor: attach `Authorization: Bearer <token>`; skip for the login call.
  - response interceptor: map 401 → clear auth + navigate to login (via auth store); 403 → surface `ApiError` (already in `src/api/errors.ts`).
- Create `src/api/adapter.ts` (envelope + field mappers).
- Create `src/api/tokenStore.ts` (SecureStore-backed get/set/clear) and `src/api/offlineQueue.ts` (AsyncStorage queue described in Phase 3).
- Trim `src/api/endpoints.ts` to a `mobileEndpoints` map with only the live paths.

**Definition of done**
- A thin probe script/prototype logs in and lists inspections with the adapter applied.

### Phase 2 — Auth wiring

**Tasks**
- Create `src/repositories/api/authApiRepository.ts` implementing the same interface as `authMockRepository`:
  - `login(credentials)` → `POST /auth/login`, persist token, return `{ user }` (map `siteId` → app `User`).
  - `me()` → decode JWT from store (no network call).
  - `logout()` → clear token + state (client-side).
- Switch `repositories/index.ts`: `authRepository = useMockApi ? authMockRepository : authApiRepository`.
- Verify `app/(auth)/login.tsx` + `useAuthStore` work live with `rahul@agnistrot.com / password123`.
- Keep the login screen's email/department rendering safe with fallbacks (backend user has no `email`/`department`).

**Definition of done**
- Login via the real API persists across app restart (no `/auth/me` needed); logout clears it; 401 returns to login.

### Phase 3 — Offline capture & sync (the core mobile work)

**Request contract (exact, from `backend/src/validators/sync.validator.ts`)**

All three sync endpoints accept `{ records: [...] }` and return `{ accepted: string[], rejected: [{ clientUuid, reason }] }`. Reasons: validation failure field-message, or `duplicate`.

| Field | Type | Rules |
|---|---|---|
| `clientUuid` | string | **UUID v4** — dedup key, unique per device-record. Regenerate per capture, never on retry. |
| `siteId` | string | 24-hex MongoDB ObjectId (from login/sites data). |
| `capturedAt` | ISO string / Date | **Device-local capture time**, not sync time. |
| `location` | `{ lat, lng }` optional | `lat` ∈ [-90,90], `lng` ∈ [-180,180]. |
| `photoUrls` | string[] optional | Valid URLs (produced by `media/upload`). default `[]`. |

Per-type fields:

- **`POST /inspections/sync`** — roles `field_officer|mine_official`
  - `type`: `safety | environmental | production | labour`
  - `checklist`: array ≥1 of `{ item: string (min 1), result: "pass" | "fail" | "na", notes?: string }`
- **`POST /incidents/sync`** — same role guard
  - `severity`: `low | medium | high | critical`
  - `category`: `safety | environmental | equipment | other`
  - `description`: string, **min 10 characters**
- **`POST /attendance/sync`** — same role guard
  - `workerRef`: string (min 1) — worker name/ID
  - `checkType`: `"in" | "out"`

**`POST /media/upload`** — same role guard — `multipart/form-data`, single field `file`, image/* only, ≤5MB → `200 { url }`.

**Tasks**
- `src/repositories/api/inspectionApiRepository.ts`, `incidentApiRepository.ts`, `attendanceApiRepository.ts`, `mediaApiRepository.ts` implementing mock interfaces (adapt `success/meta` envelope).
- Photo flow: capture/select image → `uploadMedia` → store returned `url` into the record's `photoUrls` before sync.
- `src/api/offlineQueue.ts` (AsyncStorage):
  - `queueAdd(kind, record)` with `{ clientUuid, ... }` + `queuedAt`.
  - `queueFlush(kind)` → POST `{ records: pending }`; on success remove accepted uuids; keep `rejected` for review/retry (only validation errors retry-able; `duplicate` = already on server → drop locally).
  - Background flush trigger: network listener + manual "Sync now" button (no background-task lib in this scope).
- **Sync semantics to honor (PRD FR2 + NFR):** never regenerate `clientUuid` on retry; always preserve `capturedAt`; a retried batch that returns `rejected: [{ reason: "duplicate" }]` must be treated as success (drop from queue).

**Definition of done**
- Airplane-mode capture → queue → online → flush: rows appear on the backend with original `capturedAt` and geo. Re-flush produces no duplicates (dedup verified).

### Phase 4 — Read-back

**Tasks**
- `GET /inspections` (list) — params `siteId?`, `type?`, `from?`, `to?`, `page` (default 1), `limit` (1–100, default 20). Maps to:
  ```ts
  { id, siteId, type, inspectorName, failedCount, capturedAt, syncedAt }
  ```
- `GET /inspections/:id` (detail) → `{ id, clientUuid, siteId, inspectorName, type, checklist[], location?, photoUrls[], capturedAt, syncedAt, failedCount }`.
- Implement in `inspectionApiRepository` respecting scoping (field_officer sees only own records).

**Definition of done**
- Inspections list/detail screens render real synced data (with `inspectorName`/`failedCount`/`type` mapped correctly).

### Phase 5 — Screen wiring

**Tasks**
- Light up (data now lives): Inspections list/detail, Inspections capture form, Incidents capture form, Attendance check-in/out, Photo attach.
- Add a "Last synced / Pending N" indicator fed by `offlineQueue`.
- Tag every other tab with a "MOCK" badge (Mines, Observations, Notifications, Analytics, Reports, Audit, Users, Documents, Corrective Actions, Compliance, GIS) since no live backend endpoint backs them.

**Definition of done**
- Field-capture journey works on device; non-scoped screens disclaim "mock/demo" and never hit the network.

### Phase 6 — End-to-end verification

**Tasks**
- Full loop demo: login → offline capture (inspection with a `fail` checklist item) → photo upload → sync → **rule-triggered alert visible on the web dashboard** — without manual intervention.
- Dedup: retry same `clientUuid` → no duplicate server rows.
- `npm run lint` (eslint via `expo lint`) and `npx tsc --noEmit` pass.
- Backend `npm run verify` still green (no backend changes were made).
- Deployment sanity: `EXPO_PUBLIC_API_URL` pointed at deployed backend (Render/Railway/Atlas) works identically.

**Definition of done**
- PRD MVP loop (G1 → G3 → G4) demonstrable on the mobile app: capture → detect → alert → escalate → resolve, with the resolve step completing on the web/alerts interface.

#### Phase 6 — verification report (2026-09-11, branch `feat/phase6-e2e-verify`)

| Check | Result |
|---|---|
| Full loop (scripted): login `field_officer` → photo upload → `inspections/sync` with a safety `fail` item → `SAFETY_CHECKLIST_FAIL` alert (high) assigned to site `mine_official` | ✅ 12/12 (localhost + tunnel) |
| Dedup: resend same `clientUuid` → `rejected:[{reason:"duplicate"}]`, row count +1 across both calls exactly, `clientUuid` preserved on detail | ✅ |
| Alert visible + actionable on web dashboard (login Priya → `/app/alerts`, High badge, Acknowledge/Escalate) | ✅ Playwright UI probe |
| Playwright alerts lifecycle (acknowledge → resolve, escalate) against REAL backend | ✅ 2 passed |
| Playwright auth suite | ✅ 5 passed (after strict-mode fix) |
| `expo lint` / `npx tsc --noEmit` | ✅ 1 pre-existing error only / clean |
| Backend `npm run verify` | ⏳ pending (run last; reseeds DB) |

Deviations / findings (documented deliberately):
- **One backend change** (deviation from "no backend changes"): `backend/src/controllers/media.controller.ts` gained a `CLOUDINARY_ENABLED=false` branch mirroring `document.controller.ts` — media upload returned HTTP 500 in demo mode because the controller always called Cloudinary. Now returns a schema-valid placeholder URL (`https://local.invalid/agnistrot/...`). Required for the photo-upload leg of the loop.
- **Deployment sanity (task 5) DEFERRED**: no deploy config exists in the repo (no render.yaml/railway.toml/Dockerfile/Procfile) and no hosting accounts are provisioned. `EXPO_PUBLIC_API_URL` stays pointed at the dev tunnel `https://distributions-stereo-trim-chosen.trycloudflare.com/api/v1`. Deploy steps documented below.
- **Pre-existing e2e failures (unrelated)**: `documents.spec.ts` (waits for a `/api/v1/documents` GET that never fires in real-API mode) and `reports.spec.ts` (45s PDF-generation download timeout). Pre-date Phase 6; left untouched.
- **e2e helper fix**: `frontend/e2e/helpers.ts:18` and `auth.spec.ts:39` now scope the "Sign in" click to the login form — the login header also renders a "Sign in" toggle button (strict-mode violation otherwise).

Deployment steps (for task 5 completion later):
1. Provision MongoDB Atlas cluster → set `MONGO_URI`.
2. Provision Cloudinary → set `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`; leave `CLOUDINARY_ENABLED=true` for hosted images.
3. Render/Railway service from `backend/` (build `npm ci && npm run build`, start `node dist/server.js`); set `JWT_SECRET`, `MONGO_URI`, Cloudinary vars.
4. Point `App-frontend/.env` `EXPO_PUBLIC_API_URL` at the deployed base; re-verify with `node App-frontend/scripts/phase6-verify.mjs`.

---

## 5. Files to create / change (app side only)

| File | Change |
|---|---|
| `App-frontend/package.json` | add AsyncStorage, SecureStore, uuid (via `npx expo install`) |
| `App-frontend/.env.example` + `.env` | `EXPO_PUBLIC_API_URL` |
| `src/api/client.ts` | env base URL, Bearer request interceptor, 401 handling |
| `src/api/adapter.ts` | envelope/field mapping util (new) |
| `src/api/tokenStore.ts` | SecureStore JWT persistence (new) |
| `src/api/offlineQueue.ts` | AsyncStorage sync queue (new) |
| `src/api/endpoints.ts` | scope to live mobile paths |
| `src/repositories/api/authApiRepository.ts` | live login/me(decode)/logout (new) |
| `src/repositories/api/inspectionApiRepository.ts` | list/detail/sync (new) |
| `src/repositories/api/incidentApiRepository.ts` | sync (new) |
| `src/repositories/api/attendanceApiRepository.ts` | sync (new) |
| `src/repositories/api/mediaApiRepository.ts` | upload (new) |
| `src/repositories/index.ts` | switch to live repos |
| Capture screens under `app/(tabs)/` | wire forms + queue + sync status |

**Do NOT touch:** `backend/**`, `frontend/**` (web), `src/types/index.ts` (app), `src/services/**`, `src/hooks/**`, `src/store/**`, existing mock repos.

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Envelope/field-name divergence (backend `siteId` vs app `mineId`) | Convert only inside repository+adapter layer; screens unchanged |
| No `/auth/me` / `/auth/refresh` | Token-decode session restore; 401 → re-login |
| Offline-first PRD NFR vs demo scope | Offline queue implemented for the 3 sync types only; documented MVP scope |
| Hardcoded `localhost` unreachable on device | Env-driven `EXPO_PUBLIC_API_URL`; document LAN IP/tunnel |
| Missing `MVP-IMPLEMENTATION-SPEC.md` | Contracts pinned to `backend/src/` + Postman collection as authority |
| Login payload lacks `email`/`department` the UI renders | Adapter supplies safe fallbacks |

---

## 7. Definition of Done (plan-level)

- Field officer can log in, capture offline, upload photos, and sync — server shows the records with correct device `capturedAt` and geo, no duplicates on retry.
- Rule engine fires (e.g. an inspection with a `fail` safety item → `SAFETY_CHECKLIST_FAIL`) and the alert is visible on the role dashboard.
- All non-live screens are clearly tagged mock; `npm run lint` + `tsc --noEmit` + backend `npm run verify` all green.