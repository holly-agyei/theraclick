import { NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

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
    "- Keep responses short (2-4 paragraphs max). Be conversational.",
    "- You can discuss ANY topic the user brings up: academics, relationships, hobbies, life advice, fun questions, anything.",
    "- Match the user's energy. If they're casual, be casual. If they're serious, be thoughtful.",
    "- Ask follow-up questions to keep the conversation going.",
    "- Use simple, warm language. Avoid clinical or overly formal tone.",
    "- Do NOT use rigid headings or structured formats. Just talk.",
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
// Initialized once at module load so the client is reused across requests

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI | null {
  if (genAI) return genAI;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not set in .env.local — AI will use demo responses");
    return null;
  }
  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
}

// ── Gemini API call ───────────────────────────────────────────────

async function callGemini(messages: ChatMessage[], ctx?: UserContext): Promise<string | null> {
  const ai = getGenAI();
  if (!ai) return null;

  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  try {
    const model = ai.getGenerativeModel({
      model: modelName,
      systemInstruction: buildSystemPrompt(ctx),
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ],
    });

    // Build chat history, filtering out system messages
    const allMessages = messages
      .filter((m) => m.role !== "system")
      .slice(-30)
      .map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      }));

    // The last message is the one we send; everything before is history
    const lastMessage = allMessages.pop();
    if (!lastMessage) return null;

    // Gemini requires history to start with a "user" message — drop leading "model" entries
    const firstUserIdx = allMessages.findIndex((m) => m.role === "user");
    const history = firstUserIdx >= 0 ? allMessages.slice(firstUserIdx) : [];

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.parts);
    const responseText = result.response.text();

    return responseText?.trim() || null;
  } catch (err: any) {
    console.error(`Gemini [${modelName}] error:`, err?.message || err);
    return null;
  }
}

// ── Demo fallback ─────────────────────────────────────────────────

function demoResponse() {
  return "Hey, I'm here for you. Tell me what's on your mind — I'm listening.\n\n*(AI is running in demo mode — add your `GEMINI_API_KEY` to `.env.local` for full responses.)*";
}

// ── Generate a short title from conversation ─────────────────────

async function generateTitle(messages: ChatMessage[]): Promise<string | null> {
  const ai = getGenAI();
  if (!ai) return null;

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  try {
    const model = ai.getGenerativeModel({
      model: modelName,
      generationConfig: { temperature: 0.7, maxOutputTokens: 60 },
    });

    const convo = messages
      .filter((m) => m.role !== "system")
      .slice(0, 4)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const result = await model.generateContent(
      `Given this conversation, generate a short title (3-6 words max, no quotes, no punctuation at the end):\n\n${convo}`
    );

    const title = result.response.text()?.trim();
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

    // Title generation mode — lightweight call, no crisis check needed
    if (body.mode === "title") {
      const title = await generateTitle(messages);
      return NextResponse.json({ ok: true, title: title || "New chat" });
    }

    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    // Crisis detection takes priority over everything
    if (looksLikeCrisis(lastUser)) {
      return NextResponse.json({ ok: true, mode: "crisis", message: crisisResponse() });
    }

    // Primary: Gemini via official SDK
    const geminiText = await callGemini(messages, userContext);
    if (geminiText) {
      return NextResponse.json({ ok: true, mode: "gemini", message: geminiText });
    }

    // Fallback: structured demo response
    return NextResponse.json({ ok: true, mode: "demo", message: demoResponse() });
  } catch (e) {
    console.error("AI route error:", e);
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
