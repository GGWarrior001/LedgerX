# Contributing to LedgerX

Thank you for your interest in contributing to LedgerX! This document outlines the process and guidelines for contributing.

## 🎯 Ways to Contribute

- **Report bugs** - Help us identify and fix issues
- **Suggest features** - Share ideas for new functionality
- **Write documentation** - Improve guides and API docs
- **Submit code** - Fix bugs or implement features
- **Test** - Help test new features and find edge cases

## 📋 Before You Start

1. **Check existing issues** - Avoid duplicate work
2. **Read documentation** - Familiarize yourself with the project
3. **Review code standards** - See [DEVELOPMENT.md](DEVELOPMENT.md)
4. **Set up development environment** - Follow the setup guide

## 🚀 Getting Started

### 1. Fork the Repository

Click the "Fork" button on [GitHub](https://github.com/GGWarrior001/LedgerX).

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/LedgerX.git
cd LedgerX

# Add upstream remote
git remote add upstream https://github.com/GGWarrior001/LedgerX.git
```

### 3. Create a Feature Branch

```bash
# Always start from latest main
git checkout main
git pull upstream main

# Create feature branch with descriptive name
git checkout -b feature/your-feature-name
```

### 4. Set Up Development Environment

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env

# Start development server
bun run dev
```

## ✍️ Making Changes

### Code Style

- **Follow existing patterns** in the codebase
- **Use TypeScript** for all new code
- **Write meaningful commit messages** (see examples below)
- **Comment complex logic** - Explain the "why", not "what"
- **Keep functions small and focused** - Aim for single responsibility

### TypeScript Guidelines

```typescript
// ✅ Good: Clear types and meaningful names
interface InvoiceFilter {
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dateRange: { from: Date; to: Date };
}

function filterInvoices(invoices: Invoice[], filter: InvoiceFilter): Invoice[] {
  return invoices.filter(invoice => 
    invoice.status === filter.status &&
    invoice.date >= filter.dateRange.from &&
    invoice.date <= filter.dateRange.to
  );
}

// ❌ Avoid: Unclear types and poor naming
function filter(data: any[], opts: any): any[] {
  return data.filter(item => item.s === opts.s);
}
```

### React Best Practices

```typescript
// ✅ Good: Functional component with hooks
interface TodoItemProps {
  id: string;
  title: string;
  onDelete: (id: string) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({ id, title, onDelete }) => {
  return (
    <div>
      <span>{title}</span>
      <button onClick={() => onDelete(id)}>Delete</button>
    </div>
  );
};

// ❌ Avoid: Class components and complex state
class TodoItem extends Component {
  state = { isDeleting: false };
  // ... unnecessary complexity
}
```

### Component Organization

```
components/
  ├── MyFeature/
  │   ├── MyComponent.tsx       # Main component
  │   ├── MyComponent.test.ts   # Unit tests
  │   ├── MyComponent.module.css # Scoped styles (if needed)
  │   └── index.ts              # Barrel export
  └── index.ts                  # Main export
```

## 🧪 Testing

### Write Tests for Changes

```bash
# Unit tests
bun run test

# Watch mode during development
bun run test:watch

# With coverage
bun run test --coverage
```

### Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { calculateInvoiceTotal } from '../utils';

describe('calculateInvoiceTotal', () => {
  it('should calculate total with tax', () => {
    const items = [
      { price: 100, quantity: 2 },
      { price: 50, quantity: 1 }
    ];
    
    expect(calculateInvoiceTotal(items, 0.18)).toBe(267); // 250 * 1.18
  });

  it('should handle zero tax', () => {
    const items = [{ price: 100, quantity: 1 }];
    
    expect(calculateInvoiceTotal(items, 0)).toBe(100);
  });
});
```

## 🔍 Code Review Process

### Before Submitting PR

1. **Run lint** - `bun run lint`
2. **Run tests** - `bun run test`
3. **Build project** - `bun run build`
4. **Type check** - `npx tsc --noEmit`
5. **Test functionality** - Manual testing in browser

### Commit Guidelines

```bash
# Good commit messages
git commit -m "Add invoice payment tracking feature

- Implement payment status tracking
- Add payment history view
- Include unit tests (95% coverage)
- Update API documentation"

# Bad commit messages
git commit -m "Fix stuff"
git commit -m "WIP"
git commit -m "asdf"
```

## 📤 Submitting a Pull Request

### 1. Keep Branch Updated

```bash
git fetch upstream
git rebase upstream/main

# If conflicts occur, resolve them
# Then continue rebase
git rebase --continue
```

### 2. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 3. Create Pull Request

1. Go to [LedgerX Repository](https://github.com/GGWarrior001/LedgerX)
2. Click "New Pull Request"
3. Select `base: main` and `compare: your-branch`
4. Fill in the PR template

### 4. PR Template

```markdown
## Description
What does this PR do?

## Related Issues
Closes #123

## Type of Change
- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- List major changes
- Keep it concise

## Testing
How to test:
1. Step 1
2. Step 2

## Screenshots (if UI change)
[Optional: Add screenshots]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] `bun run lint` passes
- [ ] `bun run test` passes
- [ ] `bun run build` succeeds
- [ ] No breaking changes (or documented)
- [ ] Documentation updated (if needed)
- [ ] No `.env` or secrets committed
```

## 📝 Documentation Standards

### README & Guides

- Use clear, concise language
- Include code examples
- Add table of contents for long documents
- Keep instructions up-to-date
- Use proper markdown formatting

### Code Comments

```typescript
// ✅ Good: Explains why, not what
// Calculate invoice total with VAT to handle fractional cents correctly
const total = Math.round(baseAmount * 118) / 100;

// ❌ Bad: Obvious or confusing
// Loop through items
// multiply by 1.18
```

### JSDoc Comments

```typescript
/**
 * Calculates the total amount including tax
 * @param amount - Base amount before tax
 * @param taxRate - Tax rate as decimal (e.g., 0.18 for 18%)
 * @returns Total amount with tax applied
 * @example
 * const total = calculateTotal(100, 0.18); // 118
 */
function calculateTotal(amount: number, taxRate: number): number {
  return amount * (1 + taxRate);
}
```

## 🐛 Reporting Bugs

### Bug Report Template

```markdown
## Description
A clear and concise description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
A clear description of what you expected to happen.

## Actual Behavior
A clear description of what actually happened.

## Screenshots
If applicable, add screenshots to help explain the problem.

## Environment
- OS: [e.g. macOS 14, Windows 11, Ubuntu 22.04]
- Browser: [e.g. Chrome 124, Firefox 125] (for web)
- Node.js version: [e.g. 20.11.0]
- LedgerX version: [e.g. 1.3.0]
- Platform: [Web / Electron / Android]

## Additional Context
Any other context about the problem, such as whether it is intermittent,
whether it happens after a specific action, or relevant log output.
```

## 🔒 Reporting Security Vulnerabilities

If you discover a security vulnerability, **please do not open a public GitHub issue**.

Instead, report it responsibly by:

1. Emailing the maintainers directly (see the GitHub profile for contact details).
2. Including a clear description of the vulnerability, steps to reproduce, and potential impact.
3. Allowing reasonable time for a fix before any public disclosure.

We take security seriously and will respond promptly.

## 🙏 Thank You

Every contribution — no matter how small — helps make LedgerX better. We appreciate your time and effort!
