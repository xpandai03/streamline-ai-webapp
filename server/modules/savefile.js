import { execSync } from "node:child_process";
import {writeFileSync} from "node:fs"

const link = `https://www.youtube.com/watch?v=dtJ8N407brM`

const url = `https://youtube-media-downloader.p.rapidapi.com/v2/video/details?videoId=dtJ8N407brM&urlAccess=normal&videos=auto&audios=auto`;
  const options = {
  method: 'GET',
  headers: {
    'x-rapidapi-key': 'c27bf113e1msh84df81cc9f7266fp11f6bajsn7fb3415730dc',
    'x-rapidapi-host': 'youtube-media-downloader.p.rapidapi.com'
  }
  };

const response = await fetch(url, options);
const result = await response.json();
console.log(result);

const videoItems = result.videos?.items || [];
console.log(result.videos)
    
    if (videoItems.length === 0) {
      throw new Error('No video items found in API response');
    }

    // Filter videos that have audio (for complete video experience)
    // If you want video+audio combined, choose items with hasAudio: true
    const videosWithAudio = videoItems.filter(item => item.hasAudio);
    
    // If no videos with audio, fall back to all videos
    const availableVideos = videosWithAudio.length > 0 ? videosWithAudio : videoItems;

    // Find the highest quality video based on resolution and size
    const highestQuality = availableVideos.reduce((best, current) => {
      // Parse quality (e.g., "1080p" -> 1080)
      const currentRes = parseInt(current.quality) || 0;
      const bestRes = parseInt(best.quality) || 0;
      
      // Compare by resolution first, then by file size
      if (currentRes > bestRes) {
        return current;
      } else if (currentRes === bestRes && current.size > best.size) {
        return current;
      }
      return best;
    });

console.log(`Selected video quality: ${highestQuality.quality}`);
console.log(`Video size: ${highestQuality.sizeText}`);
console.log(`MIME type: ${highestQuality.mimeType}`);
console.log(`Has audio: ${highestQuality.hasAudio}`);

    execSync(`curl -L "${highestQuality.url}" -o "${'downloaded_video.mp4'}"`, { stdio: 'inherit' });
    console.log('Video downloaded and saved as', outputPath);
console.log(highestQuality.url)

