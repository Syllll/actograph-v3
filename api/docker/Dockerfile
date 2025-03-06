FROM node:16.10.0 AS build-stage

WORKDIR /app

COPY package*.json ./
COPY yarn.lock ./
RUN rm -rf ./node_modules
RUN rm -rf ./dist

RUN yarn install

COPY . .

RUN yarn run build

FROM node:16.10.0 as production-stage

WORKDIR /app-prod

COPY --from=build-stage /app/ .
RUN yarn install
COPY . .
RUN yarn build
EXPOSE 3000

CMD ["/bin/bash", "-c", "yarn run migration:run; yarn start:prod"]