# Multi-stage build for UniVoice
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Development stage
FROM base AS development
ENV NODE_ENV=development
RUN npm ci --include=dev
COPY . .
EXPOSE 5174
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
ENV NODE_ENV=production
RUN npm ci --only=production --ignore-scripts
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
RUN apk add --no-cache dumb-init
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-electron ./dist-electron
COPY --from=build /app/package*.json ./
RUN npm ci --only=production --ignore-scripts && npm cache clean --force
USER node
EXPOSE 5174
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]