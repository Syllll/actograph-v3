#!/bin/bash

# Ensure script is run with bash
if [ -z "$BASH_VERSION" ]; then
    echo "This script must be run with bash, not sh"
    exit 1
fi

# Exit on error in subscript
set -e

# The first argument may be: 
# - prod
# If no argument is provided, error
if [ -z "$1" ]; then
    echo "No argument provided, for example prod"
    exit 1
fi
versionType="$1"

# Check if the first argument is prod, we only support prod for now
if [ "$versionType" != "prod" ]; then
    echo "Invalid argument, must be prod"
    exit 1
fi

# The second argument may be: 
# - major
# - minor
# - patch
# If no argument is provided, it is patch
if [ -z "$2" ]; then
    versionType="patch"
else
    versionType="$2"

    if [ "$versionType" != "major" ] && [ "$versionType" != "minor" ] && [ "$versionType" != "patch" ]; then
        echo "Invalid version type, must be major, minor or patch"
        exit 1
    fi
fi

# Print the version type
echo "Version type: $versionType"

# Get script directory in a cross-platform way
scriptFolderPath="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Get the version from the package.json of front and api
frontVersion=$(cat $scriptFolderPath/front/package.json | jq -r '.version')
apiVersion=$(cat $scriptFolderPath/api/package.json | jq -r '.version')

# Print the versions
echo "Front version: $frontVersion"
echo "API version: $apiVersion"

# If the version are not the same, exit
if [ "$frontVersion" != "$apiVersion" ]; then
    echo "Front and API versions are not the same, you need to deal with this manually"
    exit 1
fi

# If the version are the same, continue
echo "Front and API versions are the same, continuing..."

# Increment version
if [ "$versionType" == "major" ]; then
    frontVersion=$(echo $frontVersion | awk -F. '{print $1 + 1 "." $2 "." $3}')
elif [ "$versionType" == "minor" ]; then
    frontVersion=$(echo $frontVersion | awk -F. '{print $1 "." $2 + 1 "." $3}')
else
    frontVersion=$(echo $frontVersion | awk -F. '{print $1 "." $2 "." $3 + 1}')
fi

# Print the new version
echo "New version: $frontVersion"

# Update the version in the package.json of front and api
sed -i '' "s/\"version\": \"$frontVersion\"/\"version\": \"$frontVersion\"/g" $scriptFolderPath/front/package.json
sed -i '' "s/\"version\": \"$frontVersion\"/\"version\": \"$frontVersion\"/g" $scriptFolderPath/api/package.json

# Make a version commit and push it to the remote repository
git add $scriptFolderPath/front/package.json
git add $scriptFolderPath/api/package.json
git commit -m "Bump version to $frontVersion"
git push

# Create a new tag with format prod-vX.Y.Z
git tag prod-v$frontVersion

# Push the tag to the remote repository
git push origin ${versionType}-v$frontVersion

# All done
echo "All done, the CI will now run on GitHub"





