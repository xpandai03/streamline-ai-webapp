# Use Node 18 base image with Debian Bookworm (Python 3.11)
FROM node:22-bookworm

# Install system dependencies: Python 3.11, pip, and ffmpeg
# Python 3.11 required by yt-dlp (3.9 deprecated)
# Bookworm ships with Python 3.11 by default
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Verify Python version (should be 3.11+)
RUN python3 --version

# Install yt-dlp Python module` (used via 'python3 -m yt_dlp')
# Install directly from GitHub master branch for LATEST bot bypass fixes
# PyPI version lags behind; git version has newest YouTube workarounds
# Master branch receives daily updates for YouTube's anti-bot measures
RUN pip3 install --no-cache-dir -U pip && \
    pip3 install --no-cache-dir -U git+https://github.com/yt-dlp/yt-dlp.git@master

# Verify installation - should show git commit hash for master branch
RUN python3 -m yt_dlp --version

# Create cache directory for OAuth tokens
# This directory will store Google OAuth tokens for authenticated downloads
RUN mkdir -p /app/.cache && chmod 777 /app/.cache

# Set working directory
WORKDIR /app

# Copy dependencies and install them
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Set cookie file environment variable (file will be provided via Render Secret Files)
ENV YTDLP_COOKIES_FILE=/app/cookies.txt

# Bind to Render dynamic port
ENV PORT=10000
EXPOSE 10000

# Start backend server
CMD ["node", "index.js"]
