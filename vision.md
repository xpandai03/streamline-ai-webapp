# 🎯 VISION — Overlap for YouTube

## Purpose  
Turn long-form YouTube videos into viral, captioned shorts — fully automated, cinematic, and creator-grade.  
Users paste a link, wait two minutes, and get 3–5 ready-to-post clips that feel handcrafted.

---

## North Star  
A single click turns *a podcast episode into five viral reels.*

The app must:
- **Understand context** — detect emotional or high-impact moments.  
- **Render beautifully** — with *yellow kinetic captions* (Financian-style) and crisp framing.  
- **Deliver instantly** — via email, no manual downloads.  
- **Feel premium** — like something made by a $100M media brand.

---

## User Story  
> “I paste a YouTube link, see a progress bar move through stages (Download → Transcribe → Analyze → Render → Deliver).  
> Two minutes later, I get an email with 5 TikTok-ready clips — perfectly captioned and framed.”

---

## What “Done” Means  
✅ YouTube link input →  
✅ Clips auto-generated with per-word kinetic captions →  
✅ Email with downloadable links →  
✅ Runs fully on Render, no external dependencies.

---

## Experience Principles  
- **Zero confusion:** One field, one button, one progress bar.  
- **Speed over polish:** MVP must render reliably before design flourishes.  
- **Trust through output:** first impression = “holy sh*t, this works.”  
- **Modular design:** Each function (download, transcribe, render, email) evolves independently.

---

## Differentiation  
Unlike other clipping tools:
- *Captions pop.* Cinematic and on-beat.  
- *Instant results.* No account creation, no queue.  
- *Smart highlights.* AI detects *viral tone*, not just silence gaps.  
- *Zero learning curve.* Anyone can use it.

---

## Guiding Philosophy  
**Build tools that compress creative time to zero.**  
Everything else is optional.

---

## Deliverable Definition  
**Output:**  
Five 9:16 vertical MP4s (8–20s)  
- yellow Impact-style captions  
- face-framed  
- high-contrast composition  
- delivered via email link  

**Performance Target:**  
From paste → delivery in under 2 minutes on Render free tier.

---

## Voice of Product  
Confident. Effortless. Feels like magic.  
The UI should look like a black stage where AI performs in silence.

---

## Prompting Alignment — CLEAR Framework  
All agentic reasoning and prompt design follow **CLEAR**:
- **Clarity** – explicit purpose, persona, and format  
- **Logic** – structured sequence  
- **Examples** – include few-shot cases when zero-shot fails  
- **Adaptation** – tailor by context and input  
- **Results** – produce measurable, deterministic outcomes  

When prompting sub-agents (highlight detection, caption synthesis), always frame:
- **Persona** → “You are a viral video editor trained to detect engaging hooks.”  
- **Task** → “Find 3–5 short highlights worth clipping.”  
- **Context** → “The source is a podcast or YouTube interview.”  
- **Format** → “Return results in strict JSON schema with start/end timestamps.”

---

## North Star Quote  
> “People shouldn’t edit clips — they should approve brilliance.”  