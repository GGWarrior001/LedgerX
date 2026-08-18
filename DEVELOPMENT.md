# LedgerX — Development Guide

This document covers everything you need to know to work on LedgerX locally, including environment setup, project conventions, architecture decisions, and debugging tips.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Development Server](#development-server)
4. [Project Conventions](#project-conventions)
5. [Architecture Overview](#architecture-overview)
6. [Encryption Flow](#encryption-flow)
7. [State Management](#state-management)
8. [Adding a New Page](#adding-a-new-page)
9. [Adding a New Modal](#adding-a-new-modal)
10. [Working with Firebase](#working-with-firebase)
11. [Building for Each Platform](#building-for-each-platform)
12. [Debugging](#debugging)
13. [Dependency Management](#dependency-management)

---

## Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Node.js | 18 | LTS recommended |
| Bun | 1.x | Preferred package manager / runner |
| Git | any | |
| Java JDK | 11 | Android builds only |
| Android SDK | 31 | Android builds only |
| Android Studio | any | Android builds only |

---

## Initial Setup

```bash
# 1. Clone the repository
git clone https://github.com/GGWarrior001/LedgerX.git
cd LedgerX

# 2. Install all dependencies
bun install

# 3. Create your local environment file
cp .env.example .env
# Edit .env — Firebase keys are optional; leave blank for offline-only dev

# 4. Start the dev server
bun run dev
# → http://localhost:5173
```

---

## Development Server

```bash
bun run dev          # Vite dev server with HMR on http://localhost:5173
bun run build        # Production build → dist/
bun run preview      # Serve the production build locally
bun run lint         # ESLint check
bun run test         # Vitest unit tests (single run)
bun run test:watch   # Vitest in watch mode
```

---

## Project Conventions

### File naming

| Type | Convention | Example |
|------|-----------|---------|
| React components | PascalCase `.tsx` | `InvoiceModal.tsx` |
| Hooks | camelCase, `use` prefix | `useInvoices.ts` |
| Utilities / lib | camelCase `.ts` | `formatCurrency.ts` |
| Types | Defined in `src/lib/types.ts` | — |
| Tests | Co-located, `.test.ts` suffix | `InvoiceModal.test.ts` |

### Import order (enforced by ESLint)

1. Node built-ins
2. External packages
3. Internal aliases (`@/components/...`)
4. Relative imports

### Component structure

```tsx
// 1. Imports
import { useState } from 'react';
import { Button } from '@/components/ui/button';

// 2. Types / interfaces local to this file
interface Props { ... }

// 3. Component
const MyComponent: React.FC<Props> = ({ ... }) => {
  // 3a. Hooks
  // 3b. Derived state / memos
  // 3c. Handlers
  // 3d. Render
  return (...);
};

// 4. Default export
export default MyComponent;
```

---

## Architecture Overview

```
User interaction
      │
      ▼
  React pages  ←──────────────────┐
      │                           │
      ▼                           │
AppContext (global state)         │
      │                           │
      ├──► storage.ts             │
      │    (AES-256 encrypted     │
      │     localStorage)         │
      │                           │
      └──► firestoreSync.ts  ─────┘
           (optional Firebase
            cloud sync)
```

- **Pages** read/write data exclusively through `AppContext`.
- `AppContext` persists to `storage.ts` on every state change.
- When the user is authenticated, `firestoreSync.ts` mirrors the same data to Firestore.
- The UI never calls `localStorage` or Firebase directly.

---

## Encryption Flow

```
User passphrase
      │
      ▼  PBKDF2 (10,000 iterations, SHA-256, 256-bit output)
Derived key
      │
      ▼  AES-256-CBC (random IV per write)
Ciphertext  →  stored in localStorage as Base64
```

Key points:
- The passphrase never leaves the device.
- A new random IV is generated on every write, stored prepended to the ciphertext.
- `storage.ts` exposes `secureGet(key)` / `secureSet(key, value)` — always use these instead of `localStorage` directly.

---

## State Management

LedgerX uses two complementary tools:

| Tool | Used for |
|------|---------|
| React Context (`AppContext`) | Global mutable state: invoices, expenses, clients, vendors, settings |
| TanStack Query | Server-derived or async data (e.g. Firestore reads, future API calls) |

**Rule of thumb:** if the data lives in encrypted localStorage, it belongs in `AppContext`. If it is fetched asynchronously from a remote source, use TanStack Query.

---

## Adding a New Page

1. Create `src/pages/MyPage.tsx`.
2. Add a route in the router configuration (usually `src/main.tsx` or a dedicated `routes.tsx`).
3. Add a nav entry in `src/components/layout/Sidebar.tsx` using `<NavLink>`.
4. If the page needs data, add a selector/action to `AppContext`.

---

## Adding a New Modal

1. Create `src/components/modals/MyModal.tsx`.
2. Accept `isOpen: boolean` and `onClose: () => void` as props.
3. Use `<Dialog>` from `@/components/ui/dialog` (shadcn/ui) for accessibility.
4. Wire it up in the relevant page with a local `useState` for `isOpen`.

---

## Working with Firebase

Firebase is entirely **optional**. The app boots without any Firebase credentials.

To test cloud sync locally:

1. Fill in `VITE_FIREBASE_*` values in `.env`.
2. Enable **Email/Password** auth and **Firestore** in your Firebase project.
3. Sign in via the Auth page in the running app.
4. Data syncs automatically after sign-in.

Firestore security rules (recommended minimum for development):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Building for Each Platform

### Web (production)

```bash
bun run build        # outputs to dist/
bun run preview      # verify before deploying
```

### Electron (desktop)

```bash
bun run build
bun run electron           # run locally
bun run electron:build     # package (AppImage / NSIS)
```

### Android (Capacitor)

```bash
bun run build
npx cap sync android       # copy dist/ into the Android project
npx cap open android       # open Android Studio
# In Android Studio: Run ▶ or Build → Generate Signed APK
```

For CI releases, GitHub Actions builds **both signed APK and AAB** using
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEYSTORE_PASSWORD`, and `ANDROID_KEY_PASSWORD` repository secrets.

---

## Debugging

### Browser (web)

- Open DevTools (`F12`) on `http://localhost:5173`.
- React DevTools extension is recommended for inspecting Context state.
- All encrypted values in `localStorage` appear as Base64 strings — decrypt via `storage.ts` helpers in the console if needed.

### Electron

```bash
DEBUG=* bun run electron
```

The DevTools window opens automatically in development mode.

### Android

- Enable **USB debugging** on your device.
- Open `chrome://inspect` in desktop Chrome to attach to the WebView.
- Logcat in Android Studio shows Capacitor bridge messages.

---

## Dependency Management

```bash
# Add a runtime dependency
bun add <package>

# Add a dev dependency
bun add -d <package>

# Upgrade all dependencies interactively
bunx npm-check-updates -i

# Audit for known vulnerabilities
bun audit
```

> Before upgrading major versions of `crypto-js`, `firebase`, or `electron`, check the respective changelogs carefully — these packages have historically included breaking API changes.
