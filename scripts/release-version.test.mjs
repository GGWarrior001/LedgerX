import { describe, expect, it } from 'vitest';
import {
  computeAndroidVersionCode,
  resolveReleaseTag,
  validateReleaseAvailability,
  validateVersionFiles,
} from './release-version.mjs';

const files = (version, lockVersion = version) => ({
  packageJson: { version },
  packageLock: { version: lockVersion, packages: { '': { version: lockVersion } } },
});

describe('release version validation', () => {
  it.each([
    ['patch', '1.5.3', 1005003],
    ['minor', '1.6.0', 1006000],
    ['major', '2.0.0', 2000000],
  ])('computes a valid %s version code', (_, version, expectedCode) => {
    expect(computeAndroidVersionCode(version)).toBe(expectedCode);
  });

  it('rejects package and lockfile version mismatches', () => {
    expect(() => validateVersionFiles(files('1.5.3', '1.5.2'))).toThrow(
      'Version mismatch',
    );
    expect(() => validateVersionFiles({
      packageJson: { version: '1.5.3' },
      packageLock: { version: '1.5.3', packages: { '': { version: '1.5.2' } } },
    })).toThrow('Version mismatch');
  });

  it.each(['1.5', 'v1.5.3', '01.5.3', '1.5.3-beta', '1.5.3.0'])(
    'rejects invalid semantic version %s',
    (version) => {
      expect(() => validateVersionFiles(files(version))).toThrow();
    },
  );

  it('derives manual release tags from package.json', () => {
    expect(resolveReleaseTag({
      eventName: 'workflow_dispatch',
      refName: 'scaling-waffle',
      packageVersion: '1.5.3',
    })).toBe('v1.5.3');
  });

  it('rejects pushed tags that differ from package.json', () => {
    expect(() => resolveReleaseTag({
      eventName: 'push',
      refName: 'v1.5.3',
      packageVersion: '1.5.2',
    })).toThrow('does not match package.json');
  });

  it('rejects existing tags and releases', () => {
    expect(() => validateReleaseAvailability({
      eventName: 'workflow_dispatch',
      releaseTag: 'v1.5.3',
      tagExists: true,
      releaseExists: false,
    })).toThrow('already exists');
    expect(() => validateReleaseAvailability({
      eventName: 'workflow_dispatch',
      releaseTag: 'v1.5.3',
      tagExists: false,
      releaseExists: true,
    })).toThrow('release already exists');
  });
});
