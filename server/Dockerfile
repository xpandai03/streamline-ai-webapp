# Use Node 18 base image
FROM node:18

# Install system dependencies: Python3, pip, and ffmpeg
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install yt-dlp Python module (used via 'python3 -m yt_dlp')
# Install directly from GitHub master branch for LATEST bot bypass fixes
# PyPI version lags behind; git version has newest YouTube workarounds
RUN pip3 install --no-cache-dir -U pip && \
    pip3 install --no-cache-dir -U https://github.com/yt-dlp/yt-dlp/archive/master.tar.gz

# Verify installation
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
