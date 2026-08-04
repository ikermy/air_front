FROM node:20-alpine AS build

WORKDIR /app

ARG LAND_URL=https://localhost
ENV LAND_URL=${LAND_URL}

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps

COPY . .

RUN NODE_OPTIONS=--max-old-space-size=4096 npm run build
RUN NODE_OPTIONS=--max-old-space-size=4096 npm run build:widget

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/build/widget ./public/widget
EXPOSE 3000
USER node
CMD ["node", "server.js"]
