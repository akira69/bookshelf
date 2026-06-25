#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  SUDO="${SUDO:-sudo}"
else
  SUDO=""
fi

if command -v apt-get >/dev/null 2>&1; then
  $SUDO apt-get update
  $SUDO apt-get install -y ffmpeg mp4v2-utils php-cli php-intl php-mbstring php-xml
elif command -v apk >/dev/null 2>&1; then
  $SUDO apk add --no-cache ffmpeg mp4v2 php php-intl php-mbstring php-simplexml php-xml
elif command -v dnf >/dev/null 2>&1; then
  $SUDO dnf install -y ffmpeg mp4v2-utils php-cli php-intl php-mbstring php-xml
elif command -v yum >/dev/null 2>&1; then
  $SUDO yum install -y ffmpeg mp4v2-utils php-cli php-intl php-mbstring php-xml
else
  echo "Unsupported package manager. Install ffmpeg, ffprobe, mp4chaps/mp4v2, and PHP CLI with intl, mbstring, and xml extensions." >&2
  exit 1
fi

echo "M4B conversion dependencies installed. Verify in Bookshelf under Settings > Media Management > M4B Conversion."
