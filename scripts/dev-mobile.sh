#!/bin/bash

# ActoGraph Mobile — mode développement (Quasar + Capacitor)
#
# Usage:
#   bash scripts/dev-mobile.sh           # Android (défaut)
#   bash scripts/dev-mobile.sh ios       # iOS (macOS + Xcode uniquement)
#   bash scripts/dev-mobile.sh --help
#
# Prérequis Android : Android Studio, SDK, émulateur ou appareil USB.
# Prérequis iOS : Xcode, simulateur ou appareil.

# Ensure script is run with bash
if [ -z "$BASH_VERSION" ]; then
    echo "This script must be run with bash, not sh"
    exit 1
fi

set -e

scriptFolderPath="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
    echo "Usage: bash scripts/dev-mobile.sh [android|ios]"
    echo ""
    echo "  android   Quasar dev + Capacitor Android (défaut)"
    echo "  ios       Quasar dev + Capacitor iOS (macOS uniquement)"
    exit 0
fi

if ! command -v yarn &> /dev/null; then
    echo "Yarn could not be found. Please install it on the system."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "Node.js could not be found. Please install Node 18 or 20."
    exit 1
fi

NODE_MAJOR="$(node -v | cut -d '.' -f 1 | cut -d 'v' -f 2)"
if [ "$NODE_MAJOR" != "18" ] && [ "$NODE_MAJOR" != "20" ]; then
    echo "Node.js 18 or 20 is required (found: $(node -v))."
    exit 1
fi

TARGET="${1:-android}"
case "$TARGET" in
    android)
        ;;
    ios)
        ;;
    *)
        echo "Unknown target: $TARGET"
        echo "Use: android (default) or ios. See --help."
        exit 1
        ;;
esac

cd "$scriptFolderPath/../mobile"
yarn install

if [ "$TARGET" = "ios" ]; then
    yarn dev:ios
else
    yarn dev
fi
