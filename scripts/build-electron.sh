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

# ==========================================
# 1. Build packages/core first (dependency of API)
# ==========================================
echo "=========================================="
echo "Building packages/core..."
echo "=========================================="
cd ../packages/core
if [ -d "./node_modules" ] && [ -n "$(ls -A ./node_modules 2>/dev/null)" ]; then
  echo "Using cached node_modules for packages/core"
else
  echo "Installing dependencies for packages/core"
  yarn install
fi
yarn build
echo "packages/core built successfully"

# ==========================================
# 2. Clean and prepare API (only dist, keep node_modules if cached)
# ==========================================
echo "=========================================="
echo "Preparing API..."
echo "=========================================="
cd ../../api
rm -rf ./dist
# Only remove node_modules if not using cache (check if directory exists and has content)
if [ -d "./node_modules" ] && [ -n "$(ls -A ./node_modules 2>/dev/null)" ]; then
  echo "Using cached node_modules for API"
else
  echo "No cached node_modules found for API, will install fresh"
  rm -rf ./node_modules
fi

# ==========================================
# 3. Build the electron app
# ==========================================
echo "=========================================="
echo "Building Electron app..."
echo "=========================================="
cd ../front
rm -rf ./quasar
# Only remove node_modules if not using cache
if [ -d "./node_modules" ] && [ -n "$(ls -A ./node_modules 2>/dev/null)" ]; then
  echo "Using cached node_modules for Frontend"
else
  echo "No cached node_modules found for Frontend, will install fresh"
  rm -rf ./node_modules
fi

# Install dependencies only if node_modules doesn't exist or is empty
# Skip Electron binary download during yarn install - electron-builder will handle it with cache
if [ ! -d "./node_modules" ] || [ -z "$(ls -A ./node_modules 2>/dev/null)" ]; then
  ELECTRON_SKIP_BINARY_DOWNLOAD=1 yarn install
else
  echo "Skipping yarn install, using cached node_modules"
fi

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
echo "=========================================="
echo "Build complete! Output:"
echo "=========================================="
ls -la dist/electron
ls -la dist/electron/Packaged
