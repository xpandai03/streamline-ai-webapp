# 🔴 CRITICAL: yt-dlp PATH Issue Debug Plan

**Date:** October 13, 2025
**Issue:** yt-dlp command fails with "not installed or not in PATH" despite being installed
**Impact:** Video clipping functionality completely broken

---

## 📊 Issue Summary

### **Symptom:**
When users submit a YouTube URL via the Vercel frontend, the job is created successfully on the Render backend, but immediately fails with:
```
"yt-dlp is not installed or not in PATH. Video download failed."
```

### **Expected Behavior:**
1. User submits YouTube URL
2. Backend downloads video with yt-dlp
3. Backend processes video (transcribe → detect highlights → create clips → add captions)
4. Frontend displays downloadable clips

### **Actual Behavior:**
1. ✅ User submits YouTube URL
2. ✅ Backend creates job (returns jobId)
3. ❌ Backend fails immediately at download stage
4. ❌ Frontend polls job status and displays error

---

## ✅ What We Know For Sure

### **1. yt-dlp IS Installed**
```bash
curl https://streamline-ai-webapp-backend.onrender.com/api/check-tools
```
**Response:**
```json
{
  "node": "v18.20.8",
  "ytdlp": "2025.09.26",  // ✅ CONFIRMED INSTALLED
  "ffmpeg": "ffmpeg version 4.3.9-0+deb11u1",
  "ffprobe": "ffprobe version 4.3.9-0+deb11u1",
  "platform": "linux",
  "arch": "x64"
}
```

### **2. Dockerfile Configuration**
```dockerfile
FROM node:18
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    pip3 install -U yt-dlp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
```
✅ Docker build logs show successful installation

### **3. The Paradox**
- ✅ `execSync('yt-dlp --version')` works (used by `/api/check-tools`)
- ❌ `execAsync('yt-dlp ...')` fails (used by actual video download)
- **This suggests a PATH environment difference between sync and async execution contexts**

---

## 🔍 Root Cause Analysis

### **Theory 1: PATH Environment Discrepancy** ⭐ MOST LIKELY
**Evidence:**
- `execSync()` uses Node's current process environment
- `execAsync()` spawns a new shell which may have different PATH
- pip3 installs yt-dlp to `/usr/local/bin` which might not be in subprocess PATH

**Why This Happens:**
- When Docker container starts, Node process inherits full PATH
- When `child_process.exec()` spawns shell, it gets minimal PATH (typically just `/usr/bin`)
- pip3-installed binaries are in `/usr/local/bin` which is NOT in minimal shell PATH

### **Theory 2: Shell Interpreter Differences**
**Evidence:**
- `execSync()` might use `/bin/sh` directly
- `execAsync()` spawns via shell which could be different (`/bin/bash` vs `/bin/sh`)
- Different shells have different PATH initialization

### **Theory 3: Permissions/Ownership Issue**
**Less Likely:** Docker container runs as root, no permission issues expected

### **Theory 4: Timing/Race Condition**
**Unlikely:** yt-dlp is installed at build time, not runtime

---

## 🛠️ What We've Attempted (Chronologically)

### **Attempt 1: Add PATH to exec options**
```javascript
execAsync(command, {
  env: { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin:/usr/bin` }
})
```
**Result:** ❌ Failed - PATH still not recognized in subprocess

### **Attempt 2: Use `which` to find absolute path at startup**
```javascript
YTDLP_PATH = execSync('which yt-dlp', { encoding: 'utf8' }).trim();
```
**Result:** ❌ Failed - `which` command itself may not find yt-dlp in subprocess context

### **Attempt 3: Try multiple hardcoded paths**
```javascript
const POSSIBLE_YTDLP_PATHS = [
  '/usr/local/bin/yt-dlp',
  '/usr/bin/yt-dlp',
  'yt-dlp'
];
```
**Result:** ❌ Still failing (current state)

---

## 🎯 All Possible Solutions (Ranked by Likelihood of Success)

### **Solution A: Use Python3 to invoke yt-dlp** ⭐⭐⭐⭐⭐
**Rationale:** Since pip3 installs yt-dlp as a Python module, we can invoke it via Python which is guaranteed to be in PATH

**Implementation:**
```javascript
const command = `python3 -m yt_dlp -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]" \
  --merge-output-format mp4 \
  --no-playlist \
  -o "${outputTemplate}" \
  "${youtubeUrl}"`;
```

**Why This Works:**
- `python3` is installed by apt-get → goes to `/usr/bin/python3` (always in PATH)
- yt-dlp module is installed in Python site-packages
- Python can find its own modules regardless of shell PATH

**Confidence:** 95%

---

### **Solution B: Add shebang shell script wrapper**
**Rationale:** Create a shell script that explicitly sets PATH before calling yt-dlp

**Implementation:**
Create `/usr/local/bin/yt-dlp-wrapper.sh`:
```bash
#!/bin/bash
export PATH=/usr/local/bin:/usr/bin:/bin
exec /usr/local/bin/yt-dlp "$@"
```

**Dockerfile addition:**
```dockerfile
RUN echo '#!/bin/bash\nexport PATH=/usr/local/bin:/usr/bin:/bin\nexec /usr/local/bin/yt-dlp "$@"' > /usr/local/bin/yt-dlp-wrapper.sh && \
    chmod +x /usr/local/bin/yt-dlp-wrapper.sh
```

**Confidence:** 70%

---

### **Solution C: Symlink yt-dlp to /usr/bin**
**Rationale:** Force yt-dlp into the guaranteed-to-be-in-PATH location

**Implementation:**
```dockerfile
RUN pip3 install -U yt-dlp && \
    ln -sf /usr/local/bin/yt-dlp /usr/bin/yt-dlp
```

**Why This Might Work:**
- `/usr/bin` is ALWAYS in even the most minimal PATH
- Symlink redirects to actual binary

**Confidence:** 80%

---

### **Solution D: Use shell script to find and execute**
**Rationale:** Dynamically find yt-dlp at execution time, not startup time

**Implementation:**
```javascript
const command = `
  YTDLP_PATH=$(command -v yt-dlp || which yt-dlp || find /usr -name yt-dlp 2>/dev/null | head -1)
  $YTDLP_PATH -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]" \
    --merge-output-format mp4 \
    --no-playlist \
    -o "${outputTemplate}" \
    "${youtubeUrl}"
`;
```

**Confidence:** 60%

---

### **Solution E: Install yt-dlp via apt instead of pip**
**Rationale:** System package managers install to standard locations

**Implementation:**
```dockerfile
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg yt-dlp && \
    apt-get clean
```

**Caveat:** Debian repos might have outdated yt-dlp version

**Confidence:** 50%

---

### **Solution F: Set global PATH in Dockerfile ENV**
**Rationale:** Set PATH at container level, not process level

**Implementation:**
```dockerfile
ENV PATH="/usr/local/bin:${PATH}"
```

**Why This Might Not Work:**
- ENV sets it for Docker, but subprocess might still ignore it
- Worth trying as it's a 1-line change

**Confidence:** 40%

---

### **Solution G: Use Node's spawn instead of exec**
**Rationale:** `spawn` gives more control over environment

**Implementation:**
```javascript
const { spawn } = require('child_process');

const proc = spawn(YTDLP_PATH, [
  '-f', 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
  '--merge-output-format', 'mp4',
  '--no-playlist',
  '-o', outputTemplate,
  youtubeUrl
], {
  env: { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin' }
});
```

**Confidence:** 65%

---

## 🧪 Diagnostic Tests to Run

### **Test 1: Log actual PATH in subprocess**
Add to downloader.js before yt-dlp command:
```javascript
const { stdout: pathOutput } = await execAsync('echo $PATH');
logger.info(`[DEBUG] Subprocess PATH: ${pathOutput}`);
```

### **Test 2: Test if python3 can find yt_dlp module**
```bash
curl -X POST https://streamline-ai-webapp-backend.onrender.com/api/process \
  -H "Content-Type: application/json" \
  -d '{"youtubeUrl":"https://youtube.com/watch?v=test","email":"test@test.com"}'
```
Then check Render logs for PATH output

### **Test 3: Try running command manually in Render shell**
Via Render dashboard shell:
```bash
node -e "const {exec} = require('child_process'); exec('yt-dlp --version', (e,o) => console.log(o || e))"
```

---

## 🚀 Recommended Action Plan (Step-by-Step)

### **IMMEDIATE (Next 10 minutes):**

**Step 1:** Implement Solution A (Python3 invocation)
- Change `yt-dlp` → `python3 -m yt_dlp`
- Commit and push
- Wait for Render deploy (2 min)
- Test

**If Step 1 Fails:**

**Step 2:** Implement Solution C (Symlink to /usr/bin)
- Update Dockerfile to add symlink
- Commit and push
- Wait for Render deploy (8 min - full Docker rebuild)
- Test

**If Step 2 Fails:**

**Step 3:** Add diagnostic logging (Test 1)
- Log actual PATH in subprocess
- Log output of `which yt-dlp` inside async execution
- Check Render logs to see what PATH actually is
- Adjust fix based on findings

---

## 📝 Expected Outcomes

### **If Solution A (Python) Works:**
- ✅ Jobs will complete successfully
- ✅ Video downloads will work
- ✅ Full pipeline will execute
- ⏱️ No performance impact (same underlying binary)

### **If All Solutions Fail:**
We need to escalate to Render support because this indicates a platform-level PATH issue that can't be fixed in application code.

---

## 🔗 Related Files

- `/server/modules/downloader.js` - Where yt-dlp is called
- `/server/Dockerfile` - Where yt-dlp is installed
- `/server/index.js` - Startup logging
- `render.yaml` - Render configuration

---

## 📊 Success Metrics

- [ ] `/api/check-tools` returns yt-dlp version (✅ ALREADY PASSING)
- [ ] Jobs reach "transcribe" stage (instead of failing at "download")
- [ ] Jobs complete with status "complete" and return clips
- [ ] Frontend displays downloadable clips

---

**Priority:** 🔴 CRITICAL
**Estimated Time to Fix:** 15-30 minutes (once correct solution identified)
**Blocker For:** All video clipping functionality
