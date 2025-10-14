#!/bin/bash
# Wrapper script to ensure yt-dlp runs with correct PATH
export PATH=/usr/local/bin:/usr/bin:/bin:$PATH

# Try to find yt-dlp
if command -v yt-dlp &> /dev/null; then
    exec yt-dlp "$@"
elif [ -f /usr/local/bin/yt-dlp ]; then
    exec /usr/local/bin/yt-dlp "$@"
elif [ -f /usr/bin/yt-dlp ]; then
    exec /usr/bin/yt-dlp "$@"
else
    # Fallback to Python module
    exec python3 -m yt_dlp "$@"
fi
