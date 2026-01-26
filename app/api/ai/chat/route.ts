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

function demoResponse(userText: string) {
  // A calm, non-clinical fallback aligned with context.md
  const base = [
    "I’m here with you.",
    "Thanks for sharing that — it makes sense that this feels heavy.",
    "",
    "To make this easier, we can go step by step:",
    "- What’s the hardest part right now?",
    "- What would “a little bit better” look like in the next 30 minutes?",
    "",
    "If you want, you can also say whether this is mostly about **exams**, **anxiety/stress**, **relationships**, or just needing to **vent**.",
  ].join("\n");

  if (!userText.trim()) return base;
  return base;
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
    "You are Theraklick AI — a calm, empathetic, non-clinical support companion for students in Africa (starting Ghana).",
    "",
    `You are talking to ${who}.`,
    personalization ? `\nPersonalization context (do NOT request more identity):\n${personalization}\n` : "",
    "Core principles:",
    "- Anonymity-first: never ask for full names, phone numbers, addresses, or contact details. If the user shares any, do not repeat it back.",
    "- Text-first, low cognitive load: short paragraphs, gentle tone, 1–2 questions at a time, offer simple options.",
    "- Layered support: guide toward next steps (AI → peer support → counselor → emergency resources) when appropriate.",
    "- Trust over features: clear, honest limitations. You are not a therapist or doctor.",
    "",
    "Output format (must follow exactly):",
    "Return a short, structured response in Markdown with these headings:",
    "### What I’m hearing",
    "### A small next step (5 minutes)",
    "### Options (pick one)",
    "### If this feels urgent",
    "",
    "Style rules:",
    "- Validate feelings without diagnosing. Avoid clinical language.",
    "- Offer 2–3 options max. Keep each bullet short.",
    "- Ask at most ONE question at the end.",
    "",
    "Safety:",
    "- If the user expresses self-harm/suicide intent or imminent danger: switch to safety mode.",
    "- Ask if they are safe right now; encourage contacting local emergency services or going to the nearest emergency room.",
    "- Encourage reaching a trusted person nearby. Do not provide instructions for self-harm.",
  ]
    .filter((s) => s !== "")
    .join("\n");
}

async function callGemini(messages: ChatMessage[], ctx?: UserContext) {
  // Use env key or fallback to provided key
  const apiKey = process.env.GEMINI_API_KEY || "AIzaSyCwJYQ60NW7orX4YTiWNz7bY28WHUz9dLw";
  if (!apiKey) {
    console.log("Gemini: No API key configured");
    return null;
  }

  // Try gemini-pro which has separate quota from flash models
  const model = "gemini-pro";
  console.log(`Gemini: Using model ${model}`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }))
    .slice(-30);

  const systemInstruction = { parts: [{ text: buildSystemPrompt(ctx) }] };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction,
      contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 500,
      },
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
  
  if (responseText) {
    console.log("Gemini: Response received successfully");
  }
  return typeof responseText === "string" && responseText.trim() ? responseText : null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: ChatMessage[]; userContext?: UserContext };
    const messages = body.messages ?? [];
    const userContext = body.userContext;
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    if (looksLikeCrisis(lastUser)) {
      return NextResponse.json({
        ok: true,
        mode: "crisis",
        message: crisisResponse(),
      });
    }

    // Skip Gemini (quota exhausted), use Cogen AI
    // const geminiText = await callGemini(messages, userContext);
    // if (geminiText) {
    //   return NextResponse.json({ ok: true, mode: "gemini", message: geminiText });
    // }

    // Fallback: OpenAI-compatible (Cogen AI)
    const apiKey = process.env.OPENAI_API_KEY || "sk-qZJyPuRxRCPzH0mwOBX6_A";
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.cogenai.kalavai.net/v1";
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const system: ChatMessage = { role: "system", content: buildSystemPrompt(userContext) };

    if (!apiKey) {
      return NextResponse.json({ ok: true, mode: "demo", message: demoResponse(lastUser) });
    }

    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [system, ...messages].slice(-30),
        temperature: 0.7,
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error("OpenAI upstream error:", upstream.status, text);
      return NextResponse.json(
        { ok: true, mode: "demo", message: demoResponse(lastUser) },
        { status: 200 }
      );
    }

    const data = (await upstream.json()) as any;
    const content = data?.choices?.[0]?.message?.content;

    return NextResponse.json({
      ok: true,
      mode: "openai",
      message: typeof content === "string" ? content : demoResponse(lastUser),
    });
  } catch (e) {
    console.error("AI route error:", e);
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}

