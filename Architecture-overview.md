# ⚙️ ARCHITECTURE_OVERVIEW.md — System Blueprint

## Overview  
The system is a **modular AI video pipeline** that takes a YouTube link → downloads → transcribes → detects highlights → generates kinetic captioned clips → emails results.  
Each stage is independent and replaceable, designed for clarity, speed, and future scalability.

---

## 🧱 Core Stack

**Frontend:**  
- Next.js (React) or lightweight Express-based web UI (Render-hosted)  
- Single upload/input screen with progress tracking  
- Minimal styling: black background, white text, yellow accent (#FFD600)

**Backend:**  
- Node.js / Express REST API  
- FFmpeg for video processing (installed in container)  
- yt-dlp for YouTube downloads  
- OpenAI Whisper API for transcription  
- GPT-4o-mini for highlight detection  
- Nodemailer for email delivery (Gmail app password for v1)  

**Hosting:**  
- Render (simple, autoscaled deployment)  
- Persistent file storage via `/tmp` for short jobs ( <2 minutes )  
- Logs streamed to stdout for debugging  

---

## 🧩 Modules and Responsibilities

| Module | Responsibility |
|--------|----------------|
| `downloader.js` | Downloads or validates YouTube video using yt-dlp |
| `transcriber.js` | Extracts and transcribes audio via Whisper API |
| `highlight_engine.js` | Uses GPT to detect viral or emotional moments |
| `caption_engine.js` | Generates and overlays kinetic captions via FFmpeg |
| `clipper.js` | Cuts 8–20s highlight segments and resizes to 9:16 |
| `emailer.js` | Sends email with preview thumbnails + clip URLs |
| `video_store.js` | Temporary cache for video/transcript/clip metadata |
| `logger.js` | Structured logs for each processing stage |

---

## 🔄 Data Flow  

1. **Frontend Input**  
   User submits: `{ youtubeUrl, email }`  
   → `POST /process`  

2. **Download Stage**  
   - yt-dlp downloads MP4  
   - Validates size < 500MB  
   - Extracts metadata (duration, fps, title)

3. **Transcription Stage**  
   - FFmpeg extracts mono audio  
   - Whisper → JSON transcript with word timestamps  

4. **Highlight Detection Stage**  
   - GPT prompt analyzes transcript for 3–5 engaging clips  
   - Returns array: `[ { start, end, caption } ]`  

5. **Clipping Stage**  
   - FFmpeg trims highlights  
   - Auto crop/resize 1080x1920 (9:16 vertical)  
   - Smart crop centers faces (optional future upgrade)

6. **Caption Stage**  
   - For each clip, burn-in yellow kinetic captions  
   - Font: Impact Bold / Arial Black  
   - Timing: per-word or 2-word chunks using `drawtext` filters  

7. **Email Stage**  
   - Nodemailer sends email with video thumbnails + download links  

8. **Cleanup**  
   - Delete local temp files after email confirmation  

---

## 🔐 Security + Reliability  
- Validate YouTube domain and file size before download  
- Sanitize filenames and input  
- Limit job runtime (2 mins hard cap)  
- Fallback retry for yt-dlp (auto-update before reattempt)  
- Disable external uploads (only YouTube URLs for v1)

---

## 🧠 Architecture Philosophy  
- Each step is **atomic** and composable  
- Designed for **observability** (logs at every step)  
- Use **simple contracts** between stages (`.json` handoffs)  
- **Stateless API** for now — persistent storage optional later  

---

## 🧪 Development Notes  
- Local testing with sample YouTube link: `https://youtu.be/y78dqbPD7Yg`  
- Use `DEBUG=true` mode to print timing per stage  
- Build modularly so Claude can rewrite individual functions safely  

---

## 🚀 Future Extension Hooks  
- Add Resend or Postmark for production email  
- Replace local `/tmp` with S3 or Supabase storage  
- Add async queue (BullMQ or Cloud Tasks)  
- Add webhook callback for API integrations  
- Migrate from per-word FFmpeg drawtext to `.ASS` animated captions  

---

## Summary  
Everything connects in a **linear, observable chain**: