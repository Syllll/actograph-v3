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

# Is yarn installed ? If not, inform the user
if ! command -v yarn &> /dev/null; then
    echo "Yarn could not be found. Please install it on the system."
    exit 1
fi

# Is node version available, if not inform the user
if ! command -v node &> /dev/null; then
    echo "Node version 20 could not be found. Please install it on the system."
    exit 1
fi

# Check if the node version has 20 as major version
if [ "$(node -v | cut -d '.' -f 1 | cut -d 'v' -f 2)" != "20" ]; then
    echo "Node version 20 could not be found. Please install it on the system."
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
api_command="cd $scriptFolderPath/../api && yarn migration:run && yarn start:dev-electron"

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







