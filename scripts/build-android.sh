#!/bin/bash

# Build Android APK/AAB without opening Android Studio
#
# Use examples:
# bash scripts/build-android.sh                  # Build debug APK
# bash scripts/build-android.sh release           # Build signed release APK
# bash scripts/build-android.sh release --aab     # Build signed AAB (Play Store)
# bash scripts/build-android.sh debug -i          # Build debug APK and install on device
#
# Prerequisites:
# - ANDROID_HOME or ANDROID_SDK_ROOT set in ~/.bashrc
# - Java 17+
# - For release: keystore.properties configured (see keystore.properties.example)

# Ensure script is run with bash
if [ -z "$BASH_VERSION" ]; then
    echo "This script must be run with bash, not sh"
    exit 1
fi

# Exit on error
set -e

# Get script directory in a cross-platform way
scriptFolderPath="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

source "$scriptFolderPath/colors.sh"

# ==========================================
# Parse arguments
# ==========================================
BUILD_TYPE="debug"
BUILD_AAB=false
INSTALL_ON_DEVICE=false

for arg in "$@"; do
    case "$arg" in
        release)
            BUILD_TYPE="release"
            ;;
        debug)
            BUILD_TYPE="debug"
            ;;
        --aab)
            BUILD_AAB=true
            ;;
        -i|--install)
            INSTALL_ON_DEVICE=true
            ;;
        -h|--help)
            echo "Usage: bash scripts/build-android.sh [debug|release] [--aab] [-i|--install]"
            echo ""
            echo "Arguments:"
            echo "  debug       Build a debug APK (default)"
            echo "  release     Build a signed release APK"
            echo "  --aab       Build an AAB instead of APK (for Play Store upload)"
            echo "  -i          Install APK on connected device/emulator after build"
            echo ""
            echo "Examples:"
            echo "  bash scripts/build-android.sh                   # Debug APK"
            echo "  bash scripts/build-android.sh release            # Signed release APK"
            echo "  bash scripts/build-android.sh release --aab      # Signed AAB (Play Store)"
            echo "  bash scripts/build-android.sh debug -i           # Debug APK + install"
            echo ""
            echo "Release signing setup:"
            echo "  1. Generate a keystore:"
            echo "       keytool -genkey -v -keystore mobile/src-capacitor/android/app/actograph-release.jks \\"
            echo "         -alias actograph -keyalg RSA -keysize 2048 -validity 10000"
            echo "  2. Copy and fill the config:"
            echo "       cd mobile/src-capacitor/android"
            echo "       cp keystore.properties.example keystore.properties"
            echo "       # Edit keystore.properties with your passwords"
            exit 0
            ;;
        *)
            echo "Unknown argument: $arg"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

MOBILE_DIR="$scriptFolderPath/../mobile"
ANDROID_DIR="$MOBILE_DIR/src-capacitor/android"

# Determine output format label
if [ "$BUILD_AAB" = true ]; then
    FORMAT_LABEL="AAB"
else
    FORMAT_LABEL="APK"
fi

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE} ActoGraph Mobile - Android Build${NC}"
echo -e "${BLUE} Type: $BUILD_TYPE | Format: $FORMAT_LABEL${NC}"
echo -e "${BLUE}==========================================${NC}"

# ==========================================
# 0. Check prerequisites
# ==========================================
if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
    echo "Error: ANDROID_HOME or ANDROID_SDK_ROOT must be set"
    echo "Add to your ~/.bashrc:"
    echo '  export ANDROID_HOME="$HOME/Android/Sdk"'
    echo '  export ANDROID_SDK_ROOT="$ANDROID_HOME"'
    exit 1
fi

if ! command -v java &> /dev/null; then
    echo "Error: Java is not installed or not in PATH"
    echo "Install JDK 17+: sudo apt install openjdk-17-jdk"
    exit 1
fi

# Check signing config for release builds
if [ "$BUILD_TYPE" = "release" ]; then
    KEYSTORE_PROPS="$ANDROID_DIR/keystore.properties"
    if [ ! -f "$KEYSTORE_PROPS" ]; then
        echo ""
        echo -e "Error: keystore.properties not found for release build"
        echo ""
        echo "To set up release signing:"
        echo "  1. Generate a keystore (one-time):"
        echo "       keytool -genkey -v -keystore $ANDROID_DIR/app/actograph-release.jks \\"
        echo "         -alias actograph -keyalg RSA -keysize 2048 -validity 10000"
        echo ""
        echo "  2. Create the config file:"
        echo "       cp $ANDROID_DIR/keystore.properties.example $KEYSTORE_PROPS"
        echo "       # Then edit $KEYSTORE_PROPS with your passwords"
        exit 1
    fi

    # Validate that the keystore file referenced in properties exists
    STORE_FILE=$(grep -E '^storeFile=' "$KEYSTORE_PROPS" | cut -d'=' -f2)
    if [ -n "$STORE_FILE" ]; then
        # Resolve relative to android/ directory
        if [[ "$STORE_FILE" != /* ]]; then
            STORE_FILE_FULL="$ANDROID_DIR/app/$STORE_FILE"
        else
            STORE_FILE_FULL="$STORE_FILE"
        fi
        if [ ! -f "$STORE_FILE_FULL" ]; then
            echo "Error: Keystore file not found at $STORE_FILE_FULL"
            echo "Check the storeFile path in $KEYSTORE_PROPS"
            exit 1
        fi
    fi

    echo "Release signing: keystore.properties found"
fi

# ==========================================
# 1. Build shared packages (dependencies)
# ==========================================
echo ""
echo -e "${GREEN}[1/4] Building shared packages...${NC}"

cd "$scriptFolderPath/../packages/core"
if [ -d "./node_modules" ] && [ -n "$(ls -A ./node_modules 2>/dev/null)" ]; then
    echo "Using cached node_modules for packages/core"
else
    echo "Installing dependencies for packages/core"
    yarn install
fi
yarn build
echo "packages/core built successfully"

cd "$scriptFolderPath/../packages/graph"
if [ -d "./node_modules" ] && [ -n "$(ls -A ./node_modules 2>/dev/null)" ]; then
    echo "Using cached node_modules for packages/graph"
else
    echo "Installing dependencies for packages/graph"
    yarn install
fi
yarn build
echo "packages/graph built successfully"

# ==========================================
# 2. Install mobile dependencies
# ==========================================
echo ""
echo -e "${GREEN}[2/4] Preparing mobile app...${NC}"

cd "$MOBILE_DIR"
if [ -d "./node_modules" ] && [ -n "$(ls -A ./node_modules 2>/dev/null)" ]; then
    echo "Using cached node_modules for mobile"
else
    echo "Installing dependencies for mobile"
    yarn install
fi

# ==========================================
# 3. Quasar build + Capacitor sync (skip opening Android Studio)
# ==========================================
echo ""
echo -e "${GREEN}[3/4] Building Quasar app + Capacitor sync...${NC}"

cd "$MOBILE_DIR"
./node_modules/.bin/quasar build -m capacitor -T android --skip-pkg

# ==========================================
# 4. Gradle build
# ==========================================
echo ""
echo -e "${GREEN}[4/4] Building $FORMAT_LABEL with Gradle ($BUILD_TYPE)...${NC}"

cd "$ANDROID_DIR"

if [ "$BUILD_TYPE" = "release" ]; then
    if [ "$BUILD_AAB" = true ]; then
        ./gradlew bundleRelease
        AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
    else
        ./gradlew assembleRelease
        APK_PATH="app/build/outputs/apk/release/app-release.apk"
    fi
else
    if [ "$BUILD_AAB" = true ]; then
        echo "Warning: AAB is typically only used for release builds, building debug AAB anyway..."
        ./gradlew bundleDebug
        AAB_PATH="app/build/outputs/bundle/debug/app-debug.aab"
    else
        ./gradlew assembleDebug
        APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    fi
fi

# ==========================================
# Result
# ==========================================
echo ""

if [ "$BUILD_AAB" = true ]; then
    OUTPUT_PATH="$AAB_PATH"
    OUTPUT_NAME="actograph-mobile-${BUILD_TYPE}.aab"
else
    OUTPUT_PATH="$APK_PATH"
    OUTPUT_NAME="actograph-mobile-${BUILD_TYPE}.apk"
fi

if [ ! -f "$OUTPUT_PATH" ]; then
    echo "Error: Build output not found at $ANDROID_DIR/$OUTPUT_PATH"
    exit 1
fi

OUTPUT_SIZE=$(du -h "$OUTPUT_PATH" | cut -f1)

# Copy to mobile/ root for easy access
cp "$OUTPUT_PATH" "$MOBILE_DIR/$OUTPUT_NAME"

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN} Build complete!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo "$FORMAT_LABEL: mobile/$OUTPUT_NAME ($OUTPUT_SIZE)"

if [ "$BUILD_TYPE" = "release" ]; then
    if [ "$BUILD_AAB" = true ]; then
        echo ""
        echo "This AAB is ready to upload to Google Play Console."
    else
        echo ""
        echo "This APK is signed and ready to distribute."
        echo "For Play Store, use --aab to generate an Android App Bundle instead."
    fi
fi

# ==========================================
# Optional: Install on device
# ==========================================
if [ "$INSTALL_ON_DEVICE" = true ]; then
    if [ "$BUILD_AAB" = true ]; then
        echo ""
        echo "Warning: AAB files cannot be installed directly on a device."
        echo "Use 'bundletool' to generate APKs from an AAB, or build without --aab."
    else
        echo ""
        echo -e "${BLUE}Installing on connected device...${NC}"

        if ! command -v adb &> /dev/null; then
            echo "Error: adb not found in PATH"
            echo "Make sure ANDROID_HOME/platform-tools is in your PATH"
            exit 1
        fi

        adb install -r "$MOBILE_DIR/$OUTPUT_NAME"
        echo -e "${GREEN}Installed successfully!${NC}"
    fi
fi
