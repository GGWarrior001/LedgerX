# LedgerX — Production Readiness & Security Checklists
**Phase 10 | Principal Engineer Review**

---

## PRE-DEPLOYMENT CHECKLIST

### Environment & Build

- [ ] All `VITE_FIREBASE_*` environment variables set and validated
- [ ] `npm run verify` passes: lint → typecheck → test → audit → build
- [ ] `npm audit --audit-level=moderate` shows 0 high/critical vulnerabilities
- [ ] Build output does not contain `.env` files or API keys
- [ ] Source maps excluded from production build (`sourcemap: false` in vite.config.ts)
- [ ] `crypto-js` dependency removed if v2 migration is complete

### Web

- [ ] `index.html` has Content-Security-Policy meta tag (or set via server headers)
- [ ] HTTPS enforced; HTTP redirects to HTTPS at reverse proxy
- [ ] `public/security.txt` is up to date with contact info
- [ ] `robots.txt` correctly disallows sensitive paths

### Electron

- [ ] CSP set via `onHeadersReceived` (implemented in hardened `main.js`)
- [ ] `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` — all verified
- [ ] No `--disable-web-security` flag in production launch scripts
- [ ] `electron-builder` config includes code signing for macOS and Windows
- [ ] Auto-updater configured with HTTPS endpoint and signature verification

### Android

- [ ] `minifyEnabled true` and `shrinkResources true` confirmed in `release` build type
- [ ] ProGuard rules tested — no functional code stripped
- [ ] `data_extraction_rules.xml` excludes WebView localStorage from backup
- [ ] Release keystore stored securely (not in repository); CI/CD reads from secrets
- [ ] `targetSdkVersion` is current Android API level (34+)
- [ ] `allowBackup="false"` set in AndroidManifest or exclusion rules fully cover all paths
- [ ] `network_security_config.xml` disallows cleartext traffic
- [ ] App signed with release keystore before submitting to Play Store

### Firebase / Firestore

- [ ] Firestore Security Rules deployed (`firebase deploy --only firestore:rules`)
- [ ] Rules tested with Firebase Rules Simulator
- [ ] Firebase project in production mode (not Spark/free tier for billing-sensitive operations)
- [ ] Authentication providers limited to email/password (no unused providers enabled)
- [ ] Firestore data retention policy set

---

## SECURITY CHECKLIST

### Encryption

- [ ] PBKDF2-SHA256 with 210,000 iterations (OWASP 2024) — verified in `webCrypto.ts`
- [ ] Salt is 32 bytes (256-bit) — verified in `webCrypto.ts`
- [ ] AES-GCM with 128-bit authentication tag — verified in `webCrypto.ts`
- [ ] IV is 12 bytes, randomly generated per encryption — verified
- [ ] CryptoKey is non-extractable (`extractable: false`) — verified
- [ ] Encryption key never logged, serialized, or stored in plaintext
- [ ] `clearEncryptionKey()` called on lock, app background, and session expiry
- [ ] Brute-force protection: exponential backoff persisted to localStorage — verified
- [ ] `secureWipe()` implemented and tested — verified

### Authentication

- [ ] Passcode never stored or transmitted in plaintext — verified
- [ ] Wrong passcode returns `false` without leaking timing information
- [ ] Firebase Auth errors map to user-friendly messages (no raw error codes exposed)
- [ ] `browserLocalPersistence` used (session survives refresh, not tab-close) — acceptable for SPA
- [ ] Auth state listener cleaned up on unmount — verified in `authService.init()`

### Inactivity Lock

- [ ] `useIdleLock` hook mounted in `AppShell` — **TODO: add to AppShell.tsx**
- [ ] Lock triggers on `pointermove`/`keydown`/`mousedown`/`touchstart` inactivity
- [ ] Lock triggers immediately on `visibilitychange → hidden`
- [ ] Timeout respects `settings.sessionTimeout` (0 = disabled)
- [ ] Lock state persists across tab navigation (Zustand `locked` flag)

### Firestore

- [ ] Security rules use `signedInAs(userId)` on all user documents — verified
- [ ] `validSnapshot()` function validates all field types and keys — verified
- [ ] `validInvoice()` / `validExpense()` validate all sub-document fields — verified
- [ ] Ledger entries are append-only (`allow update, delete: if false`) — verified
- [ ] User document deletion disabled (`allow delete: if false`) — verified
- [ ] Array size limits enforced (Firestore rule `invoices.size() <= N` — TODO)

### Electron CSP

- [ ] `script-src 'self'` — no inline scripts, no `unsafe-eval` — verified
- [ ] `object-src 'none'` — no plugin execution — verified
- [ ] `base-uri 'none'` — base tag injection prevented — verified
- [ ] External navigation denied; only HTTPS links open in system browser — verified
- [ ] All permission requests denied — verified

### Android Security

- [ ] WebView cleartext blocked in `network_security_config.xml` — verified
- [ ] `data_extraction_rules.xml` excludes `app_webview` from backup — hardened
- [ ] No hardcoded secrets in source code or assets

---

## BACKUP STRATEGY

### User Data Backup

LedgerX is offline-first. The backup hierarchy is:

```
Primary:   localStorage / AES-GCM encrypted (always available)
Secondary: Firestore cloud sync (when Firebase configured + signed in)
Tertiary:  Manual JSON export (Settings → Export Data)
```

**Recommendations for users:**
1. Export encrypted JSON backup monthly from Settings.
2. Enable Firebase cloud sync for automatic secondary backup.
3. Remember your passcode — there is no password recovery without it (by design).

### Disaster Recovery

| Scenario | Recovery Path |
|---|---|
| App data cleared (browser) | Restore from JSON export or Firestore |
| Device lost (Android) | Firestore cloud sync restores on new device |
| Forgotten passcode | No recovery — data is permanently encrypted. Educate users upfront. |
| Firestore project deleted | Restore from most recent JSON export |
| Corrupt localStorage | JSON export is the recovery artifact |

### Backup Gaps

- **v2 (CryptoJS) data**: Cannot be auto-migrated without `crypto-js`. Users on v2 must export before upgrading.
- **No server-side backup for self-hosted**: If using a custom Firebase project, enable daily Firestore exports to Cloud Storage.

---

## MONITORING STRATEGY

### Error Tracking

The app currently has `console.error` for all internal errors. For production:

1. **Add error tracking hook** in `src/lib/errors.ts`:
   ```ts
   // In handleError():
   if (typeof window.__ledgerxErrorTracker === 'function') {
     window.__ledgerxErrorTracker(err);
   }
   ```

2. **Integrate Sentry** (privacy-respecting config):
   - Set `beforeSend` to strip all PII (names, amounts, email)
   - Only track error type + code, not payload content

3. **React Error Boundary**: Already implemented in `ErrorBoundary.tsx`. Ensure it reports to the tracker.

### Metrics to Monitor

| Metric | Alert Threshold |
|---|---|
| Unlock failures (per session) | > 5 → possible attack |
| Firestore sync errors (per hour) | > 10 → infrastructure issue |
| Storage quota exceeded | Any → user notification |
| PBKDF2 duration | > 3s → warn user, check device |

### Logging Policy

- **NEVER log**: passcodes, decrypted financial data, user names, email addresses
- **Log**: error codes, operation names, timing metrics (without payload)
- All `console.log` calls to be replaced with a `logger` abstraction in v5:
  ```ts
  // logger.ts (future)
  export const logger = {
    info:  (msg: string) => { if (isDev) console.log('[LX]', msg); },
    error: (code: string, err: unknown) => { /* send to tracker */ },
  };
  ```

---

## MIGRATION GUIDE: v3 → v4 CRYPTO

### What changed

| Parameter | v3 | v4 |
|---|---|---|
| PBKDF2 iterations | 120,000 | 210,000 |
| Salt size | 16 bytes | 32 bytes |
| Envelope version | `"v": 3` | `"v": 4` |
| Crypto version tag | absent | `"cv": 4` |
| Verifier version | `"v": 3` | `"v": 4` |

### Migration behavior

When a v3 user opens the app after the v4 update:

1. **First unlock**: The verifier was written with v3 parameters (120k iterations, 16-byte salt). The `StorageService.unlock()` reads `iterations` from the stored verifier and uses `PBKDF2_ITERATIONS_V3` automatically — so the first unlock works with no user action required.

2. **After successful unlock**: All new writes use v4 envelopes. Old v3 envelopes are re-encrypted lazily on next `save()`. There is no forced re-encryption on unlock to avoid a slow startup.

3. **Passcode change**: `changePasscode()` generates a new 32-byte salt, derives a new key with 210k iterations, and re-encrypts all app data immediately. The verifier is updated to v4.

4. **v3 verifier stays v3**: Until the user changes their passcode, the verifier remains v3 (120k iterations). This is acceptable — the verifier's purpose is passcode validation, not data encryption security.

### Forced migration path (optional for high-security deployments)

If you want to force all users to v4 parameters immediately, prompt for passcode re-entry once:

```ts
// In AppShell.tsx after unlock:
const verifier = JSON.parse(localStorage.getItem('lx_enc_verify') ?? '{}');
if (verifier.v < 4) {
  // Show "Security upgrade" dialog → call changePasscode() with same passcode
}
```

This is not implemented by default to avoid surprising users with a mandatory re-entry prompt.

---

## KNOWN REMAINING ISSUES (Not Addressed in This Audit)

| ID | Issue | Rationale for deferral |
|---|---|---|
| M-1 | v2 (CryptoJS) migration stub | Requires `crypto-js` runtime; users on v2 are expected to export first |
| M-2 | No field-level Firestore encryption | Requires key management infrastructure; Firestore rules provide access control |
| M-7 | Notification ID collision at 1000+ invoices | Low probability for personal finance app; tracked for v5 |
| L-5 | `crypto-js` in runtime dependencies | Remove after v2 user base confirmed zero |
| L-8 | `notification.id` uses `invoice.id + 1000` offset | Replace with `crypto.randomUUID()` in v5 |
| L-6 | No macOS Electron build target | Add `darwin` target to `electron-builder` config |
