# Overlap AI - Production Deployment Quick Start

## 🚀 5-Minute Deployment Guide

### Prerequisites
- GitHub account
- Render account (sign up at [render.com](https://render.com))
- Vercel account (sign up at [vercel.com](https://vercel.com))
- OpenAI API key

---

## Step 1: Deploy Backend to Render (2 minutes)

1. **Go to Render Dashboard**
   - Visit [render.com/dashboard](https://dashboard.render.com)
   - Click **"New +"** → **"Web Service"**

2. **Connect Repository**
   - Select: `xpandai03/streamline-ai-webapp`
   - Click **"Connect"**

3. **Configure Service**
   ```
   Name: overlap-ai-backend
   Region: Oregon (US West)
   Branch: main
   Root Directory: server
   Build Command: npm install
   Start Command: node index.js
   ```

4. **Add Environment Variables** (click "Advanced" → "Add Environment Variable")
   ```
   OPENAI_API_KEY=<your-key-here>
   PORT=3001
   SKIP_EMAIL=true
   USE_GPT_HIGHLIGHTS=false
   JOB_TTL_MINUTES=120
   PUBLIC_BASE_URL=https://YOUR-APP.vercel.app
   DEBUG=true
   NODE_ENV=production
   ```

   *Note: You'll update PUBLIC_BASE_URL after Vercel deployment*

5. **Deploy**
   - Click **"Create Web Service"**
   - Wait 2-3 minutes for build
   - Copy your Render URL: `https://overlap-ai-backend-xxxx.onrender.com`

---

## Step 2: Deploy Frontend to Vercel (2 minutes)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click **"Add New"** → **"Project"**

2. **Import Repository**
   - Select: `xpandai03/streamline-ai-webapp`
   - Click **"Import"**

3. **Configure Project**
   ```
   Framework Preset: Next.js
   Root Directory: ./
   Build Command: npm run build
   Output Directory: .next
   ```

4. **Add Environment Variables**
   ```
   NEXT_PUBLIC_API_URL=https://overlap-ai-backend-xxxx.onrender.com
   ```

   *Use your Render URL from Step 1*

5. **Deploy**
   - Click **"Deploy"**
   - Wait 2-3 minutes for build
   - Copy your Vercel URL: `https://overlap-ai-xxxx.vercel.app`

---

## Step 3: Update Backend PUBLIC_BASE_URL (1 minute)

1. **Go back to Render**
   - Navigate to your `overlap-ai-backend` service
   - Click **"Environment"** tab

2. **Update Variable**
   - Find `PUBLIC_BASE_URL`
   - Change value to: `https://overlap-ai-xxxx.vercel.app` (your Vercel URL)
   - Click **"Save Changes"**

3. **Wait for Redeploy**
   - Render will automatically redeploy (30 seconds)

---

## Step 4: Test Your Deployment (1 minute)

1. **Visit Your App**
   - Open: `https://overlap-ai-xxxx.vercel.app`

2. **Submit Test Video**
   - Paste: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
   - Enter any email
   - Click **"Generate Clips"**

3. **Verify Success**
   - Progress bar completes to 100%
   - 3 clips appear in grid
   - Videos play inline
   - Download buttons work

---

## ✅ You're Done!

**Frontend:** `https://overlap-ai-xxxx.vercel.app`
**Backend:** `https://overlap-ai-backend-xxxx.onrender.com/api/health`

---

## 🔧 Optional: Add Webhook Notifications

1. **Get Webhook URL**
   - Visit [webhook.site](https://webhook.site)
   - Copy your unique URL

2. **Add to Render**
   - Go to Render → Environment
   - Add variable: `N8N_WEBHOOK_URL=https://webhook.site/your-unique-id`
   - Save and redeploy

3. **Test**
   - Process a video
   - Check webhook.site for payload

---

## 📚 Need More Details?

See full deployment guide: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🆘 Troubleshooting

**Videos not playing?**
- Check that `PUBLIC_BASE_URL` on Render matches your Vercel URL exactly
- Verify `NEXT_PUBLIC_API_URL` on Vercel matches your Render URL

**50% stall at "Finding highlights"?**
- Verify `USE_GPT_HIGHLIGHTS=false` on Render

**"Job not found" error?**
- Check `JOB_TTL_MINUTES=120` on Render

**Backend taking 30+ seconds to respond first time?**
- Normal! Render free tier spins down after 15 mins inactivity
- Upgrade to Starter plan ($7/month) for always-on

---

## 🎉 Next Steps

- Process longer videos (10-20 minutes)
- Monitor Render logs for errors
- Set up custom domain on Vercel
- Enable email notifications (add SMTP credentials)
- Scale to paid plans for production traffic
