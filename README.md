# ActoGraph v3

This repository contains the source code for the ActoGraph v3 software. The software is a web and desktop application built with [Quasar Framework](https://quasar.dev/), a Vue.js-based framework for building responsive web applications.

The software is composed of two parts:
- A frontend application built with Quasar Framework
- A backend application built with Nest.js

The software is designed to be run on: 
- The desktop (Linux, MacOS, Windows)
- The web (any device with a modern browser)

## How to setup

### Development

For development in electron mode: 
```bash
bash scripts/dev-electron.sh
```

For development in web mode: 
```bash
bash scripts/dev-web.sh
```
The latter command will start the docker containers for API and Front.

## How to deploy

o push a tag starting with prod-vX.X.X will trigger the deployment of the production versions of the app.

If one wants to deploy manually a web version of the app, one can use the following command:
```bash
# Indicate we are in production mode through the COMPOSE_MODE environment variable
COMPOSE_MODE=production sh compose.sh up -d
```

