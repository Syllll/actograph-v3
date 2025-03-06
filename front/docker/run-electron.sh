#!/bin/bash

# Exit on error
set -e

# Current script folder path
currentFolderPath=$( dirname -- "$( readlink -f -- "$0"; )"; )
# Go into the current script folder
cd $currentFolderPath

# Allow X server connections from any host
xhost +local:docker || echo "Failed to set xhost permissions. Make sure X11 is running."

# Set the DISPLAY environment variable if not already set
if [ -z "$DISPLAY" ]; then
  export DISPLAY=:0
fi

# Set the XAUTHORITY environment variable if not already set
if [ -z "$XAUTHORITY" ]; then
  export XAUTHORITY=~/.Xauthority
fi

# Run the compose script with electron argument
sh ./compose.sh electron "$@"

# Restrict X server connections again when done
#xhost -local:docker 