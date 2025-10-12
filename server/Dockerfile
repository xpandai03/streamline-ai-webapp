# Use official Node 18 image
FROM node:18-slim

# Install system dependencies: Python3, pip, ffmpeg, and yt-dlp
RUN apt-get update && \
    apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && pip3 install --no-cache-dir -U yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Verify installations
RUN node --version && \
    python3 --version && \
    ffmpeg -version && \
    yt-dlp --version

# Set working directory
WORKDIR /app

# Copy package files first (for better Docker layer caching)
COPY package*.json ./

# Install Node dependencies
RUN npm install --production

# Copy the rest of the backend source code
COPY . .

# Create directories for temp files and job storage
RUN mkdir -p .data/jobs && \
    mkdir -p ../public/temp

# Expose port (Render will map this)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start the Express server
CMD ["node", "index.js"]
