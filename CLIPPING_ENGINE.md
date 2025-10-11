# 🎞️ CLIPPING_ENGINE.md --- Highlight & Caption Intelligence

## Overview
This is the brain of the app --- the **Clipping Engine**.
It transforms raw transcription data into cinematic short clips by identifying *emotionally charged*, *contextually rich*, and *visually cohesive* moments worth watching.

The goal isn't just to find "soundbites."
It's to find the *moments that make people stop scrolling.*

---

## 🧠 Core Pipeline
```

Transcript JSON → GPT Highlight Selector → Clip Timestamps → FFmpeg Cutter → Caption Generator

```
---

## 🧩 Stages

### 1. Transcript Input
Each transcript chunk from Whisper arrives as JSON:

```json
[
  { "start": 12.3, "end": 18.9, "text": "So here's the crazy thing about this market..." },
  { "start": 19.0, "end": 23.5, "text": "Nobody actually understands why it works." }
]
```

Each word also has millisecond timestamps for kinetic captioning.

* * * * *

### **2\. GPT Highlight Detection**

Claude or GPT-4o-mini analyzes transcript text to identify the *most viral*, *emotionally strong*, or *controversial* moments.

**Prompt Persona:**

> You are a viral video editor trained to find emotional, quotable, and high-engagement moments from long-form content.

**Prompt Task:**

> Select 3--5 highlight segments (8--20 seconds each) from the transcript that are likely to perform well on TikTok, Reels, and Shorts.

**Prompt Format:**

> Return in JSON:

> { "clips": [ { "start": 112.0, "end": 125.5, "caption": "text here" } ] }

**Scoring Heuristics:**

-   Emotional tone ("crazy", "amazing", "insane", "never", "always")

-   Hooks and suspense ("you won't believe", "the truth is", "here's what nobody tells you")

-   Reactions or laughter cues

-   Shift in energy or delivery speed

-   Mentions of lists or numbered advice ("3 things I learned...")

If confidence < 0.6 → fallback to **Viral Word Scoring** algorithm.

* * * * *

### **3\. Fallback: Viral Word Scoring**

A backup system that scores transcript lines (0--10 scale) based on presence of *hook words*, *emotion*, and *pattern repetition.*

|

**Type**

 |

**Keywords**

 |

**Score**

 |
| --- | --- | --- |
|

Emotional

 |

amazing, insane, literally

 |

+0.8

 |
|

Controversial

 |

banned, secret, exposed

 |

+1.2

 |
|

Reaction

 |

wow, wait, omg, haha

 |

+1.5

 |
|

Opinionated

 |

always, never, worst, best

 |

+1

 |
|

Hook

 |

here's why, you won't believe, the truth is

 |

+1.5

 |

When a section ≥ 7.0 → mark as highlight, merge nearby ones (≤10s apart).

* * * * *

### **4\. Smart Clipping**

Use FFmpeg to cut and crop each highlight:

```
ffmpeg -ss {start} -to {end} -i input.mp4\
-vf "scale=1080:1920:force_original_aspect_ratio=decrease,crop=1080:1920,setsar=1"\
-c:v libx264 -preset fast -an output_{id}.mp4
```

Each clip is vertical, centered, and adjusted for face placement when possible.

* * * * *

### **5\. Kinetic Caption Generation**

#### **Caption Style:**

-   Font: **Impact Bold** or **Arial Black**

-   Color: **#FFD600** (yellow)

-   Outline: Black border + subtle shadow

-   Size: ~4% of frame height

-   Alignment: Center, 60% up from bottom

#### **Animation Logic:**

Each word fades in/out individually using Whisper's word timestamps:

-   150ms fade-in

-   100ms fade-out

-   50ms gap between words

-   No overlap between lines

Generated via drawtext filters dynamically constructed from SRT.

* * * * *

**💬 Prompting Framework (CLEAR)**
----------------------------------

|

**Stage**

 |

**CLEAR Application**

 |
| --- | --- |
|

Persona

 |

"You are a viral clip editor..."

 |
|

Logic

 |

Sequential flow: transcript → highlight → caption

 |
|

Examples

 |

Few-shot references for tone/style

 |
|

Adaptation

 |

Adjust scoring for topic domain (e.g. finance vs motivation)

 |
|

Results

 |

Consistent 3--5 usable clips per video

 |

* * * * *

**⚙️ Configuration Variables**
------------------------------

|

**Variable**

 |

**Description**

 |

**Default**

 |
| --- | --- | --- |
|

NUM_CLIPS

 |

Number of highlights to extract

 |

5

 |
|

CLIP_LENGTH_MIN

 |

Minimum clip duration (sec)

 |

8

 |
|

CLIP_LENGTH_MAX

 |

Maximum clip duration (sec)

 |

20

 |
|

CAPTION_COLOR

 |

Primary text color

 |

#FFD600

 |
|

CAPTION_FONT

 |

Font used in drawtext

 |

Impact

 |
|

USE_GPT

 |

Use GPT detection (true/false)

 |

true

 |

* * * * *

**🧩 Claude Instruction**
-------------------------

When implementing or modifying this module:

-   Keep **highlight detection** and **caption generation** independent.

-   Write clean JSON outputs with start/end times (no plain text).

-   If Whisper returns empty segments, retry GPT call.

-   Handle bad transcripts gracefully --- skip, don't crash.

-   Allow developers to swap AI model via .env variable.

* * * * *

**🧠 Future Upgrades**
----------------------

-   Face tracking → auto-align crop with eyes

-   Emotion scoring → integrate vad-score or sentiment API

-   Caption style variants (MrBeast, Alex Hormozi, FinanceTok)

-   Fine-tune highlight detection using real engagement data

* * * * *

**Guiding Quote**
-----------------

> "The difference between noise and virality is timing.

> Our AI edits with rhythm."