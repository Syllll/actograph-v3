#!/bin/bash

# Ensure script is run with bash
if [ -z "$BASH_VERSION" ]; then
    echo "This script must be run with bash, not sh"
    exit 1
fi

# Exit on error in subscript
set -e

# Get script directory in a cross-platform way
scriptFolderPath="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Electron requires Node 20 (native modules, electron-builder, quasar target node20).
# The system default can stay on Node 24; this script switches to Node 20 locally.
ensure_node_20() {
    local node_major
    node_major="$(node -v 2>/dev/null | cut -d '.' -f 1 | cut -d 'v' -f 2 || true)"
    if [ "$node_major" = "20" ]; then
        NODE_20_BIN="$(dirname "$(command -v node)")"
        echo "Node $(node -v) déjà actif"
        return 0
    fi

    # nvm (most common)
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        export NVM_DIR="$HOME/.nvm"
        # shellcheck source=/dev/null
        . "$NVM_DIR/nvm.sh"
        if nvm use 20 --silent 2>/dev/null; then
            NODE_20_BIN="$(dirname "$(command -v node)")"
            echo "Node $(node -v) activé via nvm pour Electron"
            return 0
        fi
    fi

    # fnm
    if command -v fnm &> /dev/null; then
        eval "$(fnm env --shell bash)"
        if fnm use 20 --silent-if-installed 2>/dev/null; then
            NODE_20_BIN="$(dirname "$(command -v node)")"
            echo "Node $(node -v) activé via fnm"
            return 0
        fi
    fi

    # Direct path fallback (nvm install without sourcing nvm.sh)
    local nvm_bin
    for nvm_bin in "$HOME/.nvm/versions/node"/v20.*/bin; do
        if [ -x "$nvm_bin/node" ]; then
            NODE_20_BIN="$nvm_bin"
            export PATH="$NODE_20_BIN:$PATH"
            echo "Node $(node -v) activé depuis $NODE_20_BIN"
            return 0
        fi
    done

    echo "Node 20 introuvable. Electron ne fonctionne pas avec Node 24."
    echo "Installez Node 20 sans changer votre défaut système : nvm install 20"
    exit 1
}

ensure_node_20

# Is yarn installed ? If not, inform the user
if ! command -v yarn &> /dev/null; then
    echo "Yarn could not be found. Please install it on the system."
    exit 1
fi

# Go into the api folder
cd "$scriptFolderPath/../api"

# Install the dependencies
yarn install

# Run the migrations
yarn migration:run

# Go back to the script folder
cd "$scriptFolderPath"

# Variable to store terminal PID and command
terminal_pid=""
# Propagate Node 20 to the API terminal (separate shell session)
api_command="export PATH=\"$NODE_20_BIN:\$PATH\" && cd $scriptFolderPath/../api && yarn migration:run && yarn start:dev-electron"

# Deal with API

# Open new terminal tab for API server (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript <<EOF
        tell application "Terminal"
            activate
            do script "$api_command; exec bash"
            set custom title of selected tab of window 1 to "api"
        end tell
EOF
    sleep 1  # Give the process time to start
    terminal_pid=$(pgrep -f "$api_command")
# Open new terminal tab for API server (Linux)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Start in a new session to make process group handling easier
    setsid gnome-terminal --tab --title="api" -- bash -c "$api_command; exec bash" &
    terminal_pid=$!
    echo "API terminal process ID: $terminal_pid"
    sleep 1  # Give the process time to start
else
    echo "Unsupported operating system"
    exit 1
fi

# Deal with Electron

# Go into the front folder
cd "$scriptFolderPath/../front"

# Install the dependencies
yarn install

# Start electron in dev mode
./node_modules/.bin/quasar dev -m electron
