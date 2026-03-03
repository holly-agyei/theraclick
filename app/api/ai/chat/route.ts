import { NextResponse } from "next/server";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type UserContext = {
  role?: "student" | "peer-mentor" | "counselor";
  displayName?: string; // e.g., anonymousId (never real identity)
  school?: string;
  educationLevel?: string;
  country?: string;
};

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
    "I’m really sorry you’re feeling this way — you don’t have to carry it alone.",
    "",
    "If you’re in immediate danger or feel like you might hurt yourself, please call your local emergency number **right now** or go to the nearest emergency room.",
    "",
    "If you can, tell me: **Are you safe right now?** (Yes / Not sure / No)",
    "",
    "If you’d like, we can take one small step together: can you move to a safer place, and reach out to someone you trust (a friend, roommate, family member, or campus support) to stay with you?",
  ].join("\n");
}

function demoResponse() {
  return "Hey, I'm here. Tell me what's on your mind — no pressure, just whatever feels right to share.";
}

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
    ctx?.displayName ? `- The user prefers to be addressed as: ${ctx.displayName}` : null,
    ctx?.school ? `- School: ${ctx.school}` : null,
    ctx?.educationLevel ? `- Education level: ${ctx.educationLevel}` : null,
    ctx?.country ? `- Country context: ${ctx.country}` : " - Country context: Ghana (default)",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "You are Theraklick AI — a warm, real, conversational support companion for students in Africa (starting Ghana).",
    "",
    `You are talking to ${who}.`,
    personalization ? `\nContext about this person (do NOT ask for more identity info):\n${personalization}\n` : "",
    "",
    "STRICT FORMAT RULES (you MUST follow these):",
    "- Write ONLY plain text. No markdown whatsoever. No bold (**), no italics (*), no headings (#), no bullet points (-), no numbered lists, no emojis.",
    "- Write like a WhatsApp message from a friend. Short, casual, warm.",
    "- MATCH YOUR RESPONSE LENGTH TO THE USER'S MESSAGE:",
    "  - If they say 1-3 words (like 'oh', 'hmm', 'okay', 'yeah'): reply with 1-2 sentences MAX. Just acknowledge and ask one thing.",
    "  - If they ask a simple question: 2-3 sentences.",
    "  - If they share something detailed or ask for advice: up to 4-5 sentences, but no more.",
    "- NEVER write more than 5 sentences regardless of the topic.",
    "- Use line breaks between thoughts, like natural texting.",
    "- NEVER format things as lists or structured content.",
    "- If recommending something (a book, technique, etc.), mention ONE thing, not a list.",
    "",
    "HOW TO TALK:",
    "- Talk like a caring, emotionally intelligent friend. Not a therapist, not a robot, not a teacher.",
    "- Remember what was said earlier in the conversation. Reference it naturally.",
    "- React genuinely. If something is funny, be light. If heavy, match the weight.",
    "- Ask ONE follow-up question that shows you're actually listening.",
    "- Use simple, warm language. No therapy-speak ('I hear you', 'let's unpack that', 'that must be hard').",
    "- It's okay to share a gentle opinion when relevant.",
    "",
    "WHAT NOT TO DO:",
    "- NEVER use bold, italics, headings, bullet points, or any formatting.",
    "- NEVER give long responses. If your response is more than 5 sentences, you're doing it wrong.",
    "- Don't list multiple options or recommendations. Pick ONE and explain briefly.",
    "- Don't repeat what they said back to them.",
    "- Don't lecture or monologue.",
    "- Never ask for personal identity info (full name, phone, address).",
    "",
    "IMPORTANT BOUNDARIES:",
    "- You're not a therapist or doctor. Be honest about that if asked.",
    "- If things feel big, gently suggest they talk to a peer mentor or counselor on the platform.",
    "- If they express self-harm/suicide intent: take it seriously, ask if they're safe right now, encourage calling emergency services or going to the nearest ER, and suggest reaching a trusted person.",
    "",
    "/no_think",
  ]
    .filter((s) => s !== "")
    .join("\n");
}

/**
 * Strip <think>...</think> blocks from model output.
 * Qwen3 models wrap internal reasoning in these tags.
 * Handles: paired tags, unclosed tags, and partial tags.
 */
function stripThinkingTags(text: string): string {
  // 1. Strip paired <think>...</think> blocks
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "");

  // 2. If there's still an unclosed <think> (no closing tag),
  //    take only the content AFTER the thinking block.
  //    If no content after, the model only output thinking — return empty.
  if (cleaned.includes("<think>")) {
    // Everything before <think> + nothing after = model only thought
    const idx = cleaned.indexOf("<think>");
    const before = cleaned.substring(0, idx).trim();
    // There's no </think>, so everything after <think> is thinking
    cleaned = before;
  }

  // 3. Strip stray </think> tags
  cleaned = cleaned.replace(/<\/think>/g, "").trim();

  return cleaned;
}

/**
 * Strip markdown formatting so messages display as clean plain text
 * in chat bubbles. Removes bold, italic, headings, bullet points, etc.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, "")          // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")    // bold **text** (paired)
    .replace(/\*(.+?)\*/g, "$1")        // italic *text* (paired)
    .replace(/__(.+?)__/g, "$1")        // bold __text__
    .replace(/_(.+?)_/g, "$1")          // italic _text_
    .replace(/\*\*/g, "")               // stray ** (unmatched/leftover)
    .replace(/^[-*+•]\s+/gm, "")         // strip bullet points entirely
    .replace(/^\d+\.\s+/gm, "")         // numbered lists
    .replace(/```[\s\S]*?```/g, "")     // code blocks
    .replace(/`(.+?)`/g, "$1")          // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links [text](url) → text
    .replace(/\n{3,}/g, "\n\n")         // collapse extra newlines
    .trim();
}

/**
 * Call Groq API (OpenAI-compatible, very fast inference).
 * Default: qwen/qwen3-32b — strong reasoning, fast on Groq hardware.
 */
async function callGroq(messages: ChatMessage[], ctx?: UserContext) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.log("Groq: No API key configured");
    return null;
  }

  const model = process.env.GROQ_MODEL || "qwen/qwen3-32b";
  const system: ChatMessage = { role: "system", content: buildSystemPrompt(ctx) };

  console.log(`Groq: Using model ${model}`);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [system, ...messages].slice(-40),
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Groq error:", res.status, errorText);
      return null;
    }

    const data = (await res.json()) as any;
    let content = data?.choices?.[0]?.message?.content;

    // Clean up: strip thinking blocks, then any markdown formatting
    if (typeof content === "string") {
      content = stripMarkdown(stripThinkingTags(content));
    }

    // If stripping left nothing (model only output thinking), return null → fallback
    if (!content || !content.trim()) {
      console.warn("Groq: Response was only thinking tags, no actual content");
      return null;
    }

    console.log("Groq: Response received successfully");
    return content;
  } catch (err) {
    console.error("Groq fetch error:", err);
    return null;
  }
}

/**
 * Call Gemini API (Google AI). Used as fallback if Groq is down.
 */
async function callGemini(messages: ChatMessage[], ctx?: UserContext) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("Gemini: No API key configured");
    return null;
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }))
    .slice(-40);

  const systemInstruction = { parts: [{ text: buildSystemPrompt(ctx) }] };

  try {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction,
      contents,
        generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 500 },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Gemini error:", res.status, errorText);
    return null;
  }

  const data = (await res.json()) as any;
  const responseText =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n") ??
    null;
  
    const cleaned = typeof responseText === "string" ? stripMarkdown(responseText) : null;
    if (cleaned) console.log("Gemini: Response received successfully");
    return cleaned && cleaned.trim() ? cleaned : null;
  } catch (err) {
    console.error("Gemini fetch error:", err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: ChatMessage[]; userContext?: UserContext };
    const messages = body.messages ?? [];
    const userContext = body.userContext;
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    // Safety: check for crisis language first
    if (looksLikeCrisis(lastUser)) {
      return NextResponse.json({
        ok: true,
        mode: "crisis",
        message: crisisResponse(),
      });
    }

    // 1. PRIMARY: Groq (llama-3.3-70b, very fast, reliable)
    const groqText = await callGroq(messages, userContext);
    if (groqText) {
      return NextResponse.json({ ok: true, mode: "groq", message: groqText });
    }

    // 2. FALLBACK: Gemini (Google AI)
    const geminiText = await callGemini(messages, userContext);
    if (geminiText) {
      return NextResponse.json({ ok: true, mode: "gemini", message: geminiText });
    }

    // 3. LAST RESORT: demo response (no API available)
    console.warn("All AI providers failed — returning demo response");
      return NextResponse.json({ ok: true, mode: "demo", message: demoResponse() });
  } catch (e) {
    console.error("AI route error:", e);
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}

 