# Use Node 18 base image
FROM node:18

# Install system dependencies: Python3, pip, and ffmpeg
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install yt-dlp Python module (used via 'python3 -m yt_dlp')
RUN pip3 install --no-cache-dir yt-dlp

# Verify installation
RUN python3 -m yt_dlp --version

# Set working directory
WORKDIR /app

# Copy dependencies and install them
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Bind to Render dynamic port
ENV PORT=10000
EXPOSE 10000

# Start backend server
CMD ["node", "index.js"]
