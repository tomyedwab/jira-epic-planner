FROM gradle:jdk8-alpine as gradle-host

USER root

COPY *.gradle.kts /app/
COPY gradlew /app/
ADD gradle /app/gradle
COPY src/ /app/src

WORKDIR /app/
RUN gradle shadowJar --stacktrace --no-daemon

# ----

FROM node:8.15-alpine as node

WORKDIR /client
COPY client/package.json .
RUN npm set progress=false && \
    npm config set depth 0 && \
    npm install --only=production && \
    npm cache clean --force

COPY client/src/ ./src
COPY client/public/ ./public
RUN npm run-script build

# ----

FROM openjdk:jre-alpine as server

WORKDIR /app/
ENV CLASSPATH /app/main.jar

COPY --from=gradle-host /app/build/libs/main.jar /app/

COPY --from=node /client/build/static /app/client/build/static
COPY --from=node /client/build/index.html /app/client/build/

CMD ["java", "main.kotlin.MainKt"]