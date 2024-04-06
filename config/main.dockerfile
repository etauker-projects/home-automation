# ---- Base Node ----
FROM node:20.11-alpine AS base
WORKDIR /workspace
# ARG NPM_TOKEN
COPY package.json .
COPY package-lock.json .
COPY ./config/.npmrc .
RUN npm set progress=false && npm config set depth 0

# ---- Build ----
FROM base AS build
COPY . .
RUN npm ci
RUN npm run build

# ---- Release ----
FROM base AS release
RUN npm ci --omit=dev
COPY --from=build /workspace/dist ./dist
RUN mkdir "/.npm"
RUN chown -R 65534:65534 "/.npm"
USER nobody
CMD npm run start:prod
