# AIFX Cast

![AIFX Cast Header](/public/aifx-cine-header.png)

A professional, high-fidelity cinematic storyboard synthesis suite powered by **Google Gemini 3 Flash** and the **Nano Banana 2** image engine. **AIFX Cast** transforms raw movie premises into technically precise, visually consistent, and logically paced storyboards.

## 🔥 Key Pillars

### 1. Nano Banana 2 Rendering
Unlike generic image generators, our specialized **Nano Banana 2** engine is tuned for cinematic 4-grid storyboards. It understands technical camera direction, lighting setups, and character continuity across sequential panels.

### 2. Narrative Intelligence (Gemini 3 Flash)
Leveraging the latest `gemini-3-flash-preview` via **Firebase Genkit**, the system doesn't just "write" scenes—it directs them. It manages pacing, determines the optimal number of scenes for an arc, and maintains strict character manifests.

### 3. Visual Continuity (AI Memory)
The engine utilizes a sophisticated context-injection system. Every new scene generated is aware of the previous scene's exported data, ensuring a coherent narrative flow from "Fade In" to "Fade Out."

## 🚀 Advanced Features

- **Character Enhancement**: Integrated with local ComfyUI to perform high-fidelity character detailing and upscaling on individual storyboard panels.
- **Interactive Storyboard Editor**: Fine-tune AI-generated panels, adjust cinematography notes, and refine master image prompts before rendering.
- **Scene-by-Scene Generation**: Precise control over the visual production line. Generate, review, and re-generate individual scenes until they match your vision.
- **Cinematic Review Stage**: A high-end gallery interface for reviewing 8K-ready 4-grid storyboards with technical optics and pacing data.
- **Professional Archival**: Export structured Markdown (`.md`) scripts and timestamped image archives (`/storyboard/YYYYMMDD-HHMM/`) for production use.
- **Micro-Animation UI**: A premium, "studio-online" interface designed with glassmorphism, dynamic transitions, and cinematic aesthetics.

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Framework** | Next.js 15 (App Router) |
| **AI Workflows** | Firebase Genkit |
| **LLM** | Google Gemini 3 Flash Preview |
| **Image Engine** | Nano Banana 2 (Gemini-based) |
| **Enhancement** | ComfyUI (Local API) |
| **Styling** | Tailwind CSS (Cinematic Dark Mode) |

## 🏗️ Getting Started

### 1. Environment Configuration
Copy the sample environment file and add your Google Gemini API key:
```bash
cp .env.sample .env
```
Edit `.env` and set your `GEMINI_API_KEY`.

### 2. ComfyUI Setup (Optional for Enhancements)
To use the **Enhance Character** feature, ensure you have a local ComfyUI instance running:
- **URL**: `http://localhost:8189`
- **Workflow**: Ensure the `z-i2i.json` workflow is present in your `public/` folder.

### 3. Installation
```bash
npm install
```

### 4. Launch the Studio
```bash
npm run dev
```
Navigate to `http://localhost:9002` (as configured in `package.json`) to enter the production suite.

## 🎬 Production Workflow

1. **Initialization**: Define your **Character Manifest** (names, ages, attire) and **Core Premise**.
2. **Cinematic Script**: The AI generates a multi-scene technical script. Review and edit the dialogue or camera directions.
3. **Visual Synthesis**: Head to the **Visual Production Studio** to generate 4-grid panels for each scene. 
4. **Cinematic Review**: Use the **AIFX Cast Cinema Review** stage to inspect your visuals in detail.
5. **Archive Export**: Batch-export your scenes to the filesystem for archival or sharing.

## 📁 Architecture

- `src/ai/flows/`: Logic for cinematic narrative and visual generation.
- `src/app/actions/`: Server actions for filesystem operations and context retrieval.
- `src/components/`: Premium UI components including the Custom Renderer and Visual Generator.
- `src/lib/`: Custom parsers for cinematic markup and serializing markdown.

---

© 2026 **AIFX Cine**. All Rights Reserved. Professional cinematography tools for the next generation of storytelling.
