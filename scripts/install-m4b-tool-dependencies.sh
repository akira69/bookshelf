#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  SUDO="${SUDO:-sudo}"
else
  SUDO=""
fi

if command -v apt-get >/dev/null 2>&1; then
  $SUDO apt-get update
  $SUDO apt-get install -y ca-certificates curl ffmpeg php-cli php-intl php-mbstring php-xml
  if apt-cache show mp4v2-utils >/dev/null 2>&1; then
    $SUDO apt-get install -y mp4v2-utils
  else
    echo "mp4v2-utils is not available from this apt repository; mp4chaps support will be skipped."
  fi
elif command -v apk >/dev/null 2>&1; then
  $SUDO apk add --no-cache ca-certificates curl ffmpeg php php-intl php-mbstring php-simplexml php-xml
  if apk info -e mp4v2 >/dev/null 2>&1 || apk search -x mp4v2 >/dev/null 2>&1; then
    $SUDO apk add --no-cache mp4v2
  else
    echo "mp4v2 is not available from this apk repository; mp4chaps support will be skipped."
  fi
elif command -v dnf >/dev/null 2>&1; then
  $SUDO dnf install -y ca-certificates curl ffmpeg php-cli php-intl php-mbstring php-xml
  $SUDO dnf install -y mp4v2-utils || echo "mp4v2-utils is not available; mp4chaps support will be skipped."
elif command -v yum >/dev/null 2>&1; then
  $SUDO yum install -y ca-certificates curl ffmpeg php-cli php-intl php-mbstring php-xml
  $SUDO yum install -y mp4v2-utils || echo "mp4v2-utils is not available; mp4chaps support will be skipped."
else
  echo "Unsupported package manager. Install ffmpeg, ffprobe, PHP CLI with intl, mbstring, and xml extensions, then install m4b-tool." >&2
  exit 1
fi

M4B_TOOL_VERSION="${M4B_TOOL_VERSION:-v.0.4.2}"
M4B_TOOL_URL="https://github.com/sandreas/m4b-tool/releases/download/${M4B_TOOL_VERSION}/m4b-tool.phar"
M4B_TOOL_TARGET="${M4B_TOOL_TARGET:-/usr/local/bin/m4b-tool}"

echo "Installing m4b-tool ${M4B_TOOL_VERSION} to ${M4B_TOOL_TARGET}"
$SUDO curl --fail --location --output "${M4B_TOOL_TARGET}" "${M4B_TOOL_URL}"
$SUDO chmod 755 "${M4B_TOOL_TARGET}"

echo "M4B conversion dependencies installed. Verify in Bookshelf under Settings > Media Management > M4B Conversion."
