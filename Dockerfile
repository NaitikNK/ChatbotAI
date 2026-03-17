# Base image for building the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Angular SSR application
RUN npm run build

# Production image
FROM node:20-alpine AS production
WORKDIR /app

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Expose the port (Render provides the PORT environment variable natively, 4000 is default SSR port)
EXPOSE 4000

# Start the SSR server
CMD ["node", "dist/ChatbotAI/server/server.mjs"]
