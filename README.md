# 🎬 Overlap AI

**Turn long-form YouTube videos into viral, captioned shorts — fully automated.**

Paste a YouTube link, wait 2 minutes, get 3-5 ready-to-post clips with kinetic yellow captions.

---

## ✨ Features

- **Automated Highlight Detection** — AI finds the most viral moments
- **Kinetic Captions** — Yellow, per-word animated captions (Financian-style)
- **Email Delivery** — Clips sent directly to your inbox
- **9:16 Vertical Format** — TikTok/Reels/Shorts ready
- **One-Click Experience** — No account, no queue, no complexity

---

## 🛠️ Tech Stack

**Frontend:**
- Next.js 14 + React
- Tailwind CSS
- Framer Motion

**Backend:**
- Express.js
- FFmpeg (video processing)
- yt-dlp (YouTube downloads)
- OpenAI Whisper (transcription)
- GPT-4o-mini (highlight detection)
- Nodemailer (email delivery)

**Deploy:**
- Render.com (Docker)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- FFmpeg installed
- yt-dlp installed
- OpenAI API key
- Gmail app password (for email delivery)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd overlap-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your credentials:
   - `OPENAI_API_KEY` — Your OpenAI API key
   - `SMTP_USER` — Your Gmail address
   - `SMTP_PASSWORD` — Gmail app password ([generate here](https://myaccount.google.com/apppasswords))

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the app**
   ```
   http://localhost:3000
   ```

---

## 📦 Deployment (Render)

### Option 1: Deploy with Dockerfile

1. Push your code to GitHub
2. Connect your repo to Render
3. Use the included `Dockerfile`
4. Set environment variables in Render dashboard

### Option 2: Deploy with render.yaml

1. Push code to GitHub
2. Create new service in Render
3. Point to `render.yaml`
4. Render will auto-configure everything

### Required Environment Variables

Set these in Render dashboard:

```
OPENAI_API_KEY=<your-key>
SMTP_USER=<your-email>
SMTP_PASSWORD=<app-password>
APP_URL=<your-render-url>
```

---

## 🎨 Architecture

```
YouTube URL → Download → Transcribe → Detect Highlights → Clip → Caption → Email
```

### Processing Pipeline

1. **Download** — yt-dlp fetches video (max 500MB)
2. **Extract Audio** — FFmpeg extracts mono audio
3. **Transcribe** — Whisper generates word-level timestamps
4. **Detect Highlights** — GPT-4o-mini finds viral moments (with keyword fallback)
5. **Create Clips** — FFmpeg trims and crops to 9:16
6. **Add Captions** — Kinetic yellow captions with per-word timing
7. **Email** — Nodemailer sends clips with download links

---

## 📂 Project Structure

```
overlap-ai/
├── app/                    # Next.js frontend
│   ├── page.tsx           # Main UI
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── VideoInput.tsx
│   ├── ProgressBar.tsx
│   └── ClipGrid.tsx
├── server/                # Express backend
│   ├── index.js          # Server entry
│   ├── routes/           # API routes
│   ├── modules/          # Processing modules
│   └── utils/            # Utilities
├── public/temp/          # Temporary file storage
├── Dockerfile            # Docker config
├── render.yaml           # Render deployment
└── package.json
```

---

## 🧠 Configuration

Edit these in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `NUM_CLIPS` | `3` | Number of clips to generate (2-4 recommended) |
| `CLIP_LENGTH_MIN` | `30` | Minimum clip duration (seconds) |
| `CLIP_LENGTH_MAX` | `60` | Maximum clip duration (seconds) |
| `CAPTION_COLOR` | `#FFD600` | Caption text color (yellow) |
| `CAPTION_FONT` | `Impact` | Caption font family |
| `USE_BLUR_BACKGROUND` | `false` | Use blurred background for landscape videos |
| `DEBUG` | `false` | Enable debug logging |

---

## 🔧 Troubleshooting

### FFmpeg not found
**Solution:** Install FFmpeg
- Mac: `brew install ffmpeg`
- Ubuntu: `apt-get install ffmpeg`
- Windows: Download from [ffmpeg.org](https://ffmpeg.org)

### yt-dlp not found
**Solution:** Install yt-dlp
```bash
pip install yt-dlp
# or
brew install yt-dlp
```

### Gmail authentication error
**Solution:** Use Gmail app password (not your regular password)
1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Generate new app password
3. Use it in `SMTP_PASSWORD`

### Transcription fails
**Solution:** Check OpenAI API key and credits
- Verify key at [platform.openai.com](https://platform.openai.com)
- Ensure you have API credits

---

## 📝 License

MIT

---

## 🤝 Contributing

PRs welcome. Please follow existing code style.

---

## 🔗 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [FFmpeg Docs](https://ffmpeg.org/documentation.html)
- [OpenAI API](https://platform.openai.com/docs)
- [Render Deployment](https://render.com/docs)

---

## 💡 Philosophy

> "People shouldn't edit clips — they should approve brilliance."

Built with the **CLEAR** prompting framework:
- **C**larity — Explicit intent and format
- **L**ogic — Structured reasoning
- **E**xamples — Domain-specific references
- **A**daptation — Context-aware tuning
- **R**esults — Deterministic outputs

---

**Made by builders, for creators.**

Start clipping: `npm run dev`
