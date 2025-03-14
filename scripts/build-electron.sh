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
./node_modules/.bin/quasar build -m electron --publish always

# List the content of the dist folder
ls -la dist/electron
ls -la dist/electron/Packaged

#cd ../api;
#rm -rf ./node_modules;
#rm -rf ./dist;
#cd ../front;
#rm -rf ./node_modules;
#rm -rf ./quasar;


