# ---- Base Node ----
FROM node:24-alpine AS base
WORKDIR /workspace
ARG NPM_TOKEN
COPY package.json .
COPY package-lock.json .
COPY ./config/.npmrc .
RUN npm set progress=false && npm config set depth 0

# ---- Build ----
FROM base AS build
ARG NPM_TOKEN
COPY . .
RUN npm ci
RUN npm run build

# ---- Release ----
FROM base AS release
ARG NPM_TOKEN
RUN npm ci --omit=dev
COPY --from=build /workspace/dist ./dist
USER nobody
CMD npm run start:prod
