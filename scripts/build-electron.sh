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

cd "$scriptFolderPath"

# Clean and prepare API
cd ../api
rm -rf ./node_modules
rm -rf ./dist

# Build the electron app
cd ../front
rm -rf ./node_modules
rm -rf ./quasar
yarn install

# Build with electron mode
# Support for architecture-specific builds:
# - ELECTRON_BUILDER_ARCH: Set to "x64" or "arm64" (preferred method)
# - ELECTRON_ARCH_FLAGS: Legacy support for "--x64" or "--arm64" flags
if [ -n "$ELECTRON_BUILDER_ARCH" ]; then
  echo "Using ELECTRON_BUILDER_ARCH=$ELECTRON_BUILDER_ARCH"
  # Set environment variable for Electron Builder
  export ELECTRON_BUILDER_ARCH=$ELECTRON_BUILDER_ARCH
  ./node_modules/.bin/quasar build -m electron --publish never
elif [ -n "$ELECTRON_ARCH_FLAGS" ]; then
  echo "Using ELECTRON_ARCH_FLAGS=$ELECTRON_ARCH_FLAGS"
  # Pass flags directly to Quasar CLI (which forwards to Electron Builder)
  ./node_modules/.bin/quasar build -m electron --publish never -- $ELECTRON_ARCH_FLAGS
else
  echo "Building for default architecture(s)"
  ./node_modules/.bin/quasar build -m electron --publish never
fi

# List the content of the dist folder
ls -la dist/electron
ls -la dist/electron/Packaged

#cd ../api;
#rm -rf ./node_modules;
#rm -rf ./dist;
#cd ../front;
#rm -rf ./node_modules;
#rm -rf ./quasar;


