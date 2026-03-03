"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Button } from "@/components/ui/button";
import {
  Send, Bot, ShieldAlert, Sparkles, Mic, MicOff, X,
  Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft, Search,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/auth";
import {
  appendAiThreadMessage,
  ensureDefaultAiThread,
  loadAiThreadMessages,
  listAiThreads,
  createAiThread,
  deleteAiThread,
  updateThreadTitle,
  type AiThread,
} from "@/lib/chatStore";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  audioUrl?: string;
}

type ApiMsg = { role: "user" | "assistant"; content: string };

function formatRelativeTime(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ChatPage() {
  const { profile } = useAuth();

  // Thread state
  const [threads, setThreads] = useState<AiThread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const threadTitleSetRef = useRef<Set<string>>(new Set());

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [safetyMode, setSafetyMode] = useState<null | "crisis">(null);

  // Voice recording
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

  // Load threads on mount
  useEffect(() => {
    async function hydrate() {
      if (!profile) return;

      const allThreads = await listAiThreads(profile);

      if (allThreads.length === 0) {
        const defaultId = await ensureDefaultAiThread(profile);
        const refreshed = await listAiThreads(profile);
        setThreads(refreshed.length ? refreshed : [{ id: defaultId, title: "New chat", updatedAt: Date.now() }]);
        setThreadId(defaultId);
      } else {
        setThreads(allThreads);
        setThreadId(allThreads[0].id);
      }
    }
    void hydrate();
  }, [profile]);

  // Load messages when thread changes
  useEffect(() => {
    async function loadMessages() {
      if (!profile || !threadId) return;
      const stored = await loadAiThreadMessages(profile, threadId);
      if (stored.length) {
        setMessages(
          stored.map((m) => ({
            id: m.id,
            text: m.text,
            sender: m.sender,
            timestamp: new Date(m.createdAt),
          }))
        );
      } else {
        setMessages([
          {
            id: "welcome",
            text: "Hey! I'm here for you. What's on your mind?",
            sender: "ai",
            timestamp: new Date(),
          },
        ]);
      }
      setSafetyMode(null);
    }
    void loadMessages();
  }, [profile, threadId]);

  const refreshThreads = useCallback(async () => {
    if (!profile) return;
    const all = await listAiThreads(profile);
    setThreads(all);
  }, [profile]);

  const handleNewChat = async () => {
    if (!profile) return;
    const newId = await createAiThread(profile);
    await refreshThreads();
    setThreadId(newId);
    setSidebarOpen(false);
  };

  const handleSwitchThread = (id: string) => {
    if (id === threadId) return;
    setThreadId(id);
    // Close sidebar on mobile
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleDeleteThread = async (id: string) => {
    if (!profile) return;
    await deleteAiThread(profile, id);
    const remaining = threads.filter((t) => t.id !== id);
    setThreads(remaining);

    if (id === threadId) {
      if (remaining.length > 0) {
        setThreadId(remaining[0].id);
      } else {
        const newId = await ensureDefaultAiThread(profile);
        await refreshThreads();
        setThreadId(newId);
      }
    }
  };

  // ── Voice recording ──────────────────────────────────────────

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
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const finalType = mimeType || mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: finalType });
        setAudioBlob(blob.size > 0 ? blob : null);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.onerror = () => { setIsRecording(false); stream.getTracks().forEach((t) => t.stop()); };
      mediaRecorder.start(1000);
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
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ── Send message ─────────────────────────────────────────────

  const handleSend = async () => {
    if (!inputText.trim() && !audioBlob) return;
    if (!profile || !threadId) return;

    const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : undefined;
    const userText = inputText.trim() || "🎤 Voice message";
    const userMessage: Message = {
      id: Date.now().toString(),
      text: userText,
      sender: "user",
      timestamp: new Date(),
      audioUrl,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setAudioBlob(null);
    setIsTyping(true);
    await appendAiThreadMessage(profile, threadId, { sender: "user", text: userText });

    const needsTitle =
      !threadTitleSetRef.current.has(threadId) &&
      threads.find((t) => t.id === threadId)?.title === "New chat" &&
      userText !== "🎤 Voice message";

    try {
      const history: ApiMsg[] = [...messages, userMessage]
        .slice(-20)
        .map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            userContext: {
              role: profile.role,
              school: profile.role === "student" ? profile.student?.school ?? undefined : undefined,
              educationLevel: profile.role === "student" ? profile.student?.educationLevel ?? undefined : undefined,
              country: "Ghana",
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = (await res.json()) as { ok: boolean; mode?: string; message?: string };
        const text = data?.message || "I'm here. Tell me what's going on.";

        if (data?.mode === "crisis") setSafetyMode("crisis");

        const aiMessage: Message = { id: (Date.now() + 1).toString(), text, sender: "ai", timestamp: new Date() };
        setMessages((prev) => [...prev, aiMessage]);
        await appendAiThreadMessage(profile, threadId, { sender: "ai", text });

        // After the first exchange, ask Gemini to generate a descriptive title
        if (needsTitle) {
          threadTitleSetRef.current.add(threadId);
          const tid = threadId; // capture for closure safety

          const applyTitle = (title: string) => {
            const trimmed = title.length > 40 ? title.slice(0, 40) + "…" : title;
            setThreads((prev) =>
              prev.map((t) => (t.id === tid ? { ...t, title: trimmed } : t))
            );
            updateThreadTitle(profile, tid, trimmed).catch(() => {});
          };

          // Immediate placeholder: use first ~30 chars of user prompt
          applyTitle(userText.slice(0, 30));

          // Then ask Gemini for a better title in the background
          const titleHistory: ApiMsg[] = [
            { role: "user", content: userText },
            { role: "assistant", content: text },
          ];
          fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "title", messages: titleHistory }),
          })
            .then((r) => r.json())
            .then((d: { ok: boolean; title?: string }) => {
              if (d?.title && d.title !== "New chat") applyTitle(d.title);
            })
            .catch(() => {});
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        const fallbackText = fetchError.name === "AbortError"
          ? "The request took too long. Please try again."
          : "I'm having trouble responding right now. Can you try again?";
        const fallback: Message = { id: (Date.now() + 1).toString(), text: fallbackText, sender: "ai", timestamp: new Date() };
        setMessages((prev) => [...prev, fallback]);
        await appendAiThreadMessage(profile, threadId, { sender: "ai", text: fallbackText });
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

  const hasRealMessages = messages.length > 1 || (messages.length === 1 && messages[0].id !== "welcome");

  return (
    <LayoutWrapper>
      <div className="flex h-full bg-white">
        {/* ── Side panel ──────────────────────────────────────── */}
        <div
          className={`${
            sidebarOpen ? "w-64" : "w-0"
          } shrink-0 overflow-hidden bg-gray-50/80 transition-all duration-200 md:relative fixed inset-y-0 left-0 z-30 md:z-auto`}
        >
          <div className="flex h-full w-64 flex-col">
            {/* Brand + toggle */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <Logo size="sm" iconOnly />
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>

            {/* New chat + search */}
            <div className="px-3 pb-2 space-y-1">
              <button
                onClick={handleNewChat}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                <Plus className="h-4 w-4" />
                New chat
              </button>
              <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
                <Search className="h-4 w-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="mx-4 border-t border-gray-200" />

            {/* Section label */}
            <p className="px-4 pt-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-gray-400">
              Your chats
            </p>

            {/* Thread list */}
            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {threads.length === 0 && (
                <p className="px-3 py-8 text-center text-xs text-gray-400">No chats yet</p>
              )}
              {threads
                .filter((t) => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSwitchThread(t.id)}
                  className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                    t.id === threadId
                      ? "bg-green-50 text-green-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <p className="min-w-0 flex-1 truncate text-[13px]">{t.title}</p>
                  {threads.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteThread(t.id);
                      }}
                      className="shrink-0 rounded p-1 text-gray-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Main chat area ──────────────────────────────────── */}
        <div className="flex flex-1 flex-col">
          {/* Minimal top bar */}
          <div className="flex items-center gap-2 px-4 py-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <PanelLeft className="h-5 w-5" />
              </button>
            )}
            {!sidebarOpen && (
              <button
                onClick={handleNewChat}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                title="New chat"
              >
                <Plus className="h-5 w-5" />
              </button>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Sparkles className="h-3.5 w-3.5 text-green-500" />
              <span>Theraklick AI</span>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto">
            {!hasRealMessages ? (
              /* Empty state — centered welcome */
              <div className="flex h-full flex-col items-center justify-center px-4">
                <Bot className="mb-4 h-10 w-10 text-green-500 opacity-60" />
                <h2 className="text-xl font-medium text-gray-800">Ready when you are.</h2>
                <p className="mt-2 text-sm text-gray-400">Ask anything, vent, or just chat.</p>
              </div>
            ) : (
              <div className="px-4 py-6 md:px-8">
                <div className="mx-auto max-w-2xl space-y-5">
                  {safetyMode === "crisis" && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
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
                  {messages.filter((m) => m.id !== "welcome").map((message) => (
                    <div key={message.id} className={`flex gap-3 ${message.sender === "user" ? "justify-end" : ""}`}>
                      {message.sender === "ai" && (
                        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100">
                          <Bot className="h-4 w-4 text-green-600" />
                        </div>
                      )}
                      <div className={`max-w-[80%] ${
                        message.sender === "user"
                          ? "rounded-[20px_20px_4px_20px] bg-green-600 px-4 py-3 text-white"
                          : "pt-1 text-gray-800"
                      }`}>
                        {message.audioUrl && (
                          <audio controls className="mb-2 w-full" src={message.audioUrl}>
                            Your browser does not support audio.
                          </audio>
                        )}
                        {message.sender === "ai" ? (
                          <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0 prose-headings:text-gray-900 prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-1">
                            <ReactMarkdown>{message.text}</ReactMarkdown>
                          </div>
                        ) : (
                          !message.audioUrl && <p className="whitespace-pre-wrap text-sm">{message.text}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100">
                        <Bot className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex items-center gap-1.5 pt-2">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-green-400" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-green-400" style={{ animationDelay: "0.15s" }} />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-green-400" style={{ animationDelay: "0.3s" }} />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* Input bar — centered, ChatGPT-style */}
          <div className="px-4 pb-4 pt-2 md:px-8">
            <div className="mx-auto max-w-2xl">
              {audioBlob && (
                <div className="mb-2 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5">
                  <Mic className="h-4 w-4 text-green-600 shrink-0" />
                  <audio controls src={URL.createObjectURL(audioBlob)} className="flex-1 h-8" />
                  <button onClick={() => setAudioBlob(null)} className="shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 shadow-sm focus-within:border-green-400 focus-within:shadow-green-100">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all
                    ${isRecording ? "bg-red-50 text-red-500" : "text-gray-400 hover:text-gray-600"}`}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
                {isRecording && (
                  <span className="shrink-0 text-xs text-red-500 font-medium">{formatRecordingTime(recordingTime)}</span>
                )}
                <textarea
                  ref={inputRef}
                  placeholder="Ask anything..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  rows={1}
                  className="flex-1 resize-none bg-transparent py-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() && !audioBlob}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
                    inputText.trim() || audioBlob
                      ? "bg-green-600 text-white active:scale-95"
                      : "text-gray-300"
                  }`}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-center text-[11px] text-gray-300">
                Theraklick AI can make mistakes. For urgent help, talk to a counselor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
