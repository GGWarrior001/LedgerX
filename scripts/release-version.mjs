#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const MAX_ANDROID_VERSION_CODE = 2147483647;

export function computeAndroidVersionCode(version) {
  const match = SEMVER_PATTERN.exec(version);
  if (!match) {
    throw new Error(`Version must use MAJOR.MINOR.PATCH format: ${version || '<empty>'}.`);
  }

  const [, major, minor, patch] = match.map(Number);
  const versionCode = major * 1_000_000 + minor * 1_000 + patch;
  if (versionCode <= 0 || versionCode > MAX_ANDROID_VERSION_CODE) {
    throw new Error(`Computed Android versionCode is outside the valid range: ${versionCode}.`);
  }
  return versionCode;
}

export function resolveReleaseTag({ eventName, refName, packageVersion }) {
  computeAndroidVersionCode(packageVersion);
  const expectedTag = `v${packageVersion}`;

  if (eventName === 'workflow_dispatch') {
    return expectedTag;
  }
  if (eventName === 'push') {
    if (!refName) {
      throw new Error('Push release is missing the Git tag ref name.');
    }
    if (refName !== expectedTag) {
      throw new Error(`Pushed tag ${refName} does not match package.json version ${packageVersion}; expected ${expectedTag}.`);
    }
    return refName;
  }
  throw new Error(`Unsupported release event: ${eventName}.`);
}

export function validateVersionFiles({ packageJson, packageLock }) {
  const packageVersion = packageJson?.version;
  const lockVersion = packageLock?.version;
  const lockPackageVersion = packageLock?.packages?.['']?.version;
  if (!packageVersion) {
    throw new Error('package.json is missing a version.');
  }
  if (!lockVersion) {
    throw new Error('package-lock.json is missing its top-level version.');
  }
  if (!lockPackageVersion) {
    throw new Error('package-lock.json is missing its packages[""] root version.');
  }
  if (packageVersion !== lockVersion || packageVersion !== lockPackageVersion) {
    throw new Error(`Version mismatch: package.json=${packageVersion}, package-lock.json=${lockVersion}, package-lock.json packages[""]=${lockPackageVersion}. Run npm install --package-lock-only after changing the version.`);
  }
  computeAndroidVersionCode(packageVersion);
  return packageVersion;
}

export function validateReleaseAvailability({ tagExists, releaseExists, eventName, releaseTag }) {
  if (eventName === 'workflow_dispatch' && tagExists) {
    throw new Error(`Release tag ${releaseTag} already exists. Bump package.json and package-lock.json to a new version.`);
  }
  if (releaseExists) {
    throw new Error(`A GitHub release already exists for ${releaseTag}. Use a new version; existing releases are never overwritten.`);
  }
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [, , packagePath = 'package.json', lockPath = 'package-lock.json'] = process.argv;
  const packageJson = readJson(packagePath);
  const packageLock = readJson(lockPath);
  const packageVersion = validateVersionFiles({ packageJson, packageLock });
  const releaseTag = resolveReleaseTag({
    eventName: process.env.GITHUB_EVENT_NAME || 'workflow_dispatch',
    refName: process.env.GITHUB_REF_NAME,
    packageVersion,
  });
  const versionCode = computeAndroidVersionCode(packageVersion);
  console.log(JSON.stringify({ packageVersion, releaseTag, versionCode }));
}
