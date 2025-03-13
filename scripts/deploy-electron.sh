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

cd $scriptFolderPath;

cd ../api;
rm -rf ./node_modules;
rm -rf ./dist;

# build the electron app
cd ../front;
rm -rf ./node_modules;
rm -rf ./quasar;
yarn install;

./node_modules/.bin/quasar build -m electron --publish always;

cd ../api;
rm -rf ./node_modules;
rm -rf ./dist;
cd ../front;
rm -rf ./node_modules;
rm -rf ./quasar;
