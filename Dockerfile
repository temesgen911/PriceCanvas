# Build stage
FROM node:18-bullseye-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the Vite frontend application
RUN npm run build

# Production stage
FROM node:18-bullseye-slim

WORKDIR /app

# Install production dependencies and tsx to run the TypeScript server
COPY package*.json ./
RUN npm ci --omit=dev && npm install tsx

# Copy the built frontend bundle
COPY --from=builder /app/dist ./dist

# Copy the server configuration
COPY server.ts ./

# Expose the API and Web port
EXPOSE 3000

# Start the Express server in production mode
ENV NODE_ENV=production
CMD ["npx", "tsx", "server.ts"]
