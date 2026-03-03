"use client";

import { useState, useRef, useEffect } from "react";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Button } from "@/components/ui/button";
import { Send, Bot, ShieldAlert, Sparkles, Mic, MicOff, X } from "lucide-react";
import { EmojiPicker } from "@/components/EmojiPicker";
import { useAuth } from "@/context/auth";
import { appendAiThreadMessage, ensureDefaultAiThread, loadAiThreadMessages } from "@/lib/chatStore";
import { uploadVoiceMessage } from "@/lib/audioUpload";
import { VoiceMessage } from "@/components/VoiceMessage";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  audioUrl?: string;
}

type ApiMsg = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi, I'm here to support you. How are you feeling today?",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [safetyMode, setSafetyMode] = useState<null | "crisis">(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    async function hydrate() {
      if (!profile) return;
      const tid = await ensureDefaultAiThread(profile);
      setThreadId(tid);
      const stored = await loadAiThreadMessages(profile, tid);
      if (stored.length) {
        setMessages(
          stored.map((m) => ({
            id: m.id,
            text: m.text,
            sender: m.sender,
            timestamp: new Date(m.createdAt),
            audioUrl: m.audioUrl,
          }))
        );
      }
    }
    void hydrate();
  }, [profile]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = "";
      for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"]) {
        if (MediaRecorder.isTypeSupported(t)) { mimeType = t; break; }
      }
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const finalType = mimeType || mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: finalType });
        setAudioBlob(blob.size > 0 ? blob : null);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.onerror = () => {
        setIsRecording(false);
        stream.getTracks().forEach((t) => t.stop());
      };
      
      mediaRecorder.start(1000); // 1s timeslice for cross-browser reliability
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (e) {
      console.error("Mic access denied:", e);
      alert("Could not access microphone.\n\nPlease allow microphone access and try again.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      if (mediaRecorderRef.current.state === "recording") {
        try { mediaRecorderRef.current.requestData(); } catch { /* ok */ }
      }
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cancelRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSend = async () => {
    if (!inputText.trim() && !audioBlob) return;
    if (!profile || !threadId) return;

    // Upload audio to Firebase Storage (persistent URL) instead of blob URL (temporary)
    let audioUrl: string | undefined;
    if (audioBlob) {
      audioUrl = await uploadVoiceMessage(audioBlob, `ai_${threadId}`, profile.uid);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim() || "🎤 Voice message",
      sender: "user",
      timestamp: new Date(),
      audioUrl,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setAudioBlob(null);
    setIsTyping(true);
    // Save message with audioUrl so it persists across sessions
    await appendAiThreadMessage(profile, threadId, { sender: "user", text: userMessage.text, audioUrl });

    try {
      // Build conversation history for the AI — filter out noise
      const history: ApiMsg[] = [...messages, userMessage]
        .filter((m) => {
          // Skip voice-only messages (no actual text content for AI)
          if (m.text === "🎤 Voice message") return false;
          // Skip error/timeout messages from the AI
          if (m.sender === "ai" && (
            m.text.startsWith("I'm having trouble") ||
            m.text.startsWith("The request took too long")
          )) return false;
          // Must have actual content
          return m.text && m.text.trim().length > 0;
        })
        .slice(-40) // bigger context window for better memory
        .map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            userContext: {
              role: profile.role,
              displayName:
                profile.role === "student" && profile.anonymousEnabled && profile.anonymousId
                  ? profile.anonymousId
                  : undefined,
              school: profile.role === "student" ? profile.student?.school ?? undefined : undefined,
              educationLevel:
                profile.role === "student" ? profile.student?.educationLevel ?? undefined : undefined,
              country: "Ghana",
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = (await res.json()) as { ok: boolean; mode?: string; message?: string };
        const text = data?.message || "I'm here. Tell me what's going on.";

        if (data?.mode === "crisis") setSafetyMode("crisis");

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text,
          sender: "ai",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        await appendAiThreadMessage(profile, threadId, { sender: "ai", text: aiMessage.text });
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === "AbortError") {
          console.warn("Request was aborted (timeout or cancelled)");
          const timeoutMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: "The request took too long. Please try again.",
            sender: "ai",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, timeoutMessage]);
          await appendAiThreadMessage(profile, threadId, { sender: "ai", text: timeoutMessage.text });
        } else {
          console.error("Chat error:", fetchError);
          const fallback: Message = {
            id: (Date.now() + 1).toString(),
            text:
              "I'm having trouble responding right now. Can you try again? If this feels urgent, consider reaching out to someone you trust nearby.",
            sender: "ai",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, fallback]);
          await appendAiThreadMessage(profile, threadId, { sender: "ai", text: fallback.text });
        }
      } finally {
        setIsTyping(false);
      }
    } catch (error) {
      console.error("handleSend error:", error);
      setIsTyping(false);
    }
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <LayoutWrapper>
      <div className="flex h-full flex-col bg-white">
        {/* Header */}
        <div className="relative z-10 border-b border-gray-200 bg-white px-4 py-4 shadow-sm md:px-8 md:py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100">
              <Bot className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-gray-900">AI Support</h1>
                <Sparkles className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-sm text-gray-500">
                Always available · Anonymous · Safe space
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto max-w-3xl space-y-4">
            {safetyMode === "crisis" && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Safety check</p>
                    <p className="mt-1 text-sm text-amber-700">
                      If you're in immediate danger, call your local emergency number or go to the nearest emergency room.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3 md:max-w-[70%] ${
                    message.sender === "user"
                      ? "bg-green-600 text-white"
                      : "bg-white border border-gray-200 text-gray-800"
                  }`}
                >
                  {message.audioUrl && (
                    <VoiceMessage
                      audioUrl={message.audioUrl}
                      isOwnMessage={message.sender === "user"}
                    />
                  )}
                  {message.text && message.text !== "🎤 Voice message" && (
                    <p className={`whitespace-pre-wrap text-sm md:text-base leading-relaxed ${message.audioUrl ? "mt-2" : ""}`}>
                      {message.text}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white border border-gray-200 px-5 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-green-500"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-green-500" style={{ animationDelay: "0.1s" }}></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-green-500" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input — WhatsApp-style */}
        <div className="relative z-10 border-t border-gray-200 bg-white px-3 py-2 md:px-6 md:py-3">
          <div className="mx-auto max-w-3xl">
            {/* Audio preview */}
            {audioBlob && !isRecording && (
              <div className="mb-2 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-2">
                <Mic className="h-4 w-4 text-green-600 shrink-0" />
                <audio controls src={URL.createObjectURL(audioBlob)} className="h-8 flex-1" />
                <button onClick={cancelRecording} className="shrink-0 text-gray-400 hover:text-gray-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {isRecording ? (
              /* ── Recording state ── */
              <div className="flex items-center gap-3 rounded-full border border-red-200 bg-red-50 px-4 py-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                </span>
                <span className="text-sm font-medium text-red-600">Recording {formatRecordingTime(recordingTime)}</span>
                <div className="flex-1" />
                <button onClick={() => { stopRecording(); cancelRecording(); }}
                  className="rounded-lg px-3 py-1 text-xs font-medium text-gray-500 hover:bg-red-100">Cancel</button>
                <button onClick={stopRecording}
                  className="rounded-lg bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600">Stop</button>
              </div>
            ) : (
              /* ── Normal input ── */
              <div className="flex items-center gap-2">
                <EmojiPicker onSelect={(emoji) => setInputText((t) => t + emoji)} />

                <div className="relative flex flex-1 items-center rounded-full border border-gray-200 bg-gray-50 transition-colors focus-within:border-green-500">
                  <textarea
                    ref={inputRef}
                    placeholder="Message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    rows={1}
                    className="flex-1 resize-none bg-transparent px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                  />
                </div>

                {inputText.trim() || audioBlob ? (
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim() && !audioBlob}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white transition-all hover:bg-green-700 active:scale-95 disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
