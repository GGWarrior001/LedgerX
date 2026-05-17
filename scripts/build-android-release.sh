#!/bin/sh

set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)

required_vars="ANDROID_KEYSTORE_PATH ANDROID_KEY_ALIAS ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_PASSWORD"

for var_name in $required_vars; do
  eval "var_value=\${$var_name-}"
  if [ -z "$var_value" ]; then
    echo "Missing required environment variable: $var_name" >&2
    exit 1
  fi
done

if [ ! -f "$ANDROID_KEYSTORE_PATH" ] && [ ! -f "$PROJECT_ROOT/$ANDROID_KEYSTORE_PATH" ]; then
  echo "Keystore file not found: $ANDROID_KEYSTORE_PATH" >&2
  exit 1
fi

cd "$PROJECT_ROOT"

npm run build
npx cap sync android

cd "$PROJECT_ROOT/android"
./gradlew --no-daemon --stacktrace assembleRelease bundleRelease

APK_PATH="$PROJECT_ROOT/android/app/build/outputs/apk/release/app-release.apk"
AAB_PATH="$PROJECT_ROOT/android/app/build/outputs/bundle/release/app-release.aab"

if [ ! -f "$APK_PATH" ]; then
  echo "Signed release APK was not produced: $APK_PATH" >&2
  exit 1
fi

if [ ! -f "$AAB_PATH" ]; then
  echo "Signed release AAB was not produced: $AAB_PATH" >&2
  exit 1
fi

echo
echo "Signed release APK:"
echo "$APK_PATH"
echo
echo "Signed release AAB:"
echo "$AAB_PATH"
