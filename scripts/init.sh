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
# Go into the current script folder
cd $scriptFolderPath

# Import the color variables
. ./colors.sh

parent_folder_name=$(sh ./utils/get-parent-folder-name.sh)

############# ############# ############# 
############# Default values ############
############# ############# ############# 

default_code_generator_frontend_port=18033
default_code_generator_backend_port=19033
default_backend_docker_app_port_exposed=3033
default_postgres_exposed_port=5633
default_frontend_docker_port_exposed=8033
default_color_mode=light
default_app_name=$parent_folder_name

# Welcome message
echo "Welcome to the Glutamat code generator setup script."

# Ask for app name
echo "Enter the app name (default $default_app_name):"
read app_name

# Ask for the backend port
echo "Enter the your app backend port (default $default_backend_docker_app_port_exposed):"
read backend_docker_app_port_exposed

# Ask for the PostgreSQL exposed port 
echo "Enter the PostgreSQL exposed port (default $default_postgres_exposed_port):"
read postgres_exposed_port

# Ask for the frontend port exposed
echo "Enter the frontend port exposed (default $default_frontend_docker_port_exposed):"
read frontend_docker_port_exposed

# Ask for default color mode (default light)
echo "Enter the default color mode (default $default_color_mode):"
read color_mode

# Set the default ports if the user didn't enter any
code_generator_frontend_port=${code_generator_frontend_port:-$default_code_generator_frontend_port}
code_generator_backend_port=${code_generator_backend_port:-$default_code_generator_backend_port}
backend_docker_app_port_exposed=${backend_docker_app_port_exposed:-$default_backend_docker_app_port_exposed}
postgres_exposed_port=${postgres_exposed_port:-$default_postgres_exposed_port}
frontend_docker_port_exposed=${frontend_docker_port_exposed:-$default_frontend_docker_port_exposed}
color_mode=${color_mode:-$default_color_mode}
app_name=${app_name:-$default_app_name}

####################################### 
# Generate passwords
####################################### 

# Generate a random password for the PostgreSQL database
# postgres_password=$(openssl rand -base64 32)

####################################### 
# Functions
####################################### 

# Detect the operating system to set the sed in-place edit option
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS requires an empty string argument with -i, passed as two separate parts
    SED_INPLACE_OPTION=(-i '')
else
    # Linux does not require an empty string argument
    SED_INPLACE_OPTION=(-i)
fi

# Define a function to use sed to replace text in files
replace() {
    local file=$1
    local key=$2
    local new_value=$3
    # Use sed with the proper in-place option and escaping potential forward slashes in the replacement text
    sed "${SED_INPLACE_OPTION[@]}" "s|^${key}=.*$|${key}=${new_value}|g" "$file"
}

#######################################
# Config step
#######################################
# - Create the .env files
# - Set the app name

# Go back to the root folder
cd $scriptFolderPath

# ---------------------
# /api/.env file
# ---------------------

# Path
api_path=$scriptFolderPath/../api

# Check if the .env file exists
if [ ! -f "$api_path/.env" ]; then
  initial_api_app_name="glutamat-api"
else
  # It exists, read the app name
  initial_api_app_name=$(sh $scriptFolderPath/utils/get-env-value-from-env-file.sh $api_path/.env APP_NAME)
fi
inital_api_project_name=$(bash $scriptFolderPath/utils/split-str-and-get-item.sh $initial_api_app_name "-api" 0)


# The new api app name
api_app_name=$app_name-api

# Go into the folder
cd $api_path

# Create the .env file
cp -p .env.example .env

# Replace the ports in the /api/.env file
replace ".env" "BACKEND_DOCKER_APP_PORT_EXPOSED" "$backend_docker_app_port_exposed"
replace ".env" "APP_NAME" "$api_app_name"
replace ".env" "API_URL" "http://localhost:$backend_docker_app_port_exposed"
replace ".env" "FRONTEND_URL" "http://localhost:$frontend_docker_port_exposed"
replace ".env" "BACKEND_DOCKER_PSQL_PORT_EXPOSED" "$postgres_exposed_port"
# For dev, we use -dev
replace ".env" "DB_HOST" "$api_app_name-dev-db"

# Replace the app name in the package.json file
sh $scriptFolderPath/utils/replace-str.sh $api_path/package.json "\"name\": \"$initial_api_app_name\"," "\"name\": \"$api_app_name\","

# Replace the compose project name in the compose files
sh $scriptFolderPath/utils/replace-str.sh $api_path/docker/docker-compose.yml "name: $inital_api_project_name" "name: $app_name"
sh $scriptFolderPath/utils/replace-str.sh $api_path/docker/docker-compose.dev.yml "name: $inital_api_project_name" "name: $app_name"

# Replace the app name in the compose files
sh $scriptFolderPath/utils/replace-str.sh $api_path/docker/docker-compose.yml $initial_api_app_name $api_app_name
sh $scriptFolderPath/utils/replace-str.sh $api_path/docker/docker-compose.dev.yml $initial_api_app_name $api_app_name

cd $scriptFolderPath

# ---------------------
# /front/.env file
# ---------------------

# Path
front_path=$scriptFolderPath/../front

# Check if the .env file exists
if [ ! -f "$front_path/.env" ]; then
  initial_front_app_name="glutamat-front"
else
  # It exists, read the app name
  initial_front_app_name=$(sh $scriptFolderPath/utils/get-env-value-from-env-file.sh $front_path/.env APP_NAME)
fi
inital_front_project_name=$(bash $scriptFolderPath/utils/split-str-and-get-item.sh $initial_front_app_name "-front" 0)

# The new front app name
front_app_name=$app_name-front

# Go into the folder
cd $front_path

# Create the .env file
cp -p .env.example .env

# Replace the ports in the /front/.env file
replace ".env" "FRONT_DOCKER_PORT_EXPOSED" "$frontend_docker_port_exposed"
replace ".env" "API_URL" "http://localhost:$backend_docker_app_port_exposed"
replace ".env" "APP_NAME" "$front_app_name"
replace ".env" "DEFAULT_COLOR_MODE" "$color_mode"

# Replace the app name in the package.json file
sh $scriptFolderPath/utils/replace-str.sh $front_path/package.json "\"name\": \"$initial_front_app_name\"," "\"name\": \"$front_app_name\","

# Replace the compose project name in the compose files
sh $scriptFolderPath/utils/replace-str.sh $front_path/docker/docker-compose.yml "name: $inital_front_project_name" "name: $app_name"
sh $scriptFolderPath/utils/replace-str.sh $front_path/docker/docker-compose.dev.yml "name: $inital_front_project_name" "name: $app_name"

# Replace the app name in the compose files
sh $scriptFolderPath/utils/replace-str.sh $front_path/docker/docker-compose.yml $initial_front_app_name $front_app_name
sh $scriptFolderPath/utils/replace-str.sh $front_path/docker/docker-compose.dev.yml $initial_front_app_name $front_app_name

cd $scriptFolderPath

#######################################
# Deployment scripts
#######################################

# Bitbucket to rancher
sh $scriptFolderPath/utils/replace-str.sh $scriptFolderPath/../bitbucket-pipelines.yml $initial_front_app_name $front_app_name
sh $scriptFolderPath/utils/replace-str.sh $scriptFolderPath/../bitbucket-pipelines.yml $initial_api_app_name $api_app_name

#######################################
# Start everything
#######################################

bash ./compose-all.sh up -d --build

#######################################
# Next step
#######################################

echo "Glutamat started."

echo "API : http://localhost:$backend_docker_app_port_exposed"
echo "POSTGRES : http://localhost:$postgres_exposed_port"
echo "FRONTEND : http://localhost:$frontend_docker_port_exposed"