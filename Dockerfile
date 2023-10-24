FROM node:18-alpine AS build

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./
COPY --chown=node:node . .

RUN apk add git
RUN npm config set fetch-retries 5
RUN npm config set fetch-retry-mintimeout 600000
RUN npm config set fetch-retry-maxtimeout 1200000
RUN npm config set fetch-timeout 1800000
RUN npm i --force
RUN npm run build

USER node

FROM node:18-alpine AS production

WORKDIR /opt/adapter

COPY --chown=node:node --from=build /usr/src/app/build /opt/adapter
COPY --chown=node:node --from=build /usr/src/app/node_modules /opt/adapter/node_modules

ENV TZ=Asia/Ho_Chi_Minh
ENV SERVER_PORT 7999

ENV MAX_MESSAGE_LENGTH 10

ENV KAFKA_ENABLED "false"
ENV KAFKA_BOOTSTRAP_SERVERS "localhost:9092"
ENV KAFKA_SCHEMA_REGISTRY_URL "http://localhost:8081"
ENV KAFKA_GROUP_ID "ACD-adapter"
ENV KAFKA_CONSUMER_AUTO_COMMIT "false"
ENV KAFKA_SECURITY_PROTOCOL "PLAINTEXT"
ENV KAFKA_SASL_MECHANISM "plain"
ENV KAFKA_SASL_AUTH_USER ""
ENV KAFKA_SASL_AUTH_PASSWORD ""

ENV LOG_LEVEL "debug"

EXPOSE 7510

CMD [ "node", "/opt/adapter/main.js" ]
