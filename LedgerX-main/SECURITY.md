# LedgerX Security Policy

## Security Overview

LedgerX is a privacy-first accounting application with multiple layers of security:

- **Encryption at Rest:** All sensitive data encrypted locally with WebCrypto AES-GCM
- **Encryption in Transit:** HTTPS/TLS for all cloud communication
- **Authentication:** Firebase Authentication with email/password (optional cloud sync)
- **Authorization:** User-scoped Firestore rules prevent cross-user access
- **Data Validation:** Strict Zod schemas + server-side Firestore rules validation
- **Session Management:** Auto-lock after configurable inactivity (1 hour for guests)
- **Content Security Policy:** Strict CSP prevents XSS and injection attacks

---

## Reporting Security Vulnerabilities

If you discover a security vulnerability in LedgerX, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Send an email to: security@ledgerx.dev (or maintainer email)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

4. Allow time for response and fix (typically 48-72 hours for critical issues)

---

## Security Best Practices for Deployment

### Production Deployment

1. **HTTPS Only**
   ```
   - Enable HTTPS/TLS for all traffic
   - Use strong certificates (TLS 1.2+)
   - Enable HSTS header (Strict-Transport-Security)
   - Set Secure flag on all cookies
   ```

2. **Environment Variables**
   ```bash
   # Use strong Firebase credentials
   # Store in secure vault (GitHub Secrets, AWS Secrets Manager, etc)
   # Never commit .env to source control
   # Rotate credentials regularly
   ```

3. **Firebase Configuration**
   ```
   - Deploy firestore.rules to production
   - Enable reCAPTCHA for auth endpoints
   - Set up authentication emulation for testing only
   - Use production database URL (not emulator)
   - Enable Cloud Audit Logs
   ```

4. **Security Headers** (enforced via index.html)
   ```
   Content-Security-Policy: default-src 'self'; ...
   X-Content-Type-Options: nosniff
   X-Frame-Options: DENY
   X-XSS-Protection: 1; mode=block
   Referrer-Policy: strict-origin-when-cross-origin
   Permissions-Policy: geolocation=(), microphone=(), ...
   ```

5. **Build & Bundling**
   ```bash
   # Build with optimizations
   npm run build
   
   # Verify no debug code in bundle
   # Run security linting
   npm run lint
   npm run typecheck
   
   # Audit dependencies
   npm audit
   ```

6. **Monitoring & Logging**
   ```
   - Enable Cloud Audit Logs for Firestore
   - Monitor for suspicious auth attempts
   - Set up alerts for quota violations
   - Track error rates in production
   ```

---

## Dependency Management

### Regular Audits

```bash
# Check for vulnerabilities
npm audit

# Fix automatic vulnerabilities
npm audit fix

# Check specific package
npm audit --package lodash
```

### Updating Dependencies

1. **Weekly:** Run `npm audit` in CI/CD
2. **Monthly:** Update patch versions (`npm update`)
3. **Quarterly:** Review and update minor versions
4. **As needed:** Emergency patches for critical vulnerabilities

### Vulnerable Dependency Response

When a vulnerability is discovered in a dependency:

1. Determine severity (critical/high/medium/low)
2. Check if fix is available
3. If critical: update immediately
4. If high: update within 1 week
5. If medium/low: batch with regular updates
6. Re-run tests after each dependency update

### Supply Chain Security

- Use `npm ci` in CI/CD (deterministic installs)
- Lock dependency versions (package-lock.json)
- Review major dependency updates
- Monitor for typosquatting attacks
- Use `npm ls` to check dependency tree

---

## Cryptography & Encryption

### Local Storage Encryption (Planned Migration)

**Current:** crypto-js PBKDF2 + AES-ECB
**Migration (Phase):** WebCrypto PBKDF2+SHA-256 + AES-GCM

- **Key derivation:** PBKDF2 with SHA-256, 120,000 iterations
- **Encryption:** AES-GCM with 256-bit keys
- **IV:** 12 random bytes per encryption (non-deterministic)
- **Auth Tag:** 16 bytes for integrity verification
- **Salt:** 16 random bytes, stored with user metadata

### Firebase Communication

- TLS 1.2+ enforced by Firebase
- Certificate pinning not required (Firebase handles this)
- All credentials transmitted over HTTPS only

### Password Security

- Minimum 12 characters (enforced client-side)
- Uppercase, lowercase, number, symbol required
- Real-time strength feedback
- Rate limiting: 3 failed attempts → exponential backoff

---

## Authentication & Authorization

### Firebase Auth

- Email/password authentication (optional)
- No session tokens stored client-side (Firebase handles)
- Session timeout: 10 minutes (encrypted) / 1 hour (guest)
- Auto-lock on inactivity

### Firestore Security Rules

All data scoped to authenticated user:

```firestore
match /users/{userId} {
  allow read: if signedInAs(userId);
  allow write: if signedInAs(userId) && validData();
}

match /ledgers/{userId}/entries/{entryId} {
  allow read: if signedInAs(userId);
  allow create: if signedInAs(userId) && validEntry();
  allow update, delete: if false;  // Append-only
}
```

---

## Data Validation

### Client-Side Validation

- Zod schemas for all data types
- Type-safe TypeScript interfaces
- Maximum field lengths enforced
- Date string validation (ISO 8601)
- Amount validation (non-negative, max 1B)

### Server-Side Validation

- Firestore rules re-validate all data
- Array size limits enforced
- Document size limits (1MB)
- Ownership verification (user_id)
- Immutability checks (ledger entries)

---

## Content Security Policy (CSP)

Current CSP policy (strict):

```
default-src 'self'
script-src 'self'
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src https://fonts.gstatic.com
connect-src 'self' https://*.googleapis.com https://*.firebaseio.com
img-src 'self' data: blob:
```

**Rationale:**
- No external scripts loaded
- Inline styles for UI framework (React)
- Google Fonts for typography
- Firebase for auth/sync
- Local images only

---

## Known Limitations & Risks

### Application Level

1. **IndexedDB not encrypted** — IndexedDB data not encrypted at rest
   - *Mitigation:* Only store encrypted data locally
   - *Future:* Encrypt IndexedDB with encryption keys

2. **Electron security** — Desktop app subject to OS-level attacks
   - *Mitigation:* Use Electron context isolation
   - *Future:* Code signing for release builds

3. **Capacitor/Android security** — Mobile app subject to device security
   - *Mitigation:* Use biometric auth when available
   - *Future:* FIPS 140-2 compliance

### Infrastructure Level

1. **Firebase quota limits** — Can be exhausted by DoS
   - *Mitigation:* Client-side rate limiting + debouncing
   - *Monitoring:* Firebase usage alerts

2. **Offline data access** — User can access encrypted data if device compromised
   - *Mitigation:* Auto-lock after inactivity
   - *Defense:* Strong device lock

3. **Metadata leakage** — Cloud sync reveals access patterns
   - *Mitigation:* Firestore obfuscation (future)
   - *Privacy:* User controls sync data

---

## Security Checklist for Deployment

- [ ] Enable HTTPS/TLS for all traffic
- [ ] Set environment variables securely (no .env in git)
- [ ] Deploy firestore.rules to production Firebase project
- [ ] Enable CSP headers in reverse proxy
- [ ] Enable HSTS header
- [ ] Run `npm audit` with 0 vulnerabilities
- [ ] Run `npm run lint` with 0 warnings
- [ ] Run `npm run typecheck` with 0 errors
- [ ] Run `npm test` with all tests passing
- [ ] Configure Firebase reCAPTCHA
- [ ] Enable Cloud Audit Logs
- [ ] Set up monitoring/alerting
- [ ] Review Firestore backup strategy
- [ ] Document security contact info
- [ ] Brief team on security practices

---

## Incident Response

If a security issue is discovered in production:

1. **Assess severity** (critical/high/medium/low)
2. **Notify stakeholders** (if data breach)
3. **Contain damage** (disable accounts, revoke tokens)
4. **Investigate root cause** (logs, audit trail)
5. **Fix vulnerability** (update code/rules)
6. **Deploy fix** (ASAP for critical)
7. **Communicate update** (to affected users)
8. **Review & improve** (prevent recurrence)

---

## Resources

- [Firebase Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Cryptography API](https://www.w3.org/TR/WebCryptoAPI/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [npm Security Best Practices](https://docs.npmjs.com/cli/v8/using-npm/security)

---

## Version History

- **v1.3.0** — Guest timeout (1h), security headers, dependency monitoring
- **v1.2.0** — Password validation improvements
- **v1.1.0** — Initial security hardening
- **v1.0.0** — Release

---

**Last Updated:** 2026-05-18  
**Maintained By:** LedgerX Security Team  
**Contact:** security@ledgerx.dev
