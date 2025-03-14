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

# Check if the node_modules folder was created by the current user, if so remove it
if [ -d "$scriptFolderPath/front/node_modules" ]; then
    if [ "$(stat -c '%U' "$scriptFolderPath/front/node_modules")" == "$(whoami)" ]; then
        rm -rf "$scriptFolderPath/front/node_modules"
    fi
fi

# Check if the api node_modules folder was created by the current user, if so remove it
if [ -d "$scriptFolderPath/api/node_modules" ]; then
    if [ "$(stat -c '%U' "$scriptFolderPath/api/node_modules")" == "$(whoami)" ]; then
        rm -rf "$scriptFolderPath/api/node_modules"
    fi
fi

# Start the api and front docker containers
cd "${scriptFolderPath}/.."
sh compose.sh up -d

