# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Running against the real backend

The app resolves the API base from `EXPO_PUBLIC_API_URL`. The checked-in `.env`
contains a stale tunnel URL — don't rely on it. Boot with an override:

```bash
EXPO_PUBLIC_API_URL=http://localhost:5000/api/v1 npx expo start --web --port 8081
```

Backend E2E stack: start a local single-node MongoDB replica set
(`mongod --replSet rs0 --port 27018 --dbpath <tempdir>`), then boot the backend
with `MONGO_URI=mongodb://127.0.0.1:27018/agnistrot` (the transactional outbox
requires a replica set) and seed it (`npm run seed` in `backend/`).

## Verification gates

```bash
npm run verify:app   # typecheck + expo lint + expo export --platform web
```

Expo-web Playwright suite (run from `../frontend`): `npx playwright test --project=expo-web`.

## Mobile device smoke checklist (Phase 7)

Seed accounts: `amit@agnistrot.com` (corporate) · `priya@agnistrot.com` (mine official) ·
`rahul@agnistrot.com` (field officer) · `meena@agnistrot.com` (regulator) — all `password123`.

1. **f07 users — Manage modal (corporate).** Sign in as `amit@…` → Users tab → Manage a
   user → change role → Save → row reflects the new role. Deactivate → row flips to
   Inactive → that user can no longer sign in (message shown, stays on login).
   Reactivate → access restored.
2. **f07 RBAC.** Sign in as `rahul@…` (field officer) → no Users entry in More; direct
   navigation to the Users screen shows the corporate-only guard.
3. **f08 corrective close-out.** Sign in as `priya@…` → open a non-closed corrective
   action (detail from the list) → resolve the alert via the alert lifecycle → the
   close-out panel appears → fill recommendation/effectiveness/evidence → Submit →
   status VERIFIED. Sign in as `amit@…` → open the same action → Review note → Approve →
   status CLOSED with review evidence. As `rahul@…`, the close-out submit is denied (403).
4. **Offline-first capture → sync.** Sign in as `rahul@…` → put the device offline
   (airplane mode) → capture an attendance Check In → Sync screen shows it queued →
   reconnect → Sync Now (or wait for auto-sync) → the row appears in the backend
   attendance feed; queue shows All synced.
5. **General smoke.** Dashboards render per role, capture forms (inspection/incident/
   attendance) save and sync, corrective-actions list reflects the live feeds,
   dark/light theme toggle works.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
