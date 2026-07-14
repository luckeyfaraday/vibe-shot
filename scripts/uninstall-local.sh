#!/usr/bin/env bash
set -euo pipefail

rm -f "${HOME}/.local/share/applications/vibeshot.desktop"
rm -f "${HOME}/.config/autostart/vibeshot.desktop"
rm -f "${HOME}/.local/bin/vibeshot"
echo "VibeShot launcher removed. Your screenshots were left untouched."
