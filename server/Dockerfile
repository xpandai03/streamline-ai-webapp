# Use Node 18 base image
FROM node:18

# Set PATH at Docker level to include /usr/local/bin
ENV PATH="/usr/local/bin:/usr/bin:/bin:${PATH}"

# Install Python, pip, ffmpeg, and yt-dlp with triple defense
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    pip3 install -U yt-dlp && \
    ln -sf /usr/local/bin/yt-dlp /usr/bin/yt-dlp && \
    yt-dlp --version && \
    python3 -m yt_dlp --version && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

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
