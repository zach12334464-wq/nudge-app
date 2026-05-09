// js/ai.js — Groq (Llama 3.3) powered Nudge AI with Gemini fallback
const GROQ_MODEL = "llama-3.3-70b-versatile";

function getGroqKey() {
  return localStorage.getItem("nudge_groq_key") || "";
}

function setGroqKey(key) {
  if (key) {
    localStorage.setItem("nudge_groq_key", key);
  } else {
    localStorage.removeItem("nudge_groq_key");
  }
}

function getGeminiKey() {
  return localStorage.getItem("nudge_gemini_key") || "";
}

function setGeminiKey(key) {
  if (key) {
    localStorage.setItem("nudge_gemini_key", key);
  } else {
    localStorage.removeItem("nudge_gemini_key");
  }
}

// Kept for backwards compatibility
function getOpenAIKey() {
  return getGroqKey() || getGeminiKey();
}

function setOpenAIKey(key) {
  setGroqKey(key);
}

// Core AI function — branded as "Nudge AI" to users
// Tries Groq first, falls back to Gemini
async function askGemini(command, workspaceContext = {}) {
  const groqKey = getGroqKey();
  const geminiKey = getGeminiKey();

  // Try Groq first
  if (groqKey) {
    try {
      return await askGroq(command, workspaceContext, groqKey);
    } catch (error) {
      console.warn("Groq call failed, trying Gemini fallback.", error);
    }
  }

  // Fall back to Gemini
  if (geminiKey) {
    try {
      return await askGeminiApi(command, workspaceContext, geminiKey);
    } catch (error) {
      console.warn("Gemini call failed, using local response.", error);
    }
  }

  // No keys available, use local fallback
  return makeLocalAiResponse(command, workspaceContext);
}

// Groq API call with llama-3.3-70b-versatile
async function askGroq(command, workspaceContext = {}, apiKey) {
  const systemPrompt = [
    "You are Nudge, an approval-first AI work assistant for businesses.",
    "Never claim you sent an email or created a calendar event. You only prepare work for approval.",
    "Return a concise professional response with the prepared action and the next approval step.",
    `Workspace context: ${JSON.stringify(workspaceContext)}`
  ].join("\n\n");

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: command }],
      max_tokens: 800,
      temperature: 0.7
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Groq error (${res.status}): ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || makeLocalAiResponse(command, workspaceContext);
}

// Gemini API fallback
async function askGeminiApi(command, workspaceContext = {}, apiKey) {
  const systemPrompt = [
    "You are Nudge, an approval-first AI work assistant for businesses.",
    "Never claim you sent an email or created a calendar event. You only prepare work for approval.",
    "Return a concise professional response with the prepared action and the next approval step.",
    `Workspace context: ${JSON.stringify(workspaceContext)}`
  ].join("\n\n");

  const response = await fetch("https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=" + apiKey, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt + "\n\nUser: " + command }] }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini error (${response.status}): ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || makeLocalAiResponse(command, workspaceContext);
}

function makeLocalAiResponse(command, workspaceContext = {}) {
  const normalized = command.toLowerCase();
  const pending = workspaceContext.pendingActions || 0;

  if (normalized.includes("schedule") || normalized.includes("calendar") || normalized.includes("meeting")) {
    return "I prepared a schedule proposal and left it in the approval queue. Review the time block before Nudge writes to any connected calendar.";
  }
  if (normalized.includes("draft") || normalized.includes("reply") || normalized.includes("email")) {
    return "I prepared a concise business reply and held it for approval. No email will be sent until you approve the action.";
  }
  if (normalized.includes("summarize") || normalized.includes("summary") || normalized.includes("brief")) {
    return `I summarized the priority inbox and found ${pending} approval items that still need a decision.`;
  }
  return "I prepared the requested work as an approval item. Review it before Nudge touches email, calendar, or task state.";
}
