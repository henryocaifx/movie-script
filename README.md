# Cinematic Storyboard AI

Generate high-detail, logically paced cinematic storyboards using **Google Gemini 3 Flash**. This project leverages **Genkit** to expand basic movie ideas into professional multi-scene storyboards with consistent character details and technical cinematography.

## 🚀 Features

- **Gemini 3 Flash Powered**: Uses the latest `gemini-3-flash-preview` for intelligent scene expansion.
- **Cinematic Pacing**: Automatically determines the necessary number of scenes for a full story arc.
- **Visual Consistency**: Ensures character features and environments remain consistent across all panels.
- **Tech-Ready Prompts**: Generates specialized `IMAGE_PROMPT` strings optimized for 8k AI image generators.
- **Technical Cinematography**: Infuses visual descriptions with professional camera terms (dolly zoom, dutch angle, anamorphic, etc.).

## 🛠️ Tech Stack

- **Framework**: [Genkit](https://firebase.google.com/docs/genkit)
- **Model**: Google Gemini 3 Flash Preview
- **Language**: TypeScript
- **Environment**: Next.js (Server Actions)

## 🏃 Getting Started

### 1. Environment Setup
Create a `.env` file in the root directory and add your Gemini API Key:
```env
GEMINI_API_KEY=your_api_key_here
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

## 🎬 How it Works

The core logic resides in `src/ai/flows/generate-cinematic-storyboard.ts`. It takes two main inputs:
1. **Characters Description**: Detail the protagonists, their traits, and appearance.
2. **Movie Idea**: A brief premise or plot point.

The AI then generates a structured output for multiple scenes, each containing:
- **SCENE_START**: Scene number and context.
- **4-Grid Layout**: Detailed visual descriptions for four distinct panels.
- **IMAGE_PROMPT**: A unified paragraph for generating a cohesive 4-grid storyboard image.
- **SCENE_END**: Clear markers for programmatic parsing.

## 📁 Project Structure

- `src/ai/genkit.ts`: Centralized Genkit configuration and model selection.
- `src/ai/flows/`: AI workflows for storyboard generation.
- `src/ai/dev.ts`: Development entry point for Genkit testing.
