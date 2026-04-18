# Development Guide

This document provides detailed information for developers working on LedgerX.

## 📋 Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Debugging](#debugging)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

## Development Setup

### 1. Clone and Install

```bash
git clone https://github.com/GGWarrior001/LedgerX.git
cd LedgerX
bun install
```

### 2. Environment Setup

```bash
# Copy the example environment file
cp .env.example .env

# For Firebase (optional, app works offline without it)
# Add your Firebase credentials to .env
```

### 3. Start Development

```bash
# Run development server with hot module replacement (HMR)
bun run dev

# Server will start at http://localhost:8080
# Changes to source files will automatically reload
```

## Project Structure

```
LedgerX/
├── src/
│   ├── components/          # Reusable React components
│   │   ├── layout/         # Page layout components (Sidebar, Topbar)
│   │   ├── modals/         # Modal dialogs for CRUD operations
│   │   ├── ui/             # shadcn/ui component library
│   │   ├── AutoLock.tsx    # Session timeout / auto-lock handler
│   │   ├── NavLink.tsx     # Navigation link component
│   │   └── NotificationPanel.tsx
│   ├── contexts/            # React Context for global state
│   │   ├── AppContext.tsx  # Global app state (transactions, clients, etc.)
│   │   └── AuthContext.tsx # Firebase authentication state
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities and helpers
│   │   ├── constants.ts    # App constants (currencies, fiscal years, etc.)
│   │   ├── firebase.ts     # Firebase initialization
│   │   ├── firestoreSync.ts# Cloud sync utilities
│   │   ├── storage.ts      # Encrypted localStorage wrapper
│   │   ├── types.ts        # TypeScript interfaces and types
│   │   └── utils.ts        # Helper functions
│   ├── pages/               # Page components (routes)
│   │   ├── Dashboard.tsx
│   │   ├── Invoices.tsx
│   │   ├── Expenses.tsx
│   │   ├── Clients.tsx
│   │   ├── Vendors.tsx
│   │   ├── Reports.tsx
│   │   ├── Ledger.tsx
│   │   ├── Settings.tsx
│   │   ├── Auth.tsx         # Firebase sign-in/sign-up
│   │   └── NotFound.tsx
│   ├── test/                # Test setup and examples
│   ├── App.tsx              # Root component
│   └── main.tsx             # React DOM entry point
├── electron/                # Electron desktop app
│   ├── main.js             # Main process
│   └── preload.js          # Context bridge
├── android/                 # Capacitor Android project
├── public/                  # Static assets
├── index.html               # HTML template
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── eslint.config.js        # ESLint rules
├── tailwind.config.ts      # Tailwind CSS config
└── package.json            # Dependencies and scripts
```

## Technology Stack

### Frontend
- **React 18**: UI library
- **TypeScript 5**: Type-safe JavaScript
- **Vite 5**: Lightning-fast build tool
- **React Router v6**: Client-side routing
- **Tailwind CSS 3**: Utility-first CSS framework
- **shadcn/ui**: Pre-built, customizable components
- **Recharts**: Data visualization library

### State Management
- **React Context**: Global state management
- **TanStack Query (React Query)**: Server state and caching

### Forms & Validation
- **React Hook Form**: Performant form handling
- **Zod**: Runtime schema validation

### Encryption & Auth
- **crypto-js**: AES-256-CBC encryption (client-side)
- **Firebase Auth**: Authentication (optional)
- **Firestore**: Cloud database (optional)

### Testing
- **Vitest**: Fast unit testing framework
- **Playwright**: E2E testing framework
- **@testing-library/react**: React testing utilities

### Desktop & Mobile
- **Electron 41**: Desktop app framework
- **Capacitor 6**: Mobile app framework (Android)

### Build & Development
- **TypeScript 5**: Type checking
- **ESLint 9**: Code linting
- **Tailwind CSS**: Styling
- **PostCSS**: CSS preprocessing

## Code Standards

### TypeScript

- Always define types explicitly
- Use `interface` for object types, `type` for unions/aliases
- Avoid `any`; use `unknown` if needed
- Enable strict mode checks in tsconfig

Example:
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

const user: User = { id: '1', name: 'John', email: 'john@example.com' };
```

### React Components

- Use functional components with hooks
- Extract reusable logic into custom hooks
- Props should be typed with `interface`
- Keep components small and focused (ideally <200 lines)

Example:
```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ label, onClick, disabled = false }) => (
  <button onClick={onClick} disabled={disabled}>
    {label}
  </button>
);
```

### File Organization

- One component per file
- Group related files in directories
- Use barrel exports (index.ts) for cleaner imports
- Name files with PascalCase for components, camelCase for utilities

### Naming Conventions

- **Components**: PascalCase (e.g., `InvoiceModal.tsx`)
- **Functions/Variables**: camelCase (e.g., `getInvoiceTotal()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- **Types/Interfaces**: PascalCase (e.g., `Invoice`, `ClientData`)

### Comments

- Document complex logic
- Explain "why", not "what" (code should be self-explanatory)
- Keep comments concise and updated

```typescript
// Calculate invoice total with tax (VAT = 18%)
const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
const vat = total * 0.18;
const finalTotal = total + vat;
```

### Linting

Run ESLint before committing:

```bash
bun run lint
```

Fix auto-fixable issues:

```bash
eslint . --fix
```

## Testing

### Unit Tests (Vitest)

```bash
# Run tests once
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test --coverage
```

Example test:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateTotal } from '../utils';

describe('calculateTotal', () => {
  it('should sum all values', () => {
    expect(calculateTotal([10, 20, 30])).toBe(60);
  });

  it('should handle empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });
});
```

### E2E Tests (Playwright)

```bash
# Run E2E tests
npx playwright test

# Run E2E tests with UI
npx playwright test --ui

# Run specific test file
npx playwright test tests/auth.spec.ts
```

Example E2E test:
```typescript
import { test, expect } from '@playwright/test';

test('user can create invoice', async ({ page }) => {
  await page.goto('http://localhost:8080');
  await page.click('text=New Invoice');
  await page.fill('input[name="clientName"]', 'Acme Corp');
  await page.click('button:has-text("Create")');
  await expect(page).toHaveURL('/invoices');
});
```

## Debugging

### Browser DevTools

1. Open http://localhost:8080
2. Press `F12` or `Ctrl+Shift+I` to open DevTools
3. Use Console, Sources, and Network tabs to debug

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:8080",
      "webRoot": "${workspaceFolder}/src",
      "sourceMapPathOverride": {
        "webpack:///*": "${webspaceFolder}/*"
      }
    }
  ]
}
```

### Electron Debugging

```bash
# Enable debug mode
DEBUG=* bun run electron

# Or with Chrome DevTools:
bun run electron
# Then press Ctrl+Shift+I in the app
```

## Common Tasks

### Add a New Page

1. Create `src/pages/MyPage.tsx`:
```typescript
const MyPage = () => {
  return <div>My Page Content</div>;
};

export default MyPage;
```

2. Add route to `src/App.tsx`:
```typescript
import MyPage from './pages/MyPage.tsx';

// In Routes component:
<Route path="/my-page" element={<MyPage />} />
```

3. Add navigation link in `src/components/layout/Sidebar.tsx`

### Add a New Component

1. Create component file `src/components/MyComponent.tsx`
2. Define props interface
3. Export component
4. Add tests in `src/test/MyComponent.test.ts`

Example:
```typescript
interface MyComponentProps {
  title: string;
  value: number;
}

const MyComponent: React.FC<MyComponentProps> = ({ title, value }) => {
  return (
    <div>
      <h2>{title}</h2>
      <p>{value}</p>
    </div>
  );
};

export default MyComponent;
```

### Add a Custom Hook

1. Create `src/hooks/useMyHook.ts`:
```typescript
import { useState, useCallback } from 'react';

export const useMyHook = () => {
  const [state, setState] = useState(null);
  
  const handleAction = useCallback(() => {
    setState('new value');
  }, []);

  return { state, handleAction };
};
```

2. Use in components:
```typescript
import { useMyHook } from '@/hooks/useMyHook';

const MyComponent = () => {
  const { state, handleAction } = useMyHook();
  return <button onClick={handleAction}>{state}</button>;
};
```

### Update TypeScript Types

1. Edit `src/lib/types.ts`:
```typescript
export interface Invoice {
  id: string;
  clientId: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  createdAt: Date;
}
```

2. Use in components:
```typescript
import type { Invoice } from '@/lib/types';

const InvoiceRow: React.FC<{ invoice: Invoice }> = ({ invoice }) => {
  return <tr><td>{invoice.id}</td></tr>;
};
```

## Troubleshooting

### Port 8080 Already in Use

```bash
# Kill process using port 8080 (macOS/Linux)
lsof -ti:8080 | xargs kill -9

# Or specify different port
bun run dev --port 3000
```

### Dependencies Not Installed

```bash
# Clear cache and reinstall
rm -rf node_modules
bun install
```

### TypeScript Errors

```bash
# Rebuild type definitions
bun install

# Check TypeScript compilation
npx tsc --noEmit
```

### Firebase Not Configured

- Ensure `.env` file exists with Firebase credentials
- Check `.env.example` for required variables
- Firebase is optional; app works offline without it

### Build Fails

```bash
# Clear build cache
rm -rf dist

# Rebuild
bun run build

# Check for TypeScript errors
npx tsc --noEmit
```

### Electron App Won't Start

```bash
# 1. Build web assets first
bun run build

# 2. Check for port 8080 conflicts
lsof -ti:8080 | xargs kill -9

# 3. Enable debug logging
DEBUG=* bun run electron
```

## Performance Tips

1. **Code Splitting**: Lazy-load pages with React Router
2. **Image Optimization**: Use appropriate formats and sizes
3. **Bundle Analysis**: Check build output size
4. **Memoization**: Use `useMemo` and `useCallback` wisely
5. **Query Caching**: Leverage TanStack Query's built-in caching

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/amazing-feature

# Make changes and commit
git add .
git commit -m "Add amazing feature"

# Push to remote
git push origin feature/amazing-feature

# Create pull request on GitHub
```

## Resources

- [Vite Docs](https://vitejs.dev/)
- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Router Docs](https://reactrouter.com/)
- [shadcn/ui Docs](https://ui.shadcn.com/)

---

Happy coding! 🚀
