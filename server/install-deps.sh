#!/bin/bash
# Install system dependencies for Render Node environment

set -e

echo "Installing yt-dlp and ffmpeg..."

# Update package lists
apt-get update || sudo apt-get update || true

# Install Python and pip if not present
if ! command -v python3 &> /dev/null; then
    echo "Installing Python3..."
    apt-get install -y python3 python3-pip || sudo apt-get install -y python3 python3-pip || true
fi

# Install ffmpeg if not present
if ! command -v ffmpeg &> /dev/null; then
    echo "Installing ffmpeg..."
    apt-get install -y ffmpeg || sudo apt-get install -y ffmpeg || true
fi

# Install yt-dlp via pip
echo "Installing yt-dlp..."
pip3 install -U yt-dlp || python3 -m pip install -U yt-dlp || true

# Verify installations
echo "Verifying installations..."
python3 --version || true
ffmpeg -version | head -1 || true
yt-dlp --version || true

echo "Dependencies installed successfully!"
