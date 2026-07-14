#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${HOME}/.local/share/applications"
AUTOSTART_DIR="${HOME}/.config/autostart"
BIN_DIR="${HOME}/.local/bin"

mkdir -p "${APP_DIR}" "${AUTOSTART_DIR}" "${BIN_DIR}"

if [[ ! -d "${PROJECT_DIR}/node_modules/electron" ]]; then
  npm --prefix "${PROJECT_DIR}" install
fi

sed \
  -e "s|__PROJECT_DIR__|${PROJECT_DIR}|g" \
  "${PROJECT_DIR}/packaging/vibeshot.desktop.in" > "${APP_DIR}/vibeshot.desktop"
chmod +x "${APP_DIR}/vibeshot.desktop"

sed \
  -e "s|__PROJECT_DIR__|${PROJECT_DIR}|g" \
  "${PROJECT_DIR}/packaging/vibeshot-autostart.desktop.in" > "${AUTOSTART_DIR}/vibeshot.desktop"
chmod +x "${AUTOSTART_DIR}/vibeshot.desktop"

ln -sf "${PROJECT_DIR}/scripts/vibeshot" "${BIN_DIR}/vibeshot"
chmod +x "${PROJECT_DIR}/scripts/vibeshot"

echo "VibeShot installed. It will start in the tray at login."
echo "Launch it now from your app menu or run: vibeshot"
