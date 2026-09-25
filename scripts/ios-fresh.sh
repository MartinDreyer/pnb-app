#!/usr/bin/env bash
# Full uninstall + fresh build + fresh install + launch onto a physical iOS
# device — NOT the same as Xcode's own Run, which reinstalls over the
# existing app. A recurring WKWebView paint bug (thumbnails/logo/archive
# button silently not rendering) has only ever been fixed by a full
# reinstall, never by an incremental Run — see ROADMAP.md/CLAUDE.md and the
# comment above .menuTitle in index.html for the bug's history.
#
# Usage: npm run ios:fresh [-- <device-udid>]
# With no udid given, uses the first connected physical device Xcode reports.
set -euo pipefail

cd "$(dirname "$0")/.."

PROJECT="ios/App/App.xcodeproj"
SCHEME="App"
UDID="${1:-}"

if [ -z "$UDID" ]; then
  UDID=$(xcodebuild -showdestinations -project "$PROJECT" -scheme "$SCHEME" 2>/dev/null \
    | grep 'platform:iOS,' | grep -v 'placeholder' | head -1 \
    | sed -n 's/.*id:\([0-9A-F-]*\).*/\1/p')
fi

if [ -z "$UDID" ]; then
  echo "No connected iOS device found. Plug one in, or pass its UDID: npm run ios:fresh -- <udid>" >&2
  exit 1
fi

DEVICE_NAME=$(xcodebuild -showdestinations -project "$PROJECT" -scheme "$SCHEME" 2>/dev/null \
  | grep "id:$UDID" | sed -n 's/.*name:\([^}]*\)}.*/\1/p' | head -1)
echo "==> Target device: ${DEVICE_NAME:-unknown} ($UDID)"

echo "==> Syncing web assets into ios/"
npm run cap:sync

DERIVED_DATA=$(mktemp -d)
trap 'rm -rf "$DERIVED_DATA"' EXIT

echo "==> Uninstalling any existing build (ignoring error if not installed)"
xcrun devicectl device uninstall app --device "$UDID" dk.pnb.app 2>&1 || true

echo "==> Building fresh (Debug)"
xcodebuild -project "$PROJECT" -scheme "$SCHEME" -configuration Debug \
  -destination "id=$UDID" -derivedDataPath "$DERIVED_DATA" build

APP_PATH="$DERIVED_DATA/Build/Products/Debug-iphoneos/App.app"

echo "==> Installing fresh build"
xcrun devicectl device install app --device "$UDID" "$APP_PATH"

echo "==> Launching"
if ! xcrun devicectl device process launch --device "$UDID" dk.pnb.app; then
  cat >&2 <<EOF

Launch was blocked by the OS — normal right after a fresh install with a
free Apple ID (personal team) signing profile. On the device:
  Settings -> General -> VPN & Device Management -> trust the developer
  certificate, then open Mindfill from the home screen.
EOF
fi
