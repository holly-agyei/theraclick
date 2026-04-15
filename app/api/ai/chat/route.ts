import { NextResponse } from "next/server";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type UserContext = {
  role?: "student" | "peer-mentor" | "counselor";
  displayName?: string;
  school?: string;
  educationLevel?: string;
  country?: string;
};

// ── Crisis detection ──────────────────────────────────────────────

const CRISIS_PATTERNS: RegExp[] = [
  /\bkill myself\b/i,
  /\bsuicide\b/i,
  /\bend my life\b/i,
  /\bwant to die\b/i,
  /\bself[-\s]?harm\b/i,
  /\bhurt myself\b/i,
  /\boverdose\b/i,
];

function looksLikeCrisis(text: string) {
  return CRISIS_PATTERNS.some((re) => re.test(text));
}

function crisisResponse() {
  return [
    "I'm really sorry you're feeling this way — you don't have to carry it alone.",
    "",
    "If you're in immediate danger or feel like you might hurt yourself, please call your local emergency number **right now** or go to the nearest emergency room.",
    "",
    "If you can, tell me: **Are you safe right now?** (Yes / Not sure / No)",
    "",
    "If you'd like, we can take one small step together: can you move to a safer place, and reach out to someone you trust (a friend, roommate, family member, or campus support) to stay with you?",
  ].join("\n");
}

// ── System prompt ─────────────────────────────────────────────────

function buildSystemPrompt(ctx?: UserContext) {
  const who =
    ctx?.role === "student"
      ? "a student"
      : ctx?.role === "peer-mentor"
        ? "a peer mentor"
        : ctx?.role === "counselor"
          ? "a counselor"
          : "a user";

  const personalization = [
    "- Do NOT address the user by name. Just say 'you' or 'hey'.",
    ctx?.school ? `- School: ${ctx.school}` : null,
    ctx?.educationLevel ? `- Education level: ${ctx.educationLevel}` : null,
    ctx?.country ? `- Country context: ${ctx.country}` : "- Country context: Ghana (default)",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "You are Theraklick AI — a warm, empathetic support companion for students in Africa (starting Ghana).",
    `You are talking to ${who}.`,
    personalization ? `\nContext (do NOT ask for more identity info):\n${personalization}\n` : "",
    "How to respond:",
    "- Talk naturally, like a caring friend — not a form or template.",
    "- Keep responses short: 2-4 SHORT paragraphs max. Each paragraph should be 1-2 sentences.",
    "- IMPORTANT: Put a blank line between every paragraph/thought. Never write 4+ sentences in one block.",
    "- You can discuss ANY topic the user brings up: academics, relationships, hobbies, life advice, fun questions, anything.",
    "- Match the user's energy. If they're casual, be casual. If they're serious, be thoughtful.",
    "- Ask ONE follow-up question at the end to keep the conversation going. Don't ask multiple questions.",
    "- Use simple, warm language. Avoid clinical or overly formal tone.",
    "- Do NOT use rigid headings, numbered lists, or structured formats. Just talk naturally.",
    "- Never start a response with 'I understand' or 'I hear you'. Vary your openings.",
    "",
    "Boundaries:",
    "- You are not a therapist or doctor. Be honest about your limitations when relevant.",
    "- Anonymity-first: never ask for full names, phone numbers, or contact details.",
    "- If the conversation naturally turns to something heavy, gently suggest they could also talk to a peer mentor or counselor on the app.",
    "",
    "Safety:",
    "- If the user expresses self-harm/suicide intent: take it seriously, ask if they are safe, encourage contacting emergency services or a trusted person nearby.",
  ].join("\n");
}

// ── Gemini SDK singleton ──────────────────────────────────────────

let genAI: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (genAI) return genAI;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not set — AI will use demo responses");
    return null;
  }
  genAI = new GoogleGenAI({ apiKey });
  return genAI;
}

// ── Gemini API call ───────────────────────────────────────────────

const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

async function callGemini(messages: ChatMessage[], ctx?: UserContext): Promise<string | null> {
  const ai = getGenAI();
  if (!ai) return null;

  const primaryModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const modelsToTry = [primaryModel, ...FALLBACK_MODELS.filter((m) => m !== primaryModel)];

  const systemInstruction = buildSystemPrompt(ctx);

  const contents = messages
    .filter((m) => m.role !== "system")
    .slice(-30)
    .map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));

  const firstUserIdx = contents.findIndex((m) => m.role === "user");
  const trimmed = firstUserIdx >= 0 ? contents.slice(firstUserIdx) : contents;

  for (const modelName of modelsToTry) {
    const maxRetries = modelName === primaryModel ? 2 : 1;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * attempt));

        const response = await ai.models.generateContent({
          model: modelName,
          contents: trimmed,
          config: {
            systemInstruction,
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 2048,
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            ],
          },
        });

        const responseText = response.text;
        if (responseText?.trim()) return responseText.trim();
      } catch (err: any) {
        const status = err?.status || err?.httpStatusCode;
        const isRetryable = status === 503 || status === 429;
        console.error(`Gemini [${modelName}] attempt ${attempt + 1} error:`, err?.message || err);
        if (!isRetryable) break;
      }
    }
  }

  return null;
}

// ── Demo fallback ─────────────────────────────────────────────────

function demoResponse() {
  return "Hey, I'm here for you. Tell me what's on your mind — I'm listening.\n\n*(AI is in demo mode until `GEMINI_API_KEY` is configured on the server.)*";
}

// ── Generate a short title from conversation ─────────────────────

async function generateTitle(messages: ChatMessage[]): Promise<string | null> {
  const ai = getGenAI();
  if (!ai) return null;

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  try {
    const convo = messages
      .filter((m) => m.role !== "system")
      .slice(0, 4)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Given this conversation, generate a short title (3-6 words max, no quotes, no punctuation at the end):\n\n${convo}`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 60,
      },
    });

    const title = response.text?.trim();
    return title || null;
  } catch (err: any) {
    console.error("Title generation error:", err?.message || err);
    return null;
  }
}

// ── POST handler ──────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: ChatMessage[]; userContext?: UserContext; mode?: "chat" | "title" };
    const messages = body.messages ?? [];
    const userContext = body.userContext;

    if (body.mode === "title") {
      const title = await generateTitle(messages);
      return NextResponse.json({ ok: true, title: title || "New chat" });
    }

    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    if (looksLikeCrisis(lastUser)) {
      return NextResponse.json({ ok: true, mode: "crisis", message: crisisResponse() });
    }

    const geminiText = await callGemini(messages, userContext);
    if (geminiText) {
      return NextResponse.json({ ok: true, mode: "gemini", message: geminiText });
    }

    return NextResponse.json({ ok: true, mode: "demo", message: demoResponse() });
  } catch (e) {
    console.error("AI route error:", e);
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
