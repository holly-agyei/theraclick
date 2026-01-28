"use client";

import { useState, useRef, useEffect } from "react";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Button } from "@/components/ui/button";
import { Send, Bot, ShieldAlert, Sparkles, Mic, MicOff, X } from "lucide-react";
import { useAuth } from "@/context/auth";
import { appendAiThreadMessage, ensureDefaultAiThread, loadAiThreadMessages } from "@/lib/chatStore";
import ReactMarkdown from "react-markdown";

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
          }))
        );
      }
    }
    void hydrate();
  }, [profile]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get supported mime type
      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
          mimeType = "audio/ogg";
        } else {
          mimeType = ""; // Use default
        }
      }
      
      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      
      mediaRecorder.onerror = (e) => {
        console.error("MediaRecorder error:", e);
        setIsRecording(false);
        stream.getTracks().forEach((t) => t.stop());
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (e) {
      console.error("Mic access denied:", e);
      alert("Could not access microphone.\n\nPlease:\n1. Click the lock icon in your browser's address bar\n2. Allow microphone access\n3. Refresh the page and try again");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
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

    const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : undefined;
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
    await appendAiThreadMessage(profile, threadId, { sender: "user", text: userMessage.text });

    try {
      const history: ApiMsg[] = [...messages, userMessage]
        .slice(-20)
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
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <LayoutWrapper>
      <div className="flex h-screen flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Ambient effects */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px]" />
          <div className="absolute -right-20 bottom-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]" />
        </div>

        {/* Header */}
        <div className="relative z-10 border-b border-white/10 bg-black/20 px-4 py-4 backdrop-blur-xl md:px-8 md:py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-white">AI Support</h1>
                <Sparkles className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-sm text-gray-400">
                Always available · Anonymous · Safe space
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto max-w-3xl space-y-4">
            {safetyMode === "crisis" && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-amber-200">Safety check</p>
                    <p className="mt-1 text-sm text-amber-200/80">
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
                      ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20"
                      : "border border-white/10 bg-white/5 text-gray-100 backdrop-blur-sm"
                  }`}
                >
                  {message.audioUrl && (
                    <audio controls className="mb-2 w-full" src={message.audioUrl}>
                      Your browser does not support audio.
                    </audio>
                  )}
                  {message.sender === "ai" ? (
                    <div className="prose prose-sm prose-invert max-w-none prose-headings:text-emerald-400 prose-headings:font-semibold prose-headings:text-sm prose-headings:mt-3 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                      <ReactMarkdown>{message.text}</ReactMarkdown>
                    </div>
                  ) : (
                    !message.audioUrl && <p className="whitespace-pre-wrap text-sm md:text-base">{message.text}</p>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-sm">
                  <div className="flex gap-1.5">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-400"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: "0.1s" }}></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="relative z-10 border-t border-white/10 bg-black/20 p-4 backdrop-blur-xl md:p-6">
          <div className="mx-auto max-w-3xl">
            {/* Audio preview */}
            {audioBlob && (
              <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2">
                <Mic className="h-5 w-5 text-emerald-400" />
                <audio controls src={URL.createObjectURL(audioBlob)} className="h-8 flex-1" />
                <button onClick={cancelRecording} className="text-gray-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="flex gap-3">
              {/* Voice record button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center gap-2 rounded-xl px-4 py-3 transition-all ${
                  isRecording
                    ? "bg-red-500/20 text-red-400"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-5 w-5" />
                    <span className="text-sm font-medium">{formatRecordingTime(recordingTime)}</span>
                  </>
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </button>

              <textarea
                ref={inputRef}
                placeholder="Type or record a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-sm transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-0"
              />
              <Button
                onClick={handleSend}
                disabled={!inputText.trim() && !audioBlob}
                className="h-auto rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
