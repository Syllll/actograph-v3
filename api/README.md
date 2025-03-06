# Table of content

1. [Introduction](#markdown-header-introduction)
2. [How to setup and use](#markdown-header-how-to-setup-and-use)
3. [Global concepts](#markdown-header-global-concepts)
4. [Modules and tools](#markdown-header-modules-and-tools)

# Introduction

This project is meant as a model for the developers of Improba. You will find inside a way to **setup and deploy a nestjs project** (backend code), a certain **style of coding** (not mandatory), **tools and modules** implemented in the utils (tools) and src/general (modules) folders. The server code presented in this template was designed to work with the interface template (quasarjs). The use of both templates provides ready-to-use features such as: pagination tables, customizable tables, authentification mecanisms, color themes (light and dark).

The intended use is:

1. Fork the repository (this will create a new repo)
2. Edit the files listed in the "Start a new project" part and follow the process implemented there.
3. Choose your modules and tools.
4. Start coding your projet.

See [Start a new project](#markdown-header-start-new-proj) for more details.

The current state of the template is:

- [x] - **Global code** (finished) - Server is fonctionnal.
- [x] - **auth-jwt module** (ongoing) - Authentification mecanism based on a jwt token (register, login). Password reset is a work in progress.
- [] - **mailer-sendgtid module** (ongoing) - Send emails via sendgrid

For more details, see [Modules and tools](#markdown-header-modules-and-tools).

---

**NOTE**

**Anyone can edit** this template by following the steps below:

1. Create a new branch from master (my-branche)
2. Do the modifications there
3. Once the modifications are done, go to bitbucket and create a pull-request to merge your branch into master.
4. Select the manager of this repository as a reviewer and wait for... the review. If it is positive then your modifications will be merged into master and available to all.

---

# How to setup and use

The template code can be tested "as it is" but it is not recommanded for production since it will have variables with inadapted default states (title of the project will be "template" for example). Neverthess, we will start by describing how to run it so anyone can check it is working as intended. For a new project creation, please refer to [Start a new project](#markdown-header-start-a-new-project).

## Setup for dev

The template uses docker (docker-compose to create everything its need to run on linux (ubuntu). A developer should start by installing docker and docker-compose on his machine. Then, the **start of the project is one console command step** away! This setup offers the advantage of simplicty and has only one drawback: git cannot be used from within docker.

To use git, I strongly recommend to open a second console in the project and to perform the git operations from there.

In the main console, you may enter the "one-command" needed to start the project:

```bash
# Go into the project folder (where you will find the docker-compose.dev.yml file)
# Check you have installed docker and docker-compose on your machine

# Create and edit a .env file using the .env.example file

# To start the project quickly, just do:
docker-compose -f ./docker-compose.dev.yml up
# You can code after this, jsut avoir using git from within the docker
```

If you prefer a more manual way then you may also do:

```bash
# Open a shell into the docker container that runs your project
yarn docker:dev

# Run the init migration
yarn migration:run

# Start the server
yarn start:dev
```

To **create new migration**, the process is:

```bash
# Enter the docker
yarn docker:dev

# Create the migration
yarn migration:generate migrations/my-new-migra-name

# Run the migration
yarn migration:run
```

---

**NOTE**

You may customize the ports in the docker-compose.dev.yml file. They use the following syntax: [host-machine-port]:[internal-docker-port]. You may want to **edit the first part** but never the second ! Editing the second (internal-docker-port) may break the app.

You may also need to change the db service name by remplace all occurrences of **api-dev-db** in the docker-compose.dev.yml file by **appname-dev-db**. This could solve the issue where docker starts and then stops without reasons.

---

By default, an admin user will be created from the credentials listed in the .env file. One can create another user with the following commands:

```bash

# Enter the docker
yarn docker:dev

# Run the command using yarn (replace username and password)
yarn console create-admin-user username password

```

## Start a new project

Starting a new project requires to:

- **Fork the repository** to create a new one. Clone the new one on your machine.
- Edit the **package.json** to put your own title, description and version. Also change any occurrence of "improba-template-nestjs" with the name of the service declared in docker-compose.\* files.
- Edit the **docker-compose.** files (dev and not dev) and replace all occurences of "improba-template-nestjs" with the name of your app.

## Deploy in production

Docker is also useful to deploy the app in production.

```bash
# To perform a build from scratch and run the container in the background
docker-compose up --build --no-cache -d

# To perform a quick build using the cache
docker-compose up --build -d

# To use a previous build to start the container
docker-compose up -d
```

Depending on the production machine, the available disk space may quickly drop down with docker. This is coming from the iterative mecanism on which docker is built: nothing is really deleted, it just adds states on top of states (many states = huge memory consomption). One way to "clean" a machine of its intermediary states is to run:

```bash
docker system prune
```

# Global concepts

This apps is build around the following architectural principles:

- **src/core** contains the code of the application. All code inside is application-specific and cannot be copied and pasted elsewhere without heavy modifications.
- **src/utils** deals with a set of utils that can be used every where in the app.
- **src/general** contains everything that is not specific to the current application. Mainly modules that can be copied/paster in another apps without breaking. All **the code in this folder must be self-sufficent** and not related to src/core. To communicate with src/core, it is recommanded to use nestjs events.
- **The modules** are nestjs modules structured with one or several entities, repositories, services and controllers. They may contain additional folders if required (events, listeners etc.).

Within a module, the code must respect a separation of concernt between:

- An entity that represents a table in the database and, indirectly, a set of associated features since it will have its own repository and service(s).
- A repository which is meant to deal with complex queries in the context of an entity.
- A service which is meant to deal with the core logic of the app ("create a new user" for example), a controller manages how the app will respond to http requests.

Usually, services tends to become quite big and one may need to separate them into several sub-units such as:

---

**Service structure example**

    UserService/
        /index.service.ts <- le userService
        /authentification/index.ts <- la feature de auth
            /login.ts <- le login
            /register.ts <- le registering

---

This separation rises the question of the implementation as classes or modules for the scattered parts (login.ts in the example below). The choice is for the developer to make but nestjs impose a class start point since index.service.ts is a class. A way to deal with this is to do as follow. Keep in minde this is just example code and not real code.

```typescript
// index.service.ts
// This is not working code, just a bit of demo code.

import { Login } from './login.ts';

// A real nestjs-service that must be registered in the module.ts file
@Injectable
class UserService extends BaseService<Entity, Repository> {
  public login: Login;

  constructor(
    @InjectRepository(UserRepository)
    userRepository: UserRepository,
  ) {
    super(repository);

    // Here, I create a login object from a class named Login.
    // I manually inject two elements inside: the current service and the repository. The idea is to give access to the service and its repo to our login object. The repo is especially usefull.
    this.login = new Login(this, this.userRepository);
  }
}
```

```typescript
// login.ts
// This is not working code, just a bit of demo code.

// Here it may make sense to import some functions coming from a module.

// Simple login class
class Login {
  private userService: UserService;
  private userRepository: UserRepository

  constructor(userService: UserService, userRepository: UserRepository) {
    this.userService = userService;
    this.userRepository = userRepository;
  }

  // Not acccessible from the outside (private)
  private async doSomePrivateStuff(): Promise<boolean> {
    // ....
  }

  // Try to log the user, just for the example sake
  // Can be used from the outside of the class (public)
  public async try(loginInfo: {...}): Promise<boolean> {
    const isLogged = await this.doSomePrivateStuff();
    return isLogged;
  }
}
```

```typescript
// controller.ts
// This is not working code, just a bit of demo code.

// Within a controller, you can just do:

@Controller("auth-jwt")
export class AuthJwtController extends BaseController {

  constructor(
    private userService: UserJwtService
  ) {
    super();
  }

  @Post("login")
  async postLogin(
    @Body("username") username: string,
    @Body("password") password: string
  ): Promise<boolean> {
    // Here, we use the login part of our service.
    const isLogged = await this.userService.login.try({...});
    return isLogged;
  }
}

```

# Modules and tools

This section is dedicated to the toolkits present within the template.

## Modules

The modules put into src/general must be listed and shortly described here. They may also contain a README.md file to provide information about their use, events and listeners.

- **auth-jwt** implements an authentification mecanism based on a jwt-token. This module is used by the src/core/user module. It is activted by default since the majority of apps will implement an authentification mecanism.
- **mailer-sendgrid** [not yet] provides an event based API to send emails or sms to users.
- **mailer-mailjet** [not yet] provides an event based API to send emails.

## Tools
