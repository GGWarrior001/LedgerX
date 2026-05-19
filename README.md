# LedgerX

Modern, privacy-first personal finance and accounting software with encrypted local storage, optional cloud sync, and offline-first workflows.

![Version](https://img.shields.io/badge/version-1.3.0-brightgreen)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Vite](https://img.shields.io/badge/Vite-6-646CFF)
![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 1) Project Overview

LedgerX helps individuals, freelancers, and small teams manage invoices, expenses, clients, vendors, and reporting from a single interface.

### What LedgerX does
- Tracks invoicing and payment status
- Organizes expenses and vendor/client records
- Produces dashboard and report views for business health
- Stores data locally by default, with optional Firebase sync

### Core features
- Encrypted local data storage
- Offline-first usage
- Optional cloud sync (Firebase Auth + Firestore)
- JSON backup/export workflow
- Responsive web UI plus desktop (Electron) and Android (Capacitor)

### Target users
- Privacy-conscious individuals
- Freelancers and independent consultants
- Small businesses that need lightweight accounting without sacrificing data control

---

## 2) Key Features

- **Local-first encrypted storage** for core financial records
- **WebCrypto AES-GCM encryption** for authenticated local data protection
- **Async persistence architecture** with awaited writes and persistence-before-state updates
- **Cloud sync** via Firebase Authentication and Firestore
- **Import/export capabilities** (JSON export in app; import support in data service)
- **Offline support** with local storage as default source of truth
- **Autosave behavior** through immediate persistence on state-changing actions
- **Secure authentication** (Firebase email/password + local passcode lock)
- **Responsive UI** optimized for desktop and mobile layouts

---

## 3) Security Highlights

- **WebCrypto API** for modern browser-native cryptography
- **AES-256-GCM authenticated encryption** with per-record random IVs
- **PBKDF2-SHA256 key derivation** with runtime-configured iteration policy
- **Corruption/tamper detection** via GCM authentication tag verification
- **Async-safe persistence model** to avoid blocking and reduce unsafe write timing
- **Race-condition hardening** in critical flows (e.g., duplicate unlock prevention, persist-then-commit store updates)
- **Secure error handling patterns** with typed app errors and centralized handling utilities
- **Password/passcode validation** with strong-rule validation logic for auth flows
- **Security headers/policies** in `index.html` (CSP, referrer policy, permissions policy, anti-frame/mime-sniffing headers)

---

## 4) Architecture

LedgerX is a React + TypeScript SPA built on modular feature domains with Zustand state management.

- **React + TypeScript**: component-driven UI and strict typing
- **Zustand stores**: domain stores (`invoices`, `expenses`, `clients`, `vendors`, `app`, `auth`) for predictable state updates
- **Async storage layer**: encrypted `storage` service with async WebCrypto operations and envelope-based persistence
- **Firebase integration**: optional auth and Firestore sync with local-first fallback
- **Encryption flow**:
  1. User passcode → PBKDF2-SHA256 key derivation
  2. Data encrypted with AES-GCM (ciphertext + auth tag)
  3. Encrypted envelope stored in local storage
  4. Unlock requires verifier decryption with derived key

---

## 5) Tech Stack

- **React 18**
- **TypeScript 5**
- **Vite 6**
- **Firebase (Auth + Firestore)**
- **Zustand**
- **Tailwind CSS**
- **Electron** (desktop runtime)
- **Capacitor** (Android runtime)

---

## 6) Recent Major Improvements

- Migrated core encryption from **crypto-js** legacy paths to **WebCrypto** AES-GCM primitives
- Refactored storage and service paths to **async-first persistence**
- Hardened state updates with **persist-before-commit** patterns in domain stores
- Added safeguards around critical flows to reduce **race-condition risk**
- Improved encryption UX with clearer lock/unlock behavior and passcode-driven setup

---

## 7) Getting Started

### Prerequisites
- Node.js **22+** (recommended by dependency engines)
- npm

### Install
```bash
npm install
```

### Development server
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Test
```bash
npm run test
```

### Lint
```bash
npm run lint
```

### Typecheck
```bash
npm run typecheck
```

### Optional: Firebase setup (cloud sync)
1. Create a Firebase project.
2. Enable Email/Password auth.
3. Enable Firestore.
4. Copy `.env.example` to `.env` and fill `VITE_FIREBASE_*` values.

---

## 8) Security Notice

- All LedgerX encryption is performed **client-side**.
- Use a **strong passcode/password** and avoid reusing credentials.
- Plain financial data should not leave the device unencrypted; cloud sync is optional and user-controlled.

---

## 9) Project Structure

```text
LedgerX/
├── src/
│   ├── app/                  # App shell and main orchestration
│   ├── features/             # Domain modules (auth, invoices, expenses, etc.)
│   ├── shared/               # Shared services, stores, hooks, components
│   ├── lib/                  # Core libs (storage, webCrypto, firebase, validation, types)
│   ├── components/           # Global UI/layout components
│   └── test/                 # Unit test setup and test suites
├── electron/                 # Desktop entrypoint and preload
├── android/                  # Capacitor Android project
├── tests/e2e/                # Playwright end-to-end tests
├── index.html                # App entry + security meta headers
└── package.json              # Scripts and dependencies
```

---

## 10) Roadmap / Future Improvements

- Move expensive PBKDF2 work to **Web Workers** for smoother unlock UX
- Add **IndexedDB** backend option for larger local datasets
- Expand **E2E coverage** for encryption, sync, and onboarding flows
- Improve **sync conflict resolution** for multi-device updates

---

## License

MIT

## Contributing

Contributions are welcome. Please open issues or pull requests with clear reproduction steps and scope.

## Security Reporting

If you identify a security issue, please avoid posting exploit details publicly and contact maintainers responsibly.
