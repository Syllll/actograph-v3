#!/bin/sh

# Exit on error in subscript
set -e

# Current script folder path
currentFolderPath=$( dirname -- "$( readlink -f -- "$0"; )"; )
# Go into the current script folder
cd $currentFolderPath

# Env setup
envFiles="--env-file ./../.env"

# Default arg1 value
args="up -d"
# Give arg1 the value of the first argument if any
if [ -z "$1" ]; then
  # No argument supplied: up is assumed
  :
else
  # Put all the args in a string: sh compose.sh arg1 arg2 -> args="arg1 arg2"
  args="$*"
fi

# To avoid warning
export DOCKER_DEV=""

# -------------------------------------------------------
# Special case: If the first argument is "console" we open a console
# -------------------------------------------------------
if [ "$args" = "console" ]; then
  # Cannot use console in production mode
  if [ "$COMPOSE_MODE" = "production" ]; then
    # Inform the user
    echo "ERROR: You can't use \"compose.sh console\" in production mode"
    # Exit with error
    exit 1
  fi

  # Set the environment variable to true
  # This is used in the docker-compose.dev.yml file
  # to determine if the container is running in development mode
  export DOCKER_DEV=true

  # Determine which compose file to use based on the second argument
  composeFile="./docker-compose.dev.yml"
  containerName="glutamat-front-dev"
  
  if [ "$2" = "electron" ]; then
    composeFile="./docker-compose.electron.yml"
    containerName="actograph-v3-front-electron"
  fi

  # Start the containers in detached mode, taking into account the DOCKER_DEV environment variable
  docker compose ${envFiles} -f $composeFile up -d

  # Execute the bash command in the container to open a console
  docker compose ${envFiles} -f $composeFile exec $containerName bash || true

  # When the terminal is closed, stop the containers
  docker compose ${envFiles} -f $composeFile down

# -------------------------------------------------------
# Special case: If the first argument is "electron" we use the electron compose file
# -------------------------------------------------------
elif [ "$args" = "electron" ] || [[ "$args" == electron* ]]; then
  # Remove "electron" from the arguments
  electronArgs=$(echo "$args" | sed 's/^electron//')
  # If electronArgs is empty, set it to "up -d"
  if [ -z "$electronArgs" ]; then
    electronArgs="up -d"
  fi
  
  # Run docker compose with the electron compose file
  docker compose ${envFiles} -f ./docker-compose.electron.yml $electronArgs

# -------------------------------------------------------
# Normal case: We put the arguments behind the docker compose command
# -------------------------------------------------------
else
  composeYmlFile="./docker-compose.dev.yml"
  if [ "$COMPOSE_MODE" = "production" ]; then
    composeYmlFile="./docker-compose.yml"
  fi

  # Run docker compose including two .env files
  docker compose ${envFiles} -f $composeYmlFile $args
fi
