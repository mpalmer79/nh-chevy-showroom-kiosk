# NH Chevy Showroom Kiosk - Frontend React Application (Production)
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy application code
COPY . .

# Build arguments for environment
ARG REACT_APP_API_URL
ARG REACT_APP_KIOSK_ID=KIOSK-001
ARG REACT_APP_DEALERSHIP=New Hampshire Chevrolet
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_KIOSK_ID=$REACT_APP_KIOSK_ID
ENV REACT_APP_DEALERSHIP=$REACT_APP_DEALERSHIP

# Build the production app
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve to run the static files
RUN npm install -g serve

# Copy built files from builder stage
COPY --from=builder /app/build ./build

# Expose port (Railway uses PORT env var)
EXPOSE 3000

# Start the production server
CMD ["sh", "-c", "serve -s build -l ${PORT:-3000}"]
