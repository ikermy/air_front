FROM node:20-alpine AS build

WORKDIR /app

ARG LAND_URL=https://localhost
ENV LAND_URL=${LAND_URL}
ARG NEXT_PUBLIC_GRPC_HOST=https://localhost:50443
ENV NEXT_PUBLIC_GRPC_HOST=${NEXT_PUBLIC_GRPC_HOST}

# .npmrc копируем до npm ci: в нём ретраи/таймауты для устойчивости к
# транзиентным сетевым ошибкам в CI ("npm error network").
COPY .npmrc package*.json ./
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
EXPOSE 80
USER node
CMD ["node", "server.js"]
