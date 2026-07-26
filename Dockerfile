# Stage 1: Build React Application
FROM node:18-alpine AS build

WORKDIR /app

# URL Landing API встраивается в standalone widget во время сборки.
ARG LAND_URL=https://localhost
ENV LAND_URL=${LAND_URL}

# Install dependencies
# Using --legacy-peer-deps to avoid potential conflicts with newer npm versions
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build main application
RUN NODE_OPTIONS=--max-old-space-size=4096 npm run build

# Build standalone widget
RUN NODE_OPTIONS=--max-old-space-size=4096 npm run build:widget

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy build artifacts to nginx public directory
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
