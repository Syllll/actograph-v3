#!/bin/bash

# Publish a release tag and let CI build the selected targets.
#
# bash scripts/publish.sh prod
# bash scripts/publish.sh prod desktop
# bash scripts/publish.sh prod patch
# bash scripts/publish.sh prod mobile
# bash scripts/publish.sh prod desktop-mobile minor
# bash scripts/publish.sh preprod desktop
#
# `prod` alone is the same as `prod desktop`.
# A tag without a target suffix (prod-vX.Y.Z) builds desktop only.
# Add -mobile or -desktop-mobile to also build Android.

if [ -z "$BASH_VERSION" ]; then
    echo "This script must be run with bash, not sh"
    exit 1
fi

set -e

if [ -z "$1" ]; then
    echo "No channel provided. Example: bash scripts/publish.sh prod"
    exit 1
fi

deployType="$1"
if [ "$deployType" != "prod" ] && [ "$deployType" != "preprod" ]; then
    echo "Invalid channel: $deployType (expected prod or preprod)"
    exit 1
fi

target="desktop"
versionType="patch"

if [ -n "${2:-}" ]; then
    case "$2" in
        desktop|mobile|desktop-mobile)
            target="$2"
            ;;
        major|minor|patch)
            target="desktop"
            versionType="$2"
            ;;
        *)
            echo "Invalid argument: $2"
            echo "Expected a target (desktop, mobile, desktop-mobile) or an increment (major, minor, patch)"
            exit 1
            ;;
    esac
fi

if [ -n "${3:-}" ]; then
    if [ "$2" = "major" ] || [ "$2" = "minor" ] || [ "$2" = "patch" ]; then
        echo "Unexpected extra argument: $3"
        exit 1
    fi
    versionType="$3"
    if [ "$versionType" != "major" ] && [ "$versionType" != "minor" ] && [ "$versionType" != "patch" ]; then
        echo "Invalid version type, must be major, minor or patch"
        exit 1
    fi
fi

if [ -n "${4:-}" ]; then
    echo "Unexpected extra argument: $4"
    exit 1
fi

echo "Deploy type: $deployType"
echo "Target: $target"
echo "Version type: $versionType"

scriptFolderPath="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
repoRoot="$( cd "$scriptFolderPath/.." && pwd )"

# shellcheck source=release-tag.sh
source "$scriptFolderPath/release-tag.sh"

read_version() {
    jq -r '.version' "$1"
}

frontVersion=$(read_version "$repoRoot/front/package.json")
apiVersion=$(read_version "$repoRoot/api/package.json")
mobileVersion=$(read_version "$repoRoot/mobile/package.json")
mobileCapacitorVersion=$(read_version "$repoRoot/mobile/src-capacitor/package.json")

echo "Front version: $frontVersion"
echo "API version: $apiVersion"
echo "Mobile version: $mobileVersion"

bump_version() {
    local current="$1"
    local major minor patch
    major=$(echo "$current" | cut -d. -f1)
    minor=$(echo "$current" | cut -d. -f2)
    patch=$(echo "$current" | cut -d. -f3)
    if [ "$versionType" = "major" ]; then
        echo "$((10#$major + 1)).0.0"
    elif [ "$versionType" = "minor" ]; then
        echo "$((10#$major)).$((10#$minor + 1)).0"
    else
        echo "$((10#$major)).$((10#$minor)).$((10#$patch + 1))"
    fi
}

version_is_newer() {
    local latest="$1"
    local current="$2"
    local latestMajor latestMinor latestPatch currentMajor currentMinor currentPatch
    currentMajor=$(echo "$current" | cut -d. -f1)
    currentMinor=$(echo "$current" | cut -d. -f2)
    currentPatch=$(echo "$current" | cut -d. -f3)
    latestMajor=$(echo "$latest" | cut -d. -f1)
    latestMinor=$(echo "$latest" | cut -d. -f2)
    latestPatch=$(echo "$latest" | cut -d. -f3)

    if [ "$((10#$latestMajor))" -gt "$((10#$currentMajor))" ]; then
        return 0
    fi
    if [ "$((10#$latestMajor))" -eq "$((10#$currentMajor))" ] && [ "$((10#$latestMinor))" -gt "$((10#$currentMinor))" ]; then
        return 0
    fi
    if [ "$((10#$latestMajor))" -eq "$((10#$currentMajor))" ] && [ "$((10#$latestMinor))" -eq "$((10#$currentMinor))" ] && [ "$((10#$latestPatch))" -gt "$((10#$currentPatch))" ]; then
        return 0
    fi
    return 1
}

files_to_bump=()
currentVersion=""

case "$target" in
    desktop)
        if [ "$frontVersion" != "$apiVersion" ]; then
            echo "Front and API versions are not the same, you need to deal with this manually"
            exit 1
        fi
        currentVersion="$frontVersion"
        files_to_bump=(
            "$repoRoot/front/package.json"
            "$repoRoot/api/package.json"
        )
        ;;
    mobile)
        if [ "$mobileVersion" != "$mobileCapacitorVersion" ]; then
            echo "mobile/package.json and mobile/src-capacitor/package.json versions differ"
            exit 1
        fi
        currentVersion="$mobileVersion"
        files_to_bump=(
            "$repoRoot/mobile/package.json"
            "$repoRoot/mobile/src-capacitor/package.json"
        )
        ;;
    desktop-mobile)
        if [ "$frontVersion" != "$apiVersion" ] || [ "$frontVersion" != "$mobileVersion" ] || [ "$frontVersion" != "$mobileCapacitorVersion" ]; then
            echo "Front, API and mobile versions must already match before a desktop-mobile release"
            echo "Front=$frontVersion API=$apiVersion Mobile=$mobileVersion Capacitor=$mobileCapacitorVersion"
            exit 1
        fi
        currentVersion="$frontVersion"
        files_to_bump=(
            "$repoRoot/front/package.json"
            "$repoRoot/api/package.json"
            "$repoRoot/mobile/package.json"
            "$repoRoot/mobile/src-capacitor/package.json"
        )
        ;;
esac

check_targets=()
if [ "$target" = "desktop" ] || [ "$target" = "desktop-mobile" ]; then
    check_targets+=(desktop)
fi
if [ "$target" = "mobile" ] || [ "$target" = "desktop-mobile" ]; then
    check_targets+=(mobile)
fi

echo "Fetching tags..."
git fetch origin --tags

latestVersion=""
while IFS= read -r tag; do
    [ -z "$tag" ] && continue
    parse_release_tag "$tag" 2>/dev/null || continue
    included=false
    for check_target in "${check_targets[@]}"; do
        if [ "$check_target" = "desktop" ] && [ "$RELEASE_DESKTOP" = true ]; then
            included=true
            break
        fi
        if [ "$check_target" = "mobile" ] && [ "$RELEASE_MOBILE" = true ]; then
            included=true
            break
        fi
    done
    if [ "$included" != true ]; then
        continue
    fi
    if [ -z "$latestVersion" ] || version_is_newer "$RELEASE_VERSION" "$latestVersion"; then
        latestVersion="$RELEASE_VERSION"
    fi
done < <(git tag -l "${deployType}-v*")

if [ -n "$latestVersion" ] && version_is_newer "$latestVersion" "$currentVersion"; then
    echo "Warning: Latest $deployType tag version ($latestVersion) is newer than current version ($currentVersion)"
    echo "This might indicate that you're trying to publish an older version"
    read -p "Do you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

newVersion=$(bump_version "$currentVersion")
echo "New version: $newVersion"

if [ "$target" = "desktop" ]; then
    tagSuffix=""
else
    tagSuffix="-$target"
fi

releaseTag="${deployType}-v${newVersion}${tagSuffix}"

if git rev-parse -q --verify "refs/tags/$releaseTag" >/dev/null; then
    echo "Tag $releaseTag already exists"
    exit 1
fi

for file in "${files_to_bump[@]}"; do
    tmpFile="$(mktemp)"
    jq --arg version "$newVersion" '.version = $version' "$file" > "$tmpFile"
    mv "$tmpFile" "$file"
    git add "$file"
done

git commit -m "Bump version to $newVersion" -- "${files_to_bump[@]}"
git push
git tag "$releaseTag"
git push origin "$releaseTag"

echo "All done, the CI will now run on GitHub for $releaseTag"
