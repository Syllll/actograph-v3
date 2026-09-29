#!/usr/bin/env bash
# Build a signed iOS archive and export an IPA for App Store Connect.
# Requires IOS_TEAM_ID, IOS_PROVISIONING_PROFILE_NAME and signing assets in
# the macOS keychain / provisioning profiles directory.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mobile_dir="$repo_root/mobile"
ios_dir="$mobile_dir/src-capacitor/ios"
ios_bundle_id="com.symalgo-tech.actograph"
archive_path="$ios_dir/App/build/ActoGraph.xcarchive"
export_dir="$ios_dir/App/output"
export_options="$ios_dir/App/build/ExportOptions.plist"

if [ "$(uname)" != Darwin ]; then
    echo "iOS builds require macOS and Xcode" >&2
    exit 1
fi
for command_name in xcodebuild pod yarn node; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
        echo "Missing command: $command_name" >&2
        exit 1
    fi
done
: "${IOS_TEAM_ID:?IOS_TEAM_ID is required}"
: "${IOS_PROVISIONING_PROFILE_NAME:?IOS_PROVISIONING_PROFILE_NAME is required}"

version="$(cd "$mobile_dir" && node -p "require('./package.json').version")"
if [[ ! "$version" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    echo "Invalid mobile version: $version" >&2
    exit 1
fi
if [ "$((10#${BASH_REMATCH[2]}))" -ge 100 ] || [ "$((10#${BASH_REMATCH[3]}))" -ge 100 ]; then
    echo "Mobile minor and patch versions must stay below 100; bump the next component instead" >&2
    exit 1
fi
build_number="$((10#${BASH_REMATCH[1]} * 10000 + 10#${BASH_REMATCH[2]} * 100 + 10#${BASH_REMATCH[3]}))"
if [ "$build_number" -le 0 ]; then
    echo "iOS build number must be positive" >&2
    exit 1
fi

for package_dir in packages/core packages/graph; do
    (cd "$repo_root/$package_dir" && yarn install --frozen-lockfile && yarn build)
done
(cd "$mobile_dir" && yarn install --frozen-lockfile)
(cd "$mobile_dir/src-capacitor" && yarn install --frozen-lockfile)
(cd "$mobile_dir" && ./node_modules/.bin/quasar build -m capacitor -T ios --skip-pkg)
(cd "$ios_dir/App" && pod install)

mkdir -p "$(dirname "$export_options")" "$export_dir"
cat > "$export_options" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>export</string>
  <key>signingStyle</key><string>manual</string>
  <key>teamID</key><string></string>
  <key>provisioningProfiles</key><dict>
    <key>${ios_bundle_id}</key><string></string>
  </dict>
</dict></plist>
PLIST
/usr/libexec/PlistBuddy -c "Set :teamID $IOS_TEAM_ID" "$export_options"
/usr/libexec/PlistBuddy -c "Set :provisioningProfiles:$ios_bundle_id $IOS_PROVISIONING_PROFILE_NAME" "$export_options"

xcodebuild archive \
    -workspace "$ios_dir/App/App.xcworkspace" \
    -scheme App -configuration Release -destination 'generic/platform=iOS' \
    -archivePath "$archive_path" \
    DEVELOPMENT_TEAM="$IOS_TEAM_ID" \
    CODE_SIGN_STYLE=Manual \
    PROVISIONING_PROFILE_SPECIFIER="$IOS_PROVISIONING_PROFILE_NAME" \
    CODE_SIGN_IDENTITY='Apple Distribution' \
    MARKETING_VERSION="$version" CURRENT_PROJECT_VERSION="$build_number"

shopt -s nullglob
app_plists=("$archive_path"/Products/Applications/*.app/Info.plist)
if [ "${#app_plists[@]}" -ne 1 ]; then
    echo "Expected exactly one archived iOS app, found ${#app_plists[@]}" >&2
    exit 1
fi
archived_bundle_id="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "${app_plists[0]}")"
if [ "$archived_bundle_id" != "$ios_bundle_id" ]; then
    echo "Archived iOS bundle ID $archived_bundle_id does not match App Store app $ios_bundle_id" >&2
    exit 1
fi

xcodebuild -exportArchive \
    -archivePath "$archive_path" \
    -exportPath "$export_dir" \
    -exportOptionsPlist "$export_options"

ipas=("$export_dir"/*.ipa)
if [ "${#ipas[@]}" -ne 1 ]; then
    echo "Expected exactly one IPA in $export_dir, found ${#ipas[@]}" >&2
    exit 1
fi
cp "${ipas[0]}" "$mobile_dir/actograph-mobile-release.ipa"
echo "iOS IPA: $mobile_dir/actograph-mobile-release.ipa"
