# Overlap AI - Production Deployment Guide

## Overview
This guide walks you through deploying Overlap AI to production using:
- **Render** → Backend (Express API)
- **Vercel** → Frontend (Next.js)
- **GitHub** → Connected source for both

---

## 🎯 Pre-Deployment Checklist

✅ Code pushed to GitHub: `https://github.com/xpandai03/streamline-ai-webapp.git`
✅ Server package.json created in `/server` directory
✅ Render.yaml configuration file updated
✅ Local environment variables documented in `.env`

---

## 1️⃣ BACKEND DEPLOYMENT (Render)

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up or log in with GitHub

### Step 2: Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `xpandai03/streamline-ai-webapp`
3. Configure the service:

**Basic Settings:**
```
Name: overlap-ai-backend
Region: Oregon (US West)
Branch: main
Root Directory: server
Runtime: Node
```

**Build & Deploy:**
```
Build Command: npm install
Start Command: node index.js
```

**Instance Type:**
```
Free (or Starter if you need more resources)
```

### Step 3: Add Environment Variables

In the Render dashboard, add these environment variables:

```bash
# Required - OpenAI API Key (get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Port (Render auto-detects, but explicit is better)
PORT=3001

# Skip email delivery (we're not using SMTP yet)
SKIP_EMAIL=true

# Highlight detection mode (false = instant deterministic)
USE_GPT_HIGHLIGHTS=false

# Job persistence
JOB_TTL_MINUTES=120

# Public base URL (UPDATE THIS AFTER VERCEL DEPLOYMENT)
PUBLIC_BASE_URL=https://YOUR-VERCEL-APP.vercel.app

# Optional: n8n webhook for notifications
N8N_WEBHOOK_URL=https://webhook.site/your-unique-id

# Clipping configuration
NUM_CLIPS=3
CLIP_LENGTH_MIN=30
CLIP_LENGTH_MAX=60

# Caption styling
CAPTION_COLOR=#FFD600
CAPTION_FONT=Impact
USE_BLUR_BACKGROUND=false

# Debug mode
DEBUG=true
NODE_ENV=production
```

### Step 4: Deploy
1. Click **"Create Web Service"**
2. Render will automatically build and deploy
3. Wait for deployment to complete (3-5 minutes)
4. Note your Render URL: `https://overlap-ai-backend.onrender.com`

### Step 5: Verify Backend
```bash
# Health check
curl https://overlap-ai-backend.onrender.com/api/health

# Expected response:
{"status":"ok","timestamp":"2025-10-11T20:30:00.000Z"}
```

---

## 2️⃣ FRONTEND DEPLOYMENT (Vercel)

### Method A: Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Sign up or log in with GitHub
3. Click **"Add New"** → **"Project"**
4. Import `xpandai03/streamline-ai-webapp`
5. Configure:

**Framework Preset:** Next.js
**Root Directory:** `./` (leave as root)
**Build Command:** `npm run build`
**Output Directory:** `.next`

6. Add Environment Variables:

```bash
NEXT_PUBLIC_API_URL=https://overlap-ai-backend.onrender.com
PUBLIC_BASE_URL=https://YOUR-VERCEL-APP.vercel.app
```

7. Click **"Deploy"**
8. Wait for deployment (2-3 minutes)
9. Note your Vercel URL: `https://overlap-ai.vercel.app`

### Method B: Vercel CLI

```bash
# Login to Vercel
vercel login

# Link project
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://overlap-ai-backend.onrender.com

vercel env add PUBLIC_BASE_URL production
# Enter: https://YOUR-VERCEL-APP.vercel.app

# Deploy to production
vercel --prod
```

---

## 3️⃣ POST-DEPLOYMENT CONFIGURATION

### Update Backend PUBLIC_BASE_URL
Once you have your Vercel URL, go back to Render:
1. Navigate to your web service
2. Go to **Environment** tab
3. Update `PUBLIC_BASE_URL` to your Vercel URL
4. Click **"Save Changes"**
5. Render will automatically redeploy

### Update Frontend Rewrites
The `next.config.js` needs to proxy requests to your Render backend.

Update the file with your production URLs:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: '/temp/:path*',
        destination: `${apiUrl}/temp/:path*`,
      },
    ]
  },
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
```

Then commit and push:

```bash
git add next.config.js
git commit -m "Update rewrites for production"
git push
```

Vercel will automatically redeploy.

---

## 4️⃣ VERIFICATION & TESTING

### Test Backend Health
```bash
curl https://overlap-ai-backend.onrender.com/api/health
```

### Test Full Video Processing
1. Visit your Vercel URL: `https://overlap-ai.vercel.app`
2. Paste a short YouTube video (2-5 minutes recommended for first test):
   ```
   https://www.youtube.com/watch?v=dQw4w9WgXcQ
   ```
3. Enter your email address
4. Click **"Generate Clips"**

### Expected Flow
1. Progress bar shows:
   - Downloading video (10%)
   - Extracting audio (25%)
   - Transcribing (35%)
   - Finding highlights (50%) - *Should complete instantly with deterministic mode*
   - Creating clips (65%)
   - Adding captions (80%)
   - Complete (100%)

2. Clips appear in grid
3. Video players work inline
4. Download buttons functional

### Check Render Logs
In Render dashboard, view logs to see:
```
[INFO] POST /api/process
[INFO] Job [uuid] created for URL: https://www.youtube.com/watch?v=...
[INFO] ✅ Stage: download ✅
[INFO] ✅ Stage: extract_audio ✅
[INFO] ✅ Stage: transcribe ✅
[HIGHLIGHTS] Mode: Deterministic
[INFO] ✅ Stage: clip ✅ (3 generated)
[INFO] ✅ Stage: caption ✅ (3 captioned)
[JOB] complete [uuid] clips=3
```

### Test Webhook (if configured)
If you set `N8N_WEBHOOK_URL`, check webhook.site or your n8n instance for payload:
```json
{
  "jobId": "...",
  "status": "complete",
  "email": "test@example.com",
  "youtubeUrl": "https://www.youtube.com/watch?v=...",
  "clips": [
    {
      "id": "...",
      "filename": "clip-....mp4",
      "url": "https://overlap-ai.vercel.app/temp/clip-....mp4",
      "caption": "...",
      "duration": 30
    }
  ],
  "completedAt": "2025-10-11T20:30:00.000Z"
}
```

---

## 5️⃣ TROUBLESHOOTING

### Issue: "Job Not Found" Error
**Solution:** Check that `JOB_TTL_MINUTES` is set to 120 on Render

### Issue: Videos Not Playing
**Solution:**
1. Check that `PUBLIC_BASE_URL` on Render matches your Vercel URL exactly
2. Verify rewrites in `next.config.js` point to correct Render URL
3. Test direct access: `curl -I https://overlap-ai-backend.onrender.com/temp/clip-xxx.mp4`

### Issue: 50% Stall at "Finding Highlights"
**Solution:** Verify `USE_GPT_HIGHLIGHTS=false` on Render

### Issue: Font Errors in Logs
**Solution:**
- Render should have Impact.ttf available
- Check logs for: `[CAPTIONS] Font detected: /usr/share/fonts/...`
- If missing, captions will be skipped gracefully

### Issue: Slow Cold Starts
**Solution:**
- Render free tier spins down after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds
- Consider upgrading to Starter plan ($7/month) for always-on instances

---

## 6️⃣ OPTIONAL: Enable Captions

By default, captions are added. To verify or customize:

1. On Render, check environment variables:
   ```
   CAPTION_COLOR=#FFD600
   CAPTION_FONT=Impact
   ```

2. Check logs for font detection:
   ```
   [CAPTIONS] Font detected: /usr/share/fonts/truetype/msttcorefonts/Impact.ttf
   ```

3. If font not found, captions will be skipped and logged:
   ```
   [WARN] Using clips without captions as fallback
   ```

---

## 7️⃣ MONITORING & MAINTENANCE

### Monitor Job Cleanup
Render logs will show periodic cleanup:
```
[PERIODIC] Running scheduled job cleanup...
[CLEANUP] Removed 5 expired job(s)
```

### Check Disk Usage
Jobs and clips are stored in `server/.data/jobs/` and `public/temp/`
- Jobs auto-expire after 2 hours
- Temp files cleaned with jobs
- Monitor Render disk usage in dashboard

### Update Dependencies
Periodically update packages:
```bash
cd server
npm update
git add package-lock.json
git commit -m "Update server dependencies"
git push
```

---

## 📊 DEPLOYMENT SUMMARY

| Service | Platform | URL | Status |
|---------|----------|-----|--------|
| Frontend | Vercel | `https://overlap-ai.vercel.app` | ✅ |
| Backend | Render | `https://overlap-ai-backend.onrender.com` | ✅ |
| Source | GitHub | `https://github.com/xpandai03/streamline-ai-webapp` | ✅ |

---

## ✅ ACCEPTANCE CRITERIA

- [x] Code committed and pushed to GitHub
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured on both platforms
- [ ] Rewrites updated with production URLs
- [ ] Health check endpoint returning 200
- [ ] Test video processed successfully
- [ ] Clips playable inline
- [ ] Download buttons functional
- [ ] Webhook notifications received (if configured)

---

## 🎉 NEXT STEPS

Once deployment is complete:

1. **Test with longer videos** (10-20 minutes)
2. **Monitor logs** for any errors or performance issues
3. **Set up monitoring** with Render's built-in metrics
4. **Configure custom domain** on Vercel (optional)
5. **Enable email notifications** by adding SMTP credentials
6. **Scale up** to paid plans if needed for production traffic

---

## 🆘 SUPPORT

If you encounter issues:
1. Check Render logs for backend errors
2. Check Vercel logs for frontend errors
3. Verify all environment variables are set correctly
4. Test each service independently (health checks)
5. Review this deployment guide step-by-step

**Repository:** https://github.com/xpandai03/streamline-ai-webapp
**Issues:** https://github.com/xpandai03/streamline-ai-webapp/issues
