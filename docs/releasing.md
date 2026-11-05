# LedgerX releases

LedgerX uses the version in the root `package.json` as the single release source of truth. The root `package-lock.json` version must match it. Android derives `versionName` and `versionCode` from that version, and Electron uses the same package metadata.

## Prepare a release

From a clean branch, choose the intended increment and run exactly one command:

```bash
npm version patch --no-git-tag-version
npm version minor --no-git-tag-version
npm version major --no-git-tag-version
```

These commands update both `package.json` and `package-lock.json` without creating a Git tag. Review the resulting diff, run the verification commands, commit, push, and open a pull request.

```bash
npm run lint
npm run typecheck
npm test
npm audit --audit-level=moderate
npm run build
```

## Run the release workflow

After the version bump is merged, manually dispatch `Release` without entering a version. The workflow derives `v<package.json version>`, validates the package and lockfile, rejects an existing tag or release, and builds all release artifacts. For tag-triggered runs, the pushed tag must exactly match `v<package.json version>`.

The workflow creates a missing tag for a successful manual release only after the Android and Electron jobs finish. It then creates a **draft** GitHub release and verifies its tag, draft status, and non-empty assets. A maintainer must review and publish the draft manually.
