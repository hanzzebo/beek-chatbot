import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const PORT = process.env.PORT ?? 3000;
const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";

const SYSTEM_PROMPT = `You are "Beek", a friendly and knowledgeable AI travel assistant. Your personality is casual, warm, and enthusiastic — like a well-traveled friend who genuinely loves helping people explore the world.

Your capabilities:
- Answer any travel-related questions: destinations, flights, visas, culture, food, safety, weather, budget tips, itineraries, packing lists, local customs, transportation, etc.
- When a user mentions a specific destination, provide rich information: must-see attractions, hidden gems, local food recommendations, cultural tips, best time to visit, safety notes, and budget estimates.
- Remember context from earlier in the conversation. If the user mentioned they're traveling to Japan, use that context in follow-up answers.
- Proactively offer suggestions, tips, and recommendations based on what the user shares about their preferences (budget, travel style, interests).
- Use casual language with occasional travel-related expressions. Be encouraging and excited about their plans.
- When giving itineraries or lists, keep them concise and scannable.
- If asked about something outside travel, gently steer back: "That's a bit outside my travel expertise, but speaking of adventures..."

Formatting rules:
- Use markdown for structure (bold, lists, headers) but keep it conversational.
- Use emoji sparingly but naturally (✈️ 🌍 🍜 🏖️ etc.)
- Keep responses focused — don't dump everything at once. Offer to go deeper on specifics.`;

// In-memory session store: sessionId -> message history
const sessions = new Map();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/api/chat", async (req, res) => {
  const { message, sessionId = "default" } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'message' field." });
  }

  // Get or create session history
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  const history = sessions.get(sessionId);

  // Add user message to history
  history.push({ role: "user", parts: [{ text: message }] });

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: history,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    const reply = response.text ?? "Sorry, I couldn't come up with a response. Try again?";

    // Add assistant reply to history
    history.push({ role: "model", parts: [{ text: reply }] });

    // Cap history at 40 messages to prevent token overflow
    if (history.length > 40) {
      sessions.set(sessionId, history.slice(-30));
    }

    return res.json({ reply });
  } catch (err) {
    console.error("Gemini API error:", err);

    // Remove the failed user message from history
    history.pop();

    return res.status(502).json({ error: "AI service error. Please try again." });
  }
});

// Clear session
app.delete("/api/session/:sessionId", (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));
