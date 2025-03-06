# ActoGraph v3

This repository contains the source code for the ActoGraph v3 software. The software is a web application built with [Quasar Framework](https://quasar.dev/), a Vue.js-based framework for building responsive web applications.

The software is composed of two parts:
- A frontend application built with Quasar Framework
- A backend application built with Nest.js

The software is designed to be run on: 
- The desktop (Linux, MacOS, Windows)
- The web (any device with a modern browser)
- [not yet] Mobile devices (Android, iOS), only for some features

## How to setup

For development: 
```bash
# To initialize a new project
sh compose.sh init

# To run an existing project
sh compose.sh up -d

# To stop all containers
sh compose.sh down
```

For production you can use the same commands but you need to set the `COMPOSE_MODE` environment variable to `production`.
```bash
# Indicate we are in production mode
export COMPOSE_MODE=production
```


## How to deploy

This template is intended to be ran with kubernetes. The deployment is done using the "deployment" feature of Rancher. The steps required to deploy are: 

1. Ensure the deployment is configured by asking your project leader. 
2. If the answer is yes then you can just push a tag such as v0.0.1 to reploy the 0.0.1 version of the app.
```bash
# Commit the work and push it
git commit ... && git push
# Create a new tag and push it to trigger the deployment CI
git tag v0.0.1 && git push origin v0.0.1
```

If the deployment is not configured then you can do it yourself by following the steps detailed in the [deployment documentation](./docs/deployment-rancher.md).
