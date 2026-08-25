# PolyGlot Reader (React / Vite)

This is a web-based version of PolyGlot Reader, a multilingual book reader with translation, transliteration, and AI tutor features powered by Gemini.

## Features Preserved
- Multilingual library overview with filtering.
- Interactive reader with word translation/transliteration popups via Gemini API.
- Text-to-Speech (TTS) using Web Speech API (replaces Android TTS).
- Vocabulary building with "Mastered" toggles.
- AI Tutor chat for educational questions about context.

## Stack
- React 18
- Vite
- Express (Backend API)
- @google/genai (Gemini SDK)
- Tailwind CSS
- localforage (Storage)

## Getting Started
1. Run `npm install`
2. Add your Gemini API key to `.env` as `GEMINI_API_KEY=`
3. Run `npm run dev` to start the app.
