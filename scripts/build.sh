#!/bin/bash

# Ensure script is run with bash
if [ -z "$BASH_VERSION" ]; then
    echo "This script must be run with bash, not sh"
    exit 1
fi

# Exit on error in subscript
set -e

# Current script folder path
scriptFolderPath=$( dirname -- "$( readlink -f -- "$0"; )"; )

