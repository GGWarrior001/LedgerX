# LedgerX — Personal Finance & Accounting App

A modern, privacy-first finance management application built with React, featuring AES-256 encryption, invoicing, expense tracking, client/vendor management, and financial reporting. Runs as a web app, a native desktop application (Electron), and a mobile app (Android via Capacitor).

![Built with React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4) ![Vite](https://img.shields.io/badge/Vite-5-646CFF) ![Electron](https://img.shields.io/badge/Electron-41-47848F) ![Capacitor](https://img.shields.io/badge/Capacitor-6-119EFF)

---

## ✨ Features

- **Dashboard** — At-a-glance financial overview with charts and key metrics
- **Invoices** — Create, track, and manage invoices (draft → sent → paid → overdue)
- **Expenses** — Log and categorize business expenses with receipt tracking
- **Clients** — Manage client profiles, billing history, and outstanding balances
- **Vendors** — Track vendor relationships and spending
- **Reports** — Visual financial reports powered by Recharts
- **General Ledger** — Complete transaction history
- **Auto-Lock** — Session timeout with configurable duration
- **Privacy Mode** — Hide sensitive financial data on screen
- **AES-256 Encryption** — All stored data encrypted with PBKDF2-derived keys via crypto-js
- **Data Export** — Back up all data as a JSON file from Settings
- **Onboarding Flow** — Guided first-time setup

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript 5 |
| Build Tool | Vite 5 |
| Desktop | Electron 41 |
| Mobile | Capacitor 6 (Android) |
| Styling | Tailwind CSS 3 + shadcn/ui |
| Charts | Recharts |
| Routing | React Router v6 |
| State | React Context + TanStack Query |
| Forms | React Hook Form + Zod |
| Encryption | crypto-js (AES-256-CBC, PBKDF2) |
| Testing | Vitest + Playwright |

## 📁 Project Structure

```
├── android/             # Capacitor Android project
├── electron/
│   ├── main.js          # Electron main process
│   └── preload.js       # Context bridge / preload script
└── src/
    ├── components/
    │   ├── layout/          # Sidebar, Topbar
    │   ├── modals/          # Client, Expense, Invoice, Vendor modals
    │   ├── ui/              # shadcn/ui components
    │   ├── AutoLock.tsx     # Session timeout handler
    │   ├── NavLink.tsx      # Navigation component
    │   ├── NotificationPanel.tsx
    │   └── Onboarding.tsx   # First-time setup wizard
    ├── contexts/
    │   └── AppContext.tsx   # Global app state
    ├── hooks/               # Custom React hooks
    ├── lib/
    │   ├── constants.ts     # App constants
    │   ├── storage.ts       # Encrypted localStorage wrapper
    │   ├── types.ts         # TypeScript interfaces
    │   └── utils.ts         # Utility functions
    ├── pages/
    │   ├── Dashboard.tsx
    │   ├── Invoices.tsx
    │   ├── Expenses.tsx
    │   ├── Clients.tsx
    │   ├── Vendors.tsx
    │   ├── Reports.tsx
    │   ├── Ledger.tsx
    │   └── Settings.tsx
    └── main.tsx
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm**, **bun**, or **pnpm**

### Installation

```bash
# Clone the repository
git clone https://github.com/GGWarrior001/LedgerX.git
cd LedgerX

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build
npm run preview
```

### Desktop App (Electron)

```bash
# Run the desktop app in development (build first)
npm run build
npm run electron

# Package the desktop app as an AppImage (Linux) or NSIS installer (Windows)
npm run electron:build
```

### Mobile App (Android via Capacitor)

```bash
# Build the web assets
npm run build

# Sync with the Android project
npx cap sync android

# Open in Android Studio to run or build the APK
npx cap open android
```

## 🔐 Security Architecture

LedgerX encrypts all financial data at rest using:

1. **PBKDF2** key derivation (user passphrase → encryption key)
2. **AES-256-CBC** symmetric encryption for all stored data
3. **Auto-lock** after configurable inactivity timeout
4. **Privacy mode** to mask sensitive values on screen

> All encryption runs client-side. No data leaves the device.

## 🧪 Testing

```bash
# Unit tests
npx vitest

# E2E tests
npx playwright test
```

## 📄 License

MIT

---


