# ✨ MP4 to Animation Studio ✨

![Hero Image](./src/assets/hero.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![In-Browser](https://img.shields.io/badge/Privacy-100%25_In--Browser-darkgreen.svg)]()
[![Built with FFmpeg.wasm](https://img.shields.io/badge/Engine-FFmpeg.wasm-blue.svg)]()

> High-definition GIF and WebP conversion, powered by WebAssembly. **No server uploads. Total privacy. Maximum fidelity.**

---

## 📽️ The Professional Experience

**MP4 to Animation** is a premium, client-side video converter designed for creators who demand high-quality results without compromising privacy. Traditional GIF makers often compress your data on remote servers; we bring the entire encoding engine directly to your browser.

- **Precision (HD)**: Multi-pass palette generation with `sierra2_4a` dithering for near-perfect color reproduction.
- **WebP Support**: High-efficiency animations with adjustable compression levels (`q:v` and `compression_level`).
- **Precision Controls**: Frame rates up to 60 FPS and intelligent scaling up to 1080px.

---

## 🚀 Key Features

- 💎 **High-Fidelity Encoding**: Uses advanced `ffmpeg` filters like `palettegen` and `paletteuse` with lanczos scaling.
- 🔒 **Privacy First**: 100% client-side processing using WebAssembly (FFmpeg.wasm). Your videos never leave your machine.
- 🎨 **Premium UI**: Modern glassmorphism design with fluid animations (Framer Motion) and real-time conversion feedback.
- 🛠️ **Custom Presets**:
    - **Precision**: Multi-pass high-quality encoding.
    - **Balanced**: Optimal size vs. quality (Bayer dithering).
    - **Fast**: Quick conversion for drafts.
- 📉 **Optimized Output**: Automatic palette optimization to keep file sizes manageable while maintaining visual depth.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Core Engine**: [FFmpeg.wasm](https://ffmpegwasm.netlify.app/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Styling**: Modern CSS Variables & Glassmorphism

---

## 🛠️ Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- A modern browser with **SharedArrayBuffer** support (Chrome/Edge/Firefox) for multi-threaded FFmpeg.

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/mp4-to-animation.git
   cd mp4-to-animation
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Ignite the development engine:**
   ```bash
   npm run dev
   ```

4. **Visit the Studio:**
   Open `http://localhost:5173` in your browser.

---

## 🧪 How it Works

The application leverages `FFmpeg.wasm` to run the powerful FFmpeg toolkit inside a WebWorker. 

### GIF Pipeline
1. **Palette Generation**: We analyze the input frames to create a custom 256-color (or 224-color in Balanced mode) palette optimized for that specific video.
2. **Dithering & Mapping**: We use `paletteuse` with advanced dithering algorithms to simulate higher color depth and reduce banding.

### WebP Pipeline
We utilize `libwebp` encoding with adjustable quality presets, providing a modern alternative to GIF with significantly better compression and quality.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

