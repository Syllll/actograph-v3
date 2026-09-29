#!/bin/bash

# Parse a release tag: {prod|preprod}-vX.Y.Z[-desktop|-mobile|-android|-ios|-desktop-mobile]
#
# A tag without a target suffix means desktop only.
#   prod-v0.0.1                 -> desktop
#   prod-v0.0.1-desktop         -> desktop
#   prod-v0.0.1-mobile          -> Android and iOS
#   prod-v0.0.1-android         -> Android only
#   prod-v0.0.1-ios             -> iOS only
#   preprod-v0.0.1-desktop-mobile -> desktop, Android and iOS
#
# Usage:
#   bash scripts/release-tag.sh parse prod-v0.0.1
# Prints KEY=value lines: CANAL, VERSION, DESKTOP, MOBILE, ANDROID, IOS, TARGETS

parse_release_tag() {
    local tag="$1"
    local canal version suffix

    if [[ ! "$tag" =~ ^(prod|preprod)-v([0-9]+)\.([0-9]+)\.([0-9]+)(-(desktop-mobile|desktop|mobile|android|ios))?$ ]]; then
        echo "Invalid release tag: $tag" >&2
        echo "Expected {prod|preprod}-vX.Y.Z[-desktop|-mobile|-android|-ios|-desktop-mobile]" >&2
        return 1
    fi

    canal="${BASH_REMATCH[1]}"
    version="${BASH_REMATCH[2]}.${BASH_REMATCH[3]}.${BASH_REMATCH[4]}"
    suffix="${BASH_REMATCH[6]}"

    RELEASE_CANAL="$canal"
    RELEASE_VERSION="$version"
    RELEASE_DESKTOP=false
    RELEASE_MOBILE=false
    RELEASE_ANDROID=false
    RELEASE_IOS=false

    case "$suffix" in
        ""|desktop)
            RELEASE_DESKTOP=true
            RELEASE_TARGETS="desktop"
            ;;
        mobile)
            RELEASE_MOBILE=true
            RELEASE_ANDROID=true
            RELEASE_IOS=true
            RELEASE_TARGETS="mobile"
            ;;
        android)
            RELEASE_MOBILE=true
            RELEASE_ANDROID=true
            RELEASE_TARGETS="android"
            ;;
        ios)
            RELEASE_MOBILE=true
            RELEASE_IOS=true
            RELEASE_TARGETS="ios"
            ;;
        desktop-mobile)
            RELEASE_DESKTOP=true
            RELEASE_MOBILE=true
            RELEASE_ANDROID=true
            RELEASE_IOS=true
            RELEASE_TARGETS="desktop-mobile"
            ;;
        *)
            echo "Invalid release target in tag: $tag" >&2
            return 1
            ;;
    esac
}

# Return 0 when the tag ships the given target (desktop, mobile, android or ios).
tag_includes_target() {
    local tag="$1"
    local target="$2"

    parse_release_tag "$tag" || return 1

    if [ "$target" = "desktop" ] && [ "$RELEASE_DESKTOP" = true ]; then
        return 0
    fi
    if [ "$target" = "mobile" ] && [ "$RELEASE_MOBILE" = true ]; then
        return 0
    fi
    if [ "$target" = "android" ] && [ "$RELEASE_ANDROID" = true ]; then
        return 0
    fi
    if [ "$target" = "ios" ] && [ "$RELEASE_IOS" = true ]; then
        return 0
    fi
    return 1
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    if [ -z "$BASH_VERSION" ]; then
        echo "This script must be run with bash, not sh" >&2
        exit 1
    fi

    case "${1:-}" in
        parse)
            if [ -z "${2:-}" ]; then
                echo "Usage: bash scripts/release-tag.sh parse TAG" >&2
                exit 1
            fi
            parse_release_tag "$2" || exit 1
            echo "CANAL=$RELEASE_CANAL"
            echo "VERSION=$RELEASE_VERSION"
            echo "DESKTOP=$RELEASE_DESKTOP"
            echo "MOBILE=$RELEASE_MOBILE"
            echo "ANDROID=$RELEASE_ANDROID"
            echo "IOS=$RELEASE_IOS"
            echo "TARGETS=$RELEASE_TARGETS"
            ;;
        *)
            echo "Usage: bash scripts/release-tag.sh parse TAG" >&2
            exit 1
            ;;
    esac
fi
