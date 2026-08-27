const express = require("express");
const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(express.static("/app/public"));

app.post("/analyze", async (req, res) => {
  const { image, mimeType, prompt } = req.body;
  if (!image) return res.json({ error: "Ingen bilde mottatt" });
  try {
    const response = await fetch("http://172.20.30.115:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma4:e4b",
        stream: false,
        keep_alive: -1,
        messages: [{
          role: "user",
          content: prompt || "Beskriv hva du ser.",
          images: [image]
        }]
      })
    });
    const data = await response.json();
    console.log("Ollama svar:", JSON.stringify(data).slice(0, 300));
    const text = data.message?.content || "Ingen respons";
    res.json({ response: text });
  } catch (err) {
    console.error("Feil:", err.message);
    res.json({ error: err.message });
  }
});

app.post("/summarize", async (req, res) => {
  const { text, prompt } = req.body;
  if (!text) return res.json({ error: "Ingen tekst mottatt" });

  // Ollama/gemma4:e4b har begrenset kontekstvindu - kutt lang input for a unnga feil
  const MAX_CHARS = 12000;
  const trimmedText = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + "\n\n[...tekst kuttet]" : text;

  const fullPrompt = `${prompt || "Lag et kort sammendrag av folgende tekst."}\n\n${trimmedText}`;

  try {
    const response = await fetch("http://172.20.30.115:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma4:e4b",
        stream: false,
        keep_alive: -1,
        messages: [{
          role: "user",
          content: fullPrompt
        }]
      })
    });
    const data = await response.json();
    console.log("Ollama svar (summarize):", JSON.stringify(data).slice(0, 300));
    const summary = data.message?.content || "Ingen respons";
    res.json({ summary });
  } catch (err) {
    console.error("Feil (summarize):", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/generate", async (req, res) => {
  const { prompt, text, format } = req.body;
  if (!prompt) return res.json({ error: "Ingen prompt mottatt" });

  const MAX_CHARS = 12000;
  const trimmedText = text && text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + "\n\n[...tekst kuttet]" : text;
  const fullPrompt = trimmedText ? `${prompt}\n\n${trimmedText}` : prompt;

  try {
    const body = {
      model: "phi4-mini",
      stream: false,
      keep_alive: -1,
      messages: [{
        role: "user",
        content: fullPrompt
      }]
    };
    if (format === "json") body.format = "json";

    const response = await fetch("http://172.20.30.115:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    console.log("Ollama svar (generate/phi4-mini):", JSON.stringify(data).slice(0, 300));
    const result = data.message?.content || "Ingen respons";
    res.json({ response: result });
  } catch (err) {
    console.error("Feil (generate):", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server kjoerer paa port 3000"));
