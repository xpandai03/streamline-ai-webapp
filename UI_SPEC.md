# 🖥️ UI_SPEC.md — Vibe-Coded Interface Guide

## Overview  
The interface should feel **instant, cinematic, and minimal** — like a high-end AI lab tool, not a SaaS dashboard.  
One screen, one field, one button, one progress bar. The UI’s job is to get out of the way and let the magic show.

---

## 🎨 Visual Direction  
**Core Palette:**  
- Background: `#000000` (pure black)  
- Accent: `#FFD600` (Financian yellow)  
- Text: `#FFFFFF` (pure white)  
- Secondary text: `#BFBFBF` (muted gray)  

**Typography:**  
- Primary font: *Inter* or *Satoshi* (bold, geometric, confident)  
- Title weight: 700  
- Body weight: 400  
- Letter spacing: -1%  

**Overall vibe:**  
Cinematic → Modern → Effortless  
Imagine OpenAI’s Playground meets the Nike SNKRS app.

---

## 🧭 Layout (v1 MVP)

| Section | Description |
|----------|--------------|
| **Header** | Logo (text-based “Overlap”) — small, top-left |
| **Main Input** | Large centered YouTube input field (placeholder: “Paste a YouTube link…”) |
| **Action Button** | Bright yellow “Generate Clips” button (centered, rounded-xl, subtle glow) |
| **Progress Bar** | Thin white or yellow progress indicator beneath the button |
| **Status Console** | Displays step-by-step updates: “Downloading video…”, “Transcribing…”, etc. |
| **Result Preview (post-process)** | Thumbnail grid of generated clips (3–5) with “Download” and “Share” buttons |
| **Footer** | “Powered by Overlap AI” text in muted gray, small size |

---

## ⚡ UX Flow

1. **Landing State**
   - Simple black screen  
   - One-liner tagline:  
     > “Paste a YouTube link. Get viral clips in minutes.”  
   - Input + button centered vertically

2. **Processing State**
   - Progress bar animates from left to right  
   - Status console updates live:  
     - “Downloading video…”  
     - “Extracting audio…”  
     - “Finding highlights…”  
     - “Rendering captions…”  
     - “Emailing results…”  

3. **Result State**
   - Fades in 3–5 thumbnails  
   - Buttons:  
     - “📩 Send to Email”  
     - “⬇️ Download All”  
   - Subtext: “We also sent your clips via email.”

---

## 🎬 Motion & Feel
- Use **Framer Motion** for soft fades and slide-ins  
- Progress bar should glide, not jump  
- Captions and buttons should “breathe” — micro delay of 150ms between state changes  
- No loaders, no spinning wheels — *linear flow only*

---

## 💬 Copywriting
Keep all microcopy tight and human:
- “Generating highlights…”  
- “Finding the good parts…”  
- “Almost done — adding captions.”  
- “Email sent. Check your inbox 📬”

The tone = confident, calm, cinematic.  
No exclamation marks. No “AI magic” fluff.

---

## 🔊 Sound (Optional Future)
- Subtle confirmation sound when clips finish processing  
- Short fade-in/fade-out background hum (like an engine warming up)  

---

## 🔒 Accessibility
- Tab navigation for input and buttons  
- Screen reader tags for progress stages  
- Ensure yellow (#FFD600) meets contrast ratio on black  

---

## 🧠 Claude Instruction
When generating or modifying UI components:
- Do *not* add unnecessary pages or settings.  
- Respect the **one-screen experience.**  
- Keep everything centered and vertically balanced.  
- Use Tailwind CSS with dark minimal styling (`bg-black`, `text-white`, `text-[#FFD600]`).  
- If uncertain about design decisions, default to *simplicity over cleverness.*

---

## Quote for Design Context  
> “It should feel like Apple built an AI lab tool for YouTubers.”  