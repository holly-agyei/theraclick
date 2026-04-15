"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import {
  Send, Bot, ShieldAlert, Sparkles, X, Smile,
  Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft, Search,
  MoreHorizontal, Pencil, Pin, Calendar,
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
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
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

const CONVERSATION_STARTERS = [
  { label: "I'm feeling overwhelmed with exams", icon: "📚" },
  { label: "I'm having trouble sleeping", icon: "🌙" },
  { label: "I just need someone to talk to", icon: "💬" },
  { label: "I'm anxious about something", icon: "😰" },
];

const EMOJI_QUICK = ["😊", "😔", "😟", "🙏", "❤️", "😤", "😴", "🥺", "💪", "😅", "🤗", "😭"];

export default function ChatPage() {
  const { profile } = useAuth();
  const router = useRouter();

  const [threads, setThreads] = useState<AiThread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const threadTitleSetRef = useRef<Set<string>>(new Set());

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [safetyMode, setSafetyMode] = useState<null | "crisis">(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [contextMenu, setContextMenu] = useState<string | null>(null);
  const [renamingThread, setRenamingThread] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Close emoji picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handler = () => setContextMenu(null);
    if (contextMenu) document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

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

  useEffect(() => {
    async function loadMessages() {
      if (!profile || !threadId) return;
      const stored = await loadAiThreadMessages(profile, threadId);
      if (stored.length) {
        setMessages(stored.map((m) => ({ id: m.id, text: m.text, sender: m.sender, timestamp: new Date(m.createdAt) })));
      } else {
        setMessages([]);
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
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleDeleteThread = async (id: string) => {
    if (!profile) return;
    await deleteAiThread(profile, id);
    const remaining = threads.filter((t) => t.id !== id);
    setThreads(remaining);
    setContextMenu(null);
    if (id === threadId) {
      if (remaining.length > 0) { setThreadId(remaining[0].id); }
      else { const newId = await ensureDefaultAiThread(profile); await refreshThreads(); setThreadId(newId); }
    }
  };

  const handleRenameThread = async (id: string, newTitle: string) => {
    if (!profile || !newTitle.trim()) return;
    const trimmed = newTitle.trim().slice(0, 40);
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, title: trimmed } : t)));
    await updateThreadTitle(profile, id, trimmed);
    setRenamingThread(null);
  };

  const handleSend = async (overrideText?: string) => {
    const text = overrideText || inputText.trim();
    if (!text) return;
    if (!profile || !threadId) return;

    const userMessage: Message = { id: Date.now().toString(), text, sender: "user", timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setShowEmoji(false);
    setIsTyping(true);
    await appendAiThreadMessage(profile, threadId, { sender: "user", text });

    const needsTitle =
      !threadTitleSetRef.current.has(threadId) &&
      threads.find((t) => t.id === threadId)?.title === "New chat";

    try {
      const history: ApiMsg[] = [...messages, userMessage].slice(-20).map((m) => ({
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
              school: profile.role === "student" ? (profile as Record<string, unknown>).student ? ((profile as Record<string, unknown>).student as Record<string, unknown>)?.school : undefined : undefined,
              country: "Ghana",
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = (await res.json()) as { ok: boolean; mode?: string; message?: string };
        const aiText = data?.message || "I'm here. Tell me what's going on.";

        if (data?.mode === "crisis") setSafetyMode("crisis");

        const aiMessage: Message = { id: (Date.now() + 1).toString(), text: aiText, sender: "ai", timestamp: new Date() };
        setMessages((prev) => [...prev, aiMessage]);
        await appendAiThreadMessage(profile, threadId, { sender: "ai", text: aiText });

        if (needsTitle) {
          threadTitleSetRef.current.add(threadId);
          const tid = threadId;
          const applyTitle = (title: string) => {
            const t = title.length > 40 ? title.slice(0, 40) + "…" : title;
            setThreads((prev) => prev.map((th) => (th.id === tid ? { ...th, title: t } : th)));
            updateThreadTitle(profile, tid, t).catch(() => {});
          };
          applyTitle(text.slice(0, 30));
          fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "title", messages: [{ role: "user", content: text }, { role: "assistant", content: aiText }] }),
          }).then((r) => r.json()).then((d: { ok: boolean; title?: string }) => {
            if (d?.title && d.title !== "New chat") applyTitle(d.title);
          }).catch(() => {});
        }
      } catch (fetchError: unknown) {
        clearTimeout(timeoutId);
        const isAbort = fetchError instanceof Error && fetchError.name === "AbortError";
        const fallbackText = isAbort ? "The request took too long. Please try again." : "I'm having trouble responding right now. Can you try again?";
        const fallback: Message = { id: (Date.now() + 1).toString(), text: fallbackText, sender: "ai", timestamp: new Date() };
        setMessages((prev) => [...prev, fallback]);
        await appendAiThreadMessage(profile, threadId, { sender: "ai", text: fallbackText });
      } finally {
        setIsTyping(false);
      }
    } catch {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const hasMessages = messages.length > 0;

  return (
    <LayoutWrapper>
      <div className="flex h-full bg-white dark:bg-gray-950">
        {/* ── Side panel ── */}
        <div className={`${sidebarOpen ? "w-64" : "w-0"} shrink-0 overflow-hidden bg-gray-50/80 dark:bg-gray-900/80 transition-all duration-200 md:relative fixed inset-y-0 left-0 z-30 md:z-auto`}>
          <div className="flex h-full w-64 flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <Logo size="sm" iconOnly />
              <button onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600">
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>

            <div className="px-3 pb-2 space-y-1">
              <button onClick={handleNewChat}
                className="flex w-full items-center gap-2.5 rounded-lg bg-[#0F4F47] px-3 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#1A7A6E]">
                <Plus className="h-4 w-4" /> New chat
              </button>
              <div className="flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2">
                <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <input type="text" placeholder="Search chats..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-[13px] text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none" />
                {searchQuery && <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>}
              </div>
            </div>

            <div className="mx-4 border-t border-gray-200 dark:border-gray-800" />
            <p className="px-4 pt-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-gray-400">Your chats</p>

            <div className="flex-1 overflow-y-auto px-2 pb-3">
              {threads.length === 0 && <p className="px-3 py-8 text-center text-xs text-gray-400">No chats yet</p>}
              {threads
                .filter((t) => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((t) => (
                <div key={t.id} className="relative">
                  {renamingThread === t.id ? (
                    <div className="flex items-center gap-1 px-2 py-1">
                      <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleRenameThread(t.id, renameValue); if (e.key === "Escape") setRenamingThread(null); }}
                        autoFocus className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-[13px] text-gray-900 dark:text-gray-100 outline-none focus:border-[#2BB5A0]" />
                      <button onClick={() => handleRenameThread(t.id, renameValue)}
                        className="rounded px-2 py-1 text-[11px] font-semibold text-[#2BB5A0] hover:bg-[#2BB5A0]/10">Save</button>
                    </div>
                  ) : (
                    <div onClick={() => handleSwitchThread(t.id)}
                      className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 transition-colors ${
                        t.id === threadId ? "bg-[#0F4F47]/10 text-[#0F4F47] dark:text-[#2BB5A0] font-semibold" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px]">{t.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{formatRelativeTime(t.updatedAt)}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setContextMenu(contextMenu === t.id ? null : t.id); }}
                        className="shrink-0 rounded p-1 text-gray-400 opacity-0 transition-opacity hover:text-gray-600 group-hover:opacity-100">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Context menu */}
                  {contextMenu === t.id && (
                    <div className="absolute right-2 top-full z-50 mt-1 w-36 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl py-1">
                      <button onClick={(e) => { e.stopPropagation(); setRenamingThread(t.id); setRenameValue(t.title); setContextMenu(null); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <Pencil className="h-3.5 w-3.5" /> Rename
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setContextMenu(null); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <Pin className="h-3.5 w-3.5" /> Pin
                      </button>
                      {threads.length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteThread(t.id); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Counselor CTA at bottom */}
            <div className="border-t border-gray-200 dark:border-gray-800 p-3">
              <button onClick={() => router.push("/student/counselors")}
                className="flex w-full items-center gap-2.5 rounded-lg bg-[#0F4F47]/5 px-3 py-2.5 text-left transition-colors hover:bg-[#0F4F47]/10">
                <Calendar className="h-4 w-4 text-[#2BB5A0]" />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-gray-700 dark:text-gray-300">Want human support?</p>
                  <p className="text-[11px] text-gray-400">Book a counselor session →</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/20 md:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* ── Main chat area ── */}
        <div className="flex flex-1 flex-col">
          {/* Top bar */}
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-4 py-3">
            {!sidebarOpen && (
              <>
                <button onClick={() => setSidebarOpen(true)}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                  <PanelLeft className="h-5 w-5" />
                </button>
                <button onClick={handleNewChat}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800" title="New chat">
                  <Plus className="h-5 w-5" />
                </button>
              </>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0F4F47]">
                <Sparkles className="h-3 w-3 text-[#F5C842]" />
              </div>
              <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">Theraklick AI</span>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto">
            {!hasMessages ? (
              /* Empty state with conversation starters */
              <div className="flex h-full flex-col items-center justify-center px-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0F4F47]/10">
                  <Sparkles className="h-7 w-7 text-[#0F4F47]" />
                </div>
                <h2 className="mt-4 text-[18px] font-bold text-gray-900 dark:text-gray-100">What&apos;s on your mind?</h2>
                <p className="mt-1 text-[14px] text-gray-400">I&apos;m here to listen. Pick a topic or just type.</p>

                <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 max-w-md w-full">
                  {CONVERSATION_STARTERS.map((s) => (
                    <button key={s.label} onClick={() => handleSend(s.label)}
                      className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 text-left text-[13px] text-gray-600 dark:text-gray-400 transition-all hover:border-[#2BB5A0] hover:bg-[#2BB5A0]/5 hover:text-gray-900 dark:hover:text-gray-100">
                      <span className="text-[18px]">{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-4 py-6 md:px-8">
                <div className="mx-auto max-w-2xl space-y-5">
                  {safetyMode === "crisis" && (
                    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4">
                      <div className="flex items-start gap-3">
                        <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
                        <div>
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Safety check</p>
                          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                            If you&apos;re in immediate danger, call your local emergency number or go to the nearest emergency room.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {messages.map((message, idx) => {
                    const isFirstAi = message.sender === "ai" && (idx === 0 || messages[idx - 1]?.sender !== "ai");
                    return (
                      <div key={message.id} className={`flex gap-3 ${message.sender === "user" ? "justify-end" : ""}`}>
                        {message.sender === "ai" && (
                          <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0F4F47]">
                            <Sparkles className="h-3.5 w-3.5 text-[#F5C842]" />
                          </div>
                        )}
                        <div className={`max-w-[80%] ${
                          message.sender === "user"
                            ? "rounded-[20px_20px_4px_20px] bg-[#2BB5A0] px-4 py-3 text-white"
                            : "pt-0.5"
                        }`}>
                          {message.sender === "ai" && isFirstAi && (
                            <p className="mb-1 text-[11px] font-semibold text-[#2BB5A0]">Theraklick AI</p>
                          )}
                          {message.sender === "ai" ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0 prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-1 text-gray-800 dark:text-gray-200">
                              <ReactMarkdown>{message.text}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap text-[14px]">{message.text}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0F4F47]">
                        <Sparkles className="h-3.5 w-3.5 text-[#F5C842]" />
                      </div>
                      <div className="flex items-center gap-1 pt-2">
                        <span className="text-[12px] text-gray-400 mr-1">Theraklick AI is typing</span>
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#2BB5A0]" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#2BB5A0]" style={{ animationDelay: "0.15s" }} />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#2BB5A0]" style={{ animationDelay: "0.3s" }} />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="px-4 pb-4 pt-2 md:px-8">
            <div className="mx-auto max-w-2xl">
              <div className="relative flex items-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 shadow-sm focus-within:border-[#2BB5A0] focus-within:shadow-[0_0_0_3px_rgba(43,181,160,0.12)]">
                {/* Emoji picker */}
                <div ref={emojiRef} className="relative shrink-0">
                  <button onClick={() => setShowEmoji(!showEmoji)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                      showEmoji ? "bg-[#2BB5A0]/10 text-[#2BB5A0]" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                    <Smile className="h-5 w-5" />
                  </button>
                  {showEmoji && (
                    <div className="absolute bottom-full left-0 z-50 mb-2 w-[252px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 shadow-2xl">
                      <p className="mb-1.5 px-1 text-[11px] font-medium text-gray-400">Quick reactions</p>
                      <div className="grid grid-cols-6 gap-0.5">
                        {EMOJI_QUICK.map((e) => (
                          <button key={e} onClick={() => { setInputText((prev) => prev + e); inputRef.current?.focus(); }}
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-[20px] hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-90 transition-all">
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <textarea
                  ref={inputRef} placeholder="Ask anything..." value={inputText}
                  onChange={(e) => setInputText(e.target.value)} onKeyDown={handleKeyPress} rows={1}
                  className="flex-1 resize-none bg-transparent py-1.5 text-[14px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none" />

                <button onClick={() => handleSend()} disabled={!inputText.trim()}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all ${
                    inputText.trim() ? "bg-[#0F4F47] text-white active:scale-95 hover:bg-[#1A7A6E]" : "text-gray-300 dark:text-gray-600"}`}>
                  <Send className="h-4 w-4" />
                </button>
              </div>

              {/* Disclaimer */}
              <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-gray-400 dark:text-gray-500">
                <ShieldAlert className="h-3 w-3" />
                Theraklick AI can make mistakes. For urgent help, <button onClick={() => router.push("/student/counselors")} className="font-semibold text-[#2BB5A0] underline underline-offset-2 hover:text-[#1A7A6E]">talk to a counselor</button>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
