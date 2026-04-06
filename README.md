<div align="center">

# 🎬 Vellum

### Free, Local-First Screen Recorder — No Cloud, No Signup, No Limits

**Record your screen, webcam, and audio — all processed 100% on your device.**

[✨ Try it live](https://vellum.vercel.app) · [🐛 Report Bug](https://github.com/henrynguyen6677/loomfx/issues) · [💡 Request Feature](https://github.com/henrynguyen6677/loomfx/issues)

---

</div>

## 🚀 Why Vellum?

Most screen recorders upload your videos to the cloud, require accounts, and charge monthly fees. **Vellum is different.**

| | Vellum | Loom (Free) | OBS Studio |
|---|:---:|:---:|:---:|
| **100% Local** | ✅ | ❌ Cloud-based | ✅ |
| **No Account Required** | ✅ | ❌ | ✅ |
| **Works in Browser** | ✅ | ✅ | ❌ Desktop app |
| **Webcam Overlay** | ✅ Circle bubble | ✅ | ✅ |
| **System Audio** | ✅ (Chromium) | ✅ | ✅ |
| **Open Source** | ✅ MIT | ❌ | ✅ |
| **No Upload Limit** | ✅ Unlimited | ❌ 5 min | ✅ |
| **Zero Install** | ✅ | ✅ | ❌ |

> **Your recordings never leave your machine.** No servers, no uploads, no data collection.

---

## ✨ Features

🖥️ **Screen Recording** — Capture any tab, window, or entire screen in up to 1080p

🎥 **Webcam Overlay** — Circle webcam bubble baked directly into your video, with adjustable position & size

🎙️ **Audio Capture** — Mix microphone + system audio seamlessly (system audio on Chromium)

⏸️ **Pause & Resume** — Take breaks during long recordings without creating multiple files

⌨️ **Keyboard Shortcuts** — `R` to record, `P` to pause, `S` to stop — no fumbling with buttons

⚙️ **Quality Presets** — Low / Medium / High — pick the right balance of size and clarity

🎨 **Minimal UI** — Glassmorphism design, dark mode, compact settings drawer

📱 **Responsive** — Works on desktop, tablet, and mobile viewports

🔒 **Privacy First** — Zero telemetry, zero analytics, zero server calls

---

## 🌐 Browser Support

| Browser | Screen Capture | System Audio | Webcam | Storage |
|---|:---:|:---:|:---:|---|
| **Chrome / Edge** | ✅ | ✅ | ✅ | File System API (direct to disk) |
| **Firefox** | ✅ | ❌ | ✅ | OPFS / IndexedDB |
| **Safari (macOS)** | ✅ | ❌ | ✅ | OPFS / IndexedDB |
| **Safari (iOS)** | ❌ | ❌ | ✅ | IndexedDB (camera-only) |

> **Note:** On macOS, you may need to grant Screen Recording permission in **System Settings → Privacy & Security → Screen Recording** for your browser.

---

## 🖼️ Preview

<div align="center">

| Main Interface | Settings Drawer |
|:---:|:---:|
| Clean, distraction-free recording UI | Compact, minimal settings with iOS-style toggles |

</div>

---

## 🏁 Quick Start

### Use Online (Recommended)

Just open **[vellum.vercel.app](https://vellum.vercel.app)** in Chrome or Edge. That's it.

### Run Locally

```bash
# Clone the repo
git clone https://github.com/henrynguyen6677/loomfx.git
cd loomfx

# Or use the new name
# git clone https://github.com/henrynguyen6677/vellum.git

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open `http://localhost:5173` and start recording.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | SvelteKit 5 (Svelte 5 Runes) |
| **Language** | TypeScript |
| **Styling** | CSS Variables Design System |
| **Screen Capture** | `getDisplayMedia` API |
| **Video Encoding** | `MediaRecorder` + Canvas Compositor |
| **Audio** | Web Audio API (`AudioContext` mixer) |
| **Storage** | File System API / OPFS / IndexedDB (auto-detect) |
| **Deployment** | Vercel (Static adapter) |
| **Testing** | Vitest |

---

## 📋 Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Screen     │     │   Webcam     │     │  Microphone  │
│ getDisplay   │     │ getUserMedia │     │ getUserMedia  │
│   Media      │     │              │     │              │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────────────────────┐     ┌──────────────────┐
│     Canvas Compositor        │     │   Audio Mixer     │
│  Screen + Webcam circle      │     │  Mic + System     │
└──────────────┬───────────────┘     └────────┬─────────┘
               │                              │
               ▼                              ▼
         ┌─────────────────────────────────────────┐
         │           MediaRecorder                  │
         │     Video (Canvas) + Audio (Mixed)       │
         └────────────────┬────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Storage Adapter     │
              │  FS API / OPFS / IDB  │
              └───────────┬───────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │   Download    │
                  └───────────────┘
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|:---:|---|
| `R` | Start recording |
| `P` | Pause / Resume |
| `S` | Stop recording |
| `W` | Toggle webcam |
| `M` | Toggle microphone |

---

## 🧪 Development

```bash
# Run tests
npm run test

# Type check
npm run check

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🗺️ Roadmap

- [x] Screen + webcam + audio recording
- [x] Canvas compositor (webcam baked into video)
- [x] Pause / Resume
- [x] Minimal settings drawer
- [x] Responsive design
- [x] Deploy to Vercel
- [x] Cross-browser support (Chrome, Firefox, Safari)
- [x] Multi-tier storage adapters (File System API / OPFS / IndexedDB)
- [x] macOS permission detection & guidance
- [ ] PWA support (offline + installable)
- [ ] WebCodecs encoding (better quality control)
- [x] Mobile camera-only recording (iOS Safari)
- [ ] Video trimming before download
- [ ] Custom recording area selection

---

## 📄 License

MIT — free for personal and commercial use.

---

<div align="center">

**Built with ❤️ for people who value privacy.**

[⬆ Back to top](#-vellum)

</div>
