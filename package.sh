#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

VERSION="$(
  grep -E '"version"[[:space:]]*:' manifest.json \
    | head -n 1 \
    | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/'
)"

if [[ -z "$VERSION" ]]; then
  echo "error: could not read version from manifest.json" >&2
  exit 1
fi

OUTPUT_DIR="$ROOT/dist"
ZIP_NAME="cash-converters-buy-now-v${VERSION}.zip"
ZIP_PATH="$OUTPUT_DIR/$ZIP_NAME"

FILES=(
  manifest.json
  background.js
  content.js
  popup.js
  popup.html
  styles.css
  icons
)

for path in "${FILES[@]}"; do
  if [[ ! -e "$path" ]]; then
    echo "error: missing required file: $path" >&2
    exit 1
  fi
done

mkdir -p "$OUTPUT_DIR"
rm -f "$ZIP_PATH"

zip -r -X "$ZIP_PATH" "${FILES[@]}" >/dev/null

echo "Created $ZIP_PATH"
