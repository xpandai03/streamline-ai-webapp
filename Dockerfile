FROM node:18-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    fonts-liberation \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN pip3 install --break-system-packages yt-dlp

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Build Next.js
RUN npm run build

# Create temp directory
RUN mkdir -p /app/public/temp

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]