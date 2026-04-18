# LedgerX — Personal Finance & Accounting App

A modern, privacy-first finance management application built with React, featuring AES-256 encryption, invoicing, expense tracking, client/vendor management, and financial reporting. Runs as a web app, a native desktop application (Electron), and a mobile app (Android via Capacitor).

![Version](https://img.shields.io/badge/version-1.3.0-brightgreen) ![Built with React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4) ![Vite](https://img.shields.io/badge/Vite-5-646CFF) ![Electron](https://img.shields.io/badge/Electron-41-47848F) ![Capacitor](https://img.shields.io/badge/Capacitor-6-119EFF) ![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28) ![License](https://img.shields.io/badge/license-MIT-green)

> **Your financial data, your control.** LedgerX keeps your accounting private and secure, with all encryption happening on your device.

---

---

## ✨ Features

- **Dashboard** — At-a-glance financial overview with charts, key metrics, and recent transactions
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
- **Onboarding Flow** — Guided first-time setup wizard
- **Multi-Currency Support** — Configurable currency symbol per business
- **Fiscal Year Settings** — Flexible fiscal year configuration
- **Notifications** — In-app notification panel
- **Cloud Sync** — Optional Firebase authentication (email/password) with Firestore-backed cloud sync so your data is available across devices
- **Offline-First** — App works fully without a Firebase account; cloud sync activates automatically once signed in

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
| Auth / Sync | Firebase Auth + Firestore |
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
    │   ├── AppContext.tsx   # Global app state
    │   └── AuthContext.tsx  # Firebase authentication state
    ├── hooks/               # Custom React hooks
    ├── lib/
    │   ├── constants.ts     # App constants (currencies, fiscal years, categories)
    │   ├── firebase.ts      # Firebase app / auth / Firestore initialisation
    │   ├── firestoreSync.ts # Cloud data read/write helpers
    │   ├── storage.ts       # Encrypted localStorage wrapper
    │   ├── types.ts         # TypeScript interfaces
    │   └── utils.ts         # Utility functions
    ├── pages/
    │   ├── Auth.tsx         # Sign-in / sign-up page (Firebase)
    │   ├── Dashboard.tsx
    │   ├── Expenses.tsx
    │   ├── Invoices.tsx
    │   ├── Clients.tsx
    │   ├── Vendors.tsx
    │   ├── Reports.tsx
    │   ├── Ledger.tsx
    │   ├── Settings.tsx
    │   ├── Index.tsx        # App entry / redirect
    │   └── NotFound.tsx     # 404 page
    ├── test/                # Unit test setup and examples
    └── main.tsx
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Bun** (recommended), **npm**, or **pnpm**
- **Git** (for cloning and version control)

### Installation

```bash
# Clone the repository
git clone https://github.com/GGWarrior001/LedgerX.git
cd LedgerX

# Install dependencies (Bun recommended)
bun install
# OR with npm
npm install

# Start development server (runs on http://localhost:8080)
bun run dev
```

The app will be available at `http://localhost:8080`.

### Firebase Setup (Optional — for Cloud Sync)

Cloud sync is opt-in. The app runs fully offline without a Firebase project.

To enable authentication and Firestore sync:

1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Email/Password** authentication under *Authentication → Sign-in method*.
3. Enable **Firestore Database** (start in production or test mode).
4. Copy `.env.example` to `.env` and fill in your project credentials:

```bash
cp .env.example .env
# Then edit .env with your VITE_FIREBASE_* values
```

**Note**: Never commit `.env` to source control. It's already in `.gitignore`.

### Build for Production

```bash
# Build the production bundle
bun run build

# Preview the production build locally
bun run preview
```

### Desktop App (Electron)

```bash
# 1. Build the web assets first
bun run build

# 2. Run the desktop app in development
bun run electron

# 3. Package the desktop app as an AppImage (Linux) or NSIS installer (Windows)
bun run electron:build
```

### Mobile App (Android via Capacitor)

```bash
# 1. Build the web assets
bun run build

# 2. Sync with the Android project
npx cap sync android

# 3. Open in Android Studio to run or build the APK
npx cap open android
```

## 🔐 Security Architecture

LedgerX encrypts all financial data at rest using:

1. **PBKDF2** key derivation (user passphrase → encryption key)
2. **AES-256-CBC** symmetric encryption for all stored data
3. **Auto-lock** after configurable inactivity timeout
4. **Privacy mode** to mask sensitive values on screen

> All encryption runs client-side. No data leaves the device unless you opt in to cloud sync.

When cloud sync is enabled, data is stored in **Firestore** under your authenticated Firebase user account. Sign-in/sign-up is handled via **Firebase Authentication** (email/password).

## 🧪 Testing

```bash
# Unit tests
npx vitest run

# E2E tests
npx playwright test
```

## 📄 License

MIT

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Make** your changes
4. **Commit** with a descriptive message (`git commit -m 'Add amazing feature'`)
5. **Push** to your branch (`git push origin feature/amazing-feature`)
6. **Open** a pull request

### Code Standards

- Use **TypeScript** for all new code
- Follow **ESLint** configuration (run `npm run lint`)
- Write **unit tests** for logic (Vitest)
- Add **E2E tests** for user flows (Playwright)
- Keep components **small and focused**

### Running Tests

```bash
# Run all tests
bun run test

# Watch mode
bun run test:watch

# Lint code
bun run lint
```

## 🐛 Reporting Issues

Found a bug or want to suggest a feature? Please [open an issue](https://github.com/GGWarrior001/LedgerX/issues) with:

- **Clear description** of the problem
- **Steps to reproduce** (if applicable)
- **Expected vs actual** behavior
- **Screenshots** (for UI bugs)
- **Environment** details (OS, browser, Node version)

## 📞 Support

- **Documentation**: See sections above for setup, architecture, and API details
- **Issues**: Check [existing issues](https://github.com/GGWarrior001/LedgerX/issues)
- **Discussions**: Share ideas and ask questions in [discussions](https://github.com/GGWarrior001/LedgerX/discussions)

## 🗺️ Roadmap

Planned features and improvements:

- [ ] Budget forecasting and alerts
- [ ] Tax report generation
- [ ] Multi-user support with role-based access
- [ ] Advanced financial analytics
- [ ] PDF invoice/receipt generation
- [ ] Bank account integration (read-only sync)
- [ ] iOS support via Capacitor
- [ ] Dark mode improvements
- [ ] Performance optimizations

## 🎓 Learning Resources

### For Developers

- [Vite Documentation](https://vitejs.dev/)
- [React 18 Guide](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)

### Architecture Guides

- **State Management**: Using React Context + TanStack Query for optimal data fetching
- **Encryption Flow**: PBKDF2 → AES-256-CBC on client-side only
- **Authentication**: Firebase Auth with optional Firestore sync
- **Testing**: Vitest for units, Playwright for E2E

## 🚨 Security Notes

- **All encryption is client-side**: No plain data sent to servers
- **Optional cloud sync**: Firebase sync requires explicit user authentication
- **Auto-lock feature**: Prevents unauthorized access during inactivity
- **Privacy mode**: Masks financial data on screen to prevent shoulder surfing
- **Source-available**: Code is open for security audits

If you find a security vulnerability, please **do not open a public issue**. Contact the maintainers directly.

## 💡 Tips & Tricks

### Development Workflow

```bash
# Fast development with HMR (Hot Module Replacement)
bun run dev

# Debug in browser DevTools
# Open http://localhost:5173 and use F12

# Build once and preview production bundle
bun run build && bun run preview

# Test with real Firebase (set .env variables)
# or rely on offline-first mode for development
```

### Performance Optimization

- Lazy-load pages with React Router
- Use TanStack Query for smart caching
- Monitor bundle size: `bun run build`
- Leverage Vite's code splitting automatically

### Common Issues

**Q: "Cannot find module" errors on startup**
- Run `bun install` to ensure all dependencies are installed
- Clear node_modules and reinstall if issues persist: `rm -rf node_modules && bun install`

**Q: Firebase connection fails**
- Verify `.env` file with correct Firebase credentials
- Check Firebase project permissions for Firestore Database
- Confirm Email/Password auth is enabled in Firebase Console

**Q: Electron app won't start**
- Run `bun run build` first (required to generate dist/)
- Check if port 5173 is in use if running dev server
- Inspect electron logs: `DEBUG=* bun run electron`

**Q: Mobile app won't build**
- Update Capacitor: `bun install`
- Sync Android: `npx cap sync android`
- Ensure Java 11+ and Android SDK 31+ are installed

## 📊 Project Stats

- **Lines of Code**: ~5,000+
- **Components**: 50+
- **Test Coverage**: Vitest + Playwright tests included
- **Dependencies**: 30+ core, 20+ dev
- **Bundle Size**: ~500KB gzipped (optimized)

## 🌍 Internationalization (i18n)

Currently, LedgerX supports English with multi-currency display. Future versions will include:

- UI translation support
- Locale-specific date/number formatting
- RTL language support

---

## 📝 Changelog

### v1.3.0
- Electron desktop app support
- Capacitor Android mobile app integration
- Enhanced Firebase cloud sync
- Auto-lock session timeout
- Privacy mode for sensitive data
- Multi-currency support
- Improved financial reports

### v1.2.0
- General Ledger view
- Advanced expense categorization
- Report generation

### v1.1.0
- Client and vendor management
- Invoice workflow (draft → paid)
- Firestore cloud sync

### v1.0.0
- Initial release
- Core dashboard and transactions
- AES-256 encryption
- Offline-first architecture

---

**Made with ❤️ by the LedgerX Team**


