#!/bin/bash

# Verify both requirements for Android devices using 16 KB memory pages:
# - the AAB requests 16 KB ZIP alignment;
# - every LOAD segment in every bundled native library is aligned to >= 16 KB.

set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "Usage: bash scripts/verify-android-16k.sh path/to/app.aab" >&2
    exit 1
fi

scriptFolderPath="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repoRoot="$(cd "$scriptFolderPath/.." && pwd)"
androidProject="$repoRoot/mobile/src-capacitor/android"
bundlePath="$(realpath "$1")"

if [ ! -f "$bundlePath" ]; then
    echo "AAB not found: $bundlePath" >&2
    exit 1
fi

if ! command -v readelf >/dev/null 2>&1; then
    echo "readelf is required to verify native ELF alignment" >&2
    exit 1
fi

echo "Checking AAB ZIP alignment..."
bundleConfig="$("$androidProject/gradlew" -p "$androidProject" --quiet dumpBundleConfig -PbundlePath="$bundlePath")"
echo "$bundleConfig" | grep 'PAGE_ALIGNMENT' || true
if ! grep -q 'PAGE_ALIGNMENT_16K' <<< "$bundleConfig"; then
    echo "AAB does not request PAGE_ALIGNMENT_16K" >&2
    exit 1
fi

verificationFolder="$(mktemp -d)"
trap 'rm -rf "$verificationFolder"' EXIT
unzip -q "$bundlePath" 'base/lib/*/*.so' -d "$verificationFolder"

mapfile -t nativeLibraries < <(find "$verificationFolder/base/lib" -type f -name '*.so' | sort)
if [ "${#nativeLibraries[@]}" -eq 0 ]; then
    echo "No native libraries found in the AAB" >&2
    exit 1
fi

echo "Checking ELF LOAD segment alignment..."
for nativeLibrary in "${nativeLibraries[@]}"; do
    relativePath="${nativeLibrary#"$verificationFolder/"}"
    mapfile -t loadAlignments < <(readelf -lW "$nativeLibrary" | awk '$1 == "LOAD" { print $NF }')
    if [ "${#loadAlignments[@]}" -eq 0 ]; then
        echo "$relativePath: no ELF LOAD segments found" >&2
        exit 1
    fi

    for alignment in "${loadAlignments[@]}"; do
        if (( alignment < 0x4000 )); then
            echo "$relativePath: incompatible LOAD alignment $alignment (minimum 0x4000)" >&2
            exit 1
        fi
    done
    echo "$relativePath: OK (${loadAlignments[*]})"
done

echo "AAB is compatible with 16 KB memory page sizes."
