import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

app.get("/", (req, res) => {
  res.json({ status: "NELA Backend is running" });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    aiConfigured: Boolean(ai)
  });
});

app.post("/chat", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "Gemini API key is not configured."
      });
    }

    const message = req.body.message;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "A valid message is required."
      });
    }

    const history = Array.isArray(req.body.history)
      ? req.body.history
      : [];

    const memory = req.body.memory || "";

    const conversation = history
      .slice(-15)
      .map((item) => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{
          text: String(item.content || item.text || "")
        }]
      }))
      .filter((item) => item.parts[0].text.trim());

    const systemInstruction =
      "You are NELA, a friendly and professional AI receptionist. " +
      "You help customers with appointments, bookings, changes and general questions. " +
      "Be polite, clear and concise. Respond in the same language as the customer. " +
      "Never claim that an appointment is confirmed unless the application has actually confirmed it. " +
      "Customer memory: " + String(memory);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...conversation,
        {
          role: "user",
          parts: [{ text: message }]
        }
      ],
      config: {
        systemInstruction
      }
    });

    res.json({
      answer: response.text || "I'm sorry, could you repeat that?"
    });

  } catch (error) {
    console.error("NELA AI error:", error);

    res.status(500).json({
      error: "NELA AI could not process your message."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("NELA Backend running on port " + PORT);
});
