"use client";

import { useState, useEffect, useRef } from "react";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import {
  Hash,
  Search,
  Send,
  Smile,
  Image as ImageIcon,
  Trash2,
  Users,
  MessageSquare,
  ChevronRight,
  X,
  Reply,
  Mic,
  MicOff,
  Paperclip,
  Play,
  Pause,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Forum {
  id: string;
  name: string;
  description: string;
  icon: string;
  memberCount: number;
  color: string;
}

interface ForumMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: Date;
  reactions: Record<string, string[]>;
  imageUrl?: string;
  audioUrl?: string;
  isAnonymous: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  threadCount?: number;
}

// Extended emoji list for mental health support
const emojiCategories = {
  "Reactions": ["❤️", "👍", "👎", "🙏", "💪", "🤗", "😢", "😭", "🥺", "😊", "😌", "🥰"],
  "Support": ["💕", "🌟", "✨", "🌈", "🦋", "🌸", "🍀", "☀️", "🌙", "💫", "🕊️", "🤍"],
  "Feelings": ["😔", "😞", "😟", "😰", "😥", "🤯", "😤", "😮‍💨", "🫂", "💔", "🩹", "❤️‍🩹"],
};

// Demo forums
const demoForums: Forum[] = [
  { id: "general", name: "General", description: "A place for everyone to connect", icon: "💬", memberCount: 342, color: "from-blue-500 to-indigo-600" },
  { id: "exam-stress", name: "Exam Stress", description: "Support through exam season", icon: "📚", memberCount: 189, color: "from-amber-500 to-orange-600" },
  { id: "anxiety-support", name: "Anxiety Support", description: "A safe space to share", icon: "🌿", memberCount: 156, color: "from-emerald-500 to-teal-600" },
  { id: "relationships", name: "Relationships", description: "Navigate friendships & family", icon: "💜", memberCount: 98, color: "from-purple-500 to-pink-600" },
  { id: "first-year", name: "First Year Life", description: "For freshers navigating uni", icon: "🎓", memberCount: 234, color: "from-cyan-500 to-blue-600" },
  { id: "self-care", name: "Self Care Corner", description: "Tips for taking care of yourself", icon: "🌸", memberCount: 178, color: "from-pink-500 to-rose-600" },
];

export default function ForumsPage() {
  const { profile } = useAuth();
  const [forums] = useState<Forum[]>(demoForums);
  const [selectedForum, setSelectedForum] = useState<Forum | null>(null);
  const [messages, setMessages] = useState<ForumMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showMobileForums, setShowMobileForums] = useState(true);
  const [replyingTo, setReplyingTo] = useState<ForumMessage | null>(null);
  const [selectedThread, setSelectedThread] = useState<ForumMessage | null>(null);
  const [threadReplies, setThreadReplies] = useState<ForumMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Demo messages
  const [demoMessages] = useState<Record<string, ForumMessage[]>>({
    general: [
      { id: "1", text: "Hey everyone! Just joined Theraklick. Feeling a bit overwhelmed but hoping to find some support here 🙏", senderId: "user1", senderName: "Anonymous Owl", createdAt: new Date(Date.now() - 3600000 * 2), reactions: { "❤️": ["user2", "user3"], "🤗": ["user4"] }, isAnonymous: true, threadCount: 2 },
      { id: "2", text: "Welcome! You're in the right place. We're all here to support each other. What's been on your mind?", senderId: "user2", senderName: "Peaceful Bear", createdAt: new Date(Date.now() - 3600000 * 1.5), reactions: { "👍": ["user1"] }, isAnonymous: true },
      { id: "3", text: "Same here! Just started my second year and the pressure is real. But talking about it helps 💪", senderId: "user3", senderName: "Brave Lion", createdAt: new Date(Date.now() - 3600000), reactions: { "💪": ["user1", "user2"], "🌟": ["user4"] }, isAnonymous: true },
    ],
    "exam-stress": [
      { id: "1", text: "Finals week is killing me 😭 Anyone else feeling completely unprepared?", senderId: "user5", senderName: "Tired Phoenix", createdAt: new Date(Date.now() - 7200000), reactions: { "😢": ["user6", "user7", "user8"], "🤗": ["user9"] }, isAnonymous: true, threadCount: 5 },
      { id: "2", text: "You got this! Remember: one exam at a time. What subject is stressing you most?", senderId: "user6", senderName: "Calm Eagle", createdAt: new Date(Date.now() - 3600000), reactions: { "❤️": ["user5"] }, isAnonymous: true },
    ],
  });

  // Load messages
  useEffect(() => {
    if (!selectedForum) {
      setMessages([]);
      return;
    }
    
    if (db) {
      const q = query(collection(db, "forums", selectedForum.id, "messages"), orderBy("createdAt", "asc"));
      const unsub = onSnapshot(q, (snap) => {
        if (snap.empty) {
          setMessages(demoMessages[selectedForum.id] || []);
        } else {
          setMessages(snap.docs.map((d) => ({ 
            id: d.id, 
            ...d.data(), 
            createdAt: d.data().createdAt?.toDate() || new Date(), 
            reactions: d.data().reactions || {},
            isAnonymous: d.data().isAnonymous || false,
          })) as ForumMessage[]);
        }
      }, (error) => {
        console.error("Error loading forum messages:", error);
        // Fallback to demo messages on error
        setMessages(demoMessages[selectedForum.id] || []);
      });
      return () => unsub();
    } else {
      setMessages(demoMessages[selectedForum.id] || []);
    }
  }, [selectedForum]);

  // Load thread replies
  useEffect(() => {
    if (!selectedThread || !selectedForum || !db) {
      setThreadReplies([]);
      return;
    }
    const q = query(collection(db, "forums", selectedForum.id, "messages", selectedThread.id, "replies"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setThreadReplies(snap.docs.map((d) => ({ 
        id: d.id, 
        ...d.data(), 
        createdAt: d.data().createdAt?.toDate() || new Date(), 
        reactions: d.data().reactions || {},
        isAnonymous: d.data().isAnonymous || false,
      })) as ForumMessage[]);
    }, (error) => {
      console.error("Error loading thread replies:", error);
      setThreadReplies([]);
    });
    return () => unsub();
  }, [selectedThread, selectedForum]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, threadReplies]);

  const sendMessage = async (isThreadReply = false) => {
    if (!inputText.trim() && !audioBlob && !selectedImage) return;
    if (!selectedForum || !profile) return;

    const displayName = (profile.anonymousEnabled && profile.anonymousId 
      ? profile.anonymousId 
      : profile.fullName) || "Anonymous";
    const newMessage: Partial<ForumMessage> = {
      text: inputText.trim(),
      senderId: profile.uid,
      senderName: displayName || "Anonymous",
      createdAt: new Date(),
      reactions: {},
      isAnonymous: profile.anonymousEnabled || false,
      imageUrl: selectedImage || undefined,
    };

    if (replyingTo && !isThreadReply) {
      newMessage.replyTo = { id: replyingTo.id, text: replyingTo.text.slice(0, 50), senderName: replyingTo.senderName };
    }

    setInputText("");
    setReplyingTo(null);
    setSelectedImage(null);
    setAudioBlob(null);

    if (db && profile?.uid) {
      try {
        const messageData = {
          text: newMessage.text || "",
          senderId: profile.uid,
          senderName: newMessage.senderName || "Anonymous",
          createdAt: serverTimestamp(),
          reactions: {},
          isAnonymous: newMessage.isAnonymous || false,
          ...(newMessage.imageUrl && { imageUrl: newMessage.imageUrl }),
          ...(newMessage.replyTo && { replyTo: newMessage.replyTo }),
        };

        if (isThreadReply && selectedThread) {
          await addDoc(collection(db, "forums", selectedForum.id, "messages", selectedThread.id, "replies"), messageData);
          await updateDoc(doc(db, "forums", selectedForum.id, "messages", selectedThread.id), { 
            threadCount: (selectedThread.threadCount || 0) + 1 
          });
        } else {
          await addDoc(collection(db, "forums", selectedForum.id, "messages"), messageData);
        }
      } catch (e) { 
        console.error("Error sending forum message:", e);
        alert("Failed to send message. Please try again.");
      }
    } else {
      // Fallback for demo mode
      if (isThreadReply) {
        setThreadReplies((prev) => [...prev, { id: Date.now().toString(), ...newMessage, createdAt: new Date() } as ForumMessage]);
      } else {
        setMessages((prev) => [...prev, { id: Date.now().toString(), ...newMessage, createdAt: new Date() } as ForumMessage]);
      }
    }
  };

  const toggleReaction = async (messageId: string, emoji: string, isThread = false) => {
    if (!profile || !selectedForum || !profile.uid) return;
    const updateFn = isThread ? setThreadReplies : setMessages;
    updateFn((prev) => prev.map((msg) => {
      if (msg.id !== messageId) return msg;
      const reactions = { ...msg.reactions };
      const users = reactions[emoji] || [];
      reactions[emoji] = users.includes(profile.uid) ? users.filter((u) => u !== profile.uid) : [...users, profile.uid];
      if (reactions[emoji].length === 0) delete reactions[emoji];
      return { ...msg, reactions };
    }));
    setShowEmojiPicker(null);

    if (db) {
      const basePath = isThread && selectedThread 
        ? `forums/${selectedForum.id}/messages/${selectedThread.id}/replies`
        : `forums/${selectedForum.id}/messages`;
      const msgRef = doc(db, basePath, messageId);
      const msgs = isThread ? threadReplies : messages;
      const msg = msgs.find((m) => m.id === messageId);
      if (msg && profile.uid) {
        try {
          await updateDoc(msgRef, { [`reactions.${emoji}`]: msg.reactions[emoji]?.includes(profile.uid) ? arrayRemove(profile.uid) : arrayUnion(profile.uid) });
        } catch (e) { console.error(e); }
      }
    }
  };

  const deleteMessage = async (messageId: string, isThread = false) => {
    if (!selectedForum) return;
    const updateFn = isThread ? setThreadReplies : setMessages;
    updateFn((prev) => prev.filter((m) => m.id !== messageId));
    if (db) {
      const path = isThread && selectedThread 
        ? `forums/${selectedForum.id}/messages/${selectedThread.id}/replies/${messageId}`
        : `forums/${selectedForum.id}/messages/${messageId}`;
      try { await deleteDoc(doc(db, path)); } catch (e) { console.error(e); }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

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
    } catch (e) {
      console.error("Mic access denied:", e);
      alert("Could not access microphone.\n\nPlease:\n1. Click the lock icon in your browser's address bar\n2. Allow microphone access\n3. Refresh the page and try again");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const filteredForums = forums.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const MessageComponent = ({ msg, isThread = false }: { msg: ForumMessage; isThread?: boolean }) => (
    <div className="group">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-700 to-gray-800 text-sm font-medium text-white">
          {msg.senderName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-medium text-white">{msg.senderName}</span>
            {msg.isAnonymous && <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-400">Anonymous</span>}
            <span className="text-xs text-gray-500">{formatTime(msg.createdAt)}</span>
          </div>

          {msg.replyTo && (
            <div className="mt-1 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm">
              <Reply className="h-3 w-3 text-gray-500" />
              <span className="text-gray-500">Replying to</span>
              <span className="text-gray-400 truncate">{msg.replyTo.senderName}: {msg.replyTo.text}</span>
            </div>
          )}

          <p className="mt-1 text-gray-300 whitespace-pre-wrap">{msg.text}</p>

          {msg.imageUrl && <img src={msg.imageUrl} alt="Shared" className="mt-2 max-h-64 rounded-lg" />}
          {msg.audioUrl && (
            <audio controls className="mt-2 w-full max-w-xs">
              <source src={msg.audioUrl} type="audio/webm" />
            </audio>
          )}

          {/* Reactions */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {Object.entries(msg.reactions).map(([emoji, users]) => {
              const hasReacted = profile?.uid && users.includes(profile.uid);
              return (
                <button key={emoji} onClick={() => toggleReaction(msg.id, emoji, isThread)} className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition-all ${hasReacted ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"}`}>
                  <span>{emoji}</span><span className="text-xs">{users.length}</span>
                </button>
              );
            })}

            {/* Actions */}
            <div className="relative">
              <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)} className="rounded-full p-1 text-gray-500 opacity-0 transition-all hover:bg-white/10 hover:text-white group-hover:opacity-100">
                <Smile className="h-4 w-4" />
              </button>
              {showEmojiPicker === msg.id && (
                <div className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded-xl border border-white/10 bg-gray-800 p-3 shadow-xl">
                  {Object.entries(emojiCategories).map(([cat, emojis]) => (
                    <div key={cat} className="mb-2">
                      <p className="mb-1 text-[10px] font-medium uppercase text-gray-500">{cat}</p>
                      <div className="flex flex-wrap gap-1">
                        {emojis.map((emoji) => (
                          <button key={emoji} onClick={() => toggleReaction(msg.id, emoji, isThread)} className="rounded p-1 text-lg hover:bg-white/10">{emoji}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isThread && (
              <button onClick={() => setSelectedThread(msg)} className="flex items-center gap-1 rounded-full p-1 text-gray-500 opacity-0 transition-all hover:bg-white/10 hover:text-white group-hover:opacity-100">
                <MessageSquare className="h-4 w-4" />
                {msg.threadCount && msg.threadCount > 0 && <span className="text-xs">{msg.threadCount}</span>}
              </button>
            )}

            <button onClick={() => setReplyingTo(msg)} className="rounded-full p-1 text-gray-500 opacity-0 transition-all hover:bg-white/10 hover:text-white group-hover:opacity-100">
              <Reply className="h-4 w-4" />
            </button>

            {msg.senderId === profile?.uid && (
              <button onClick={() => deleteMessage(msg.id, isThread)} className="rounded-full p-1 text-gray-500 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <LayoutWrapper>
      <div className="flex h-screen bg-gray-900">
        {/* Sidebar */}
        <div className={`${showMobileForums ? "flex" : "hidden"} w-full flex-col border-r border-white/10 bg-gray-900 md:flex md:w-72`}>
          <div className="border-b border-white/10 p-4">
            <h1 className="text-lg font-semibold text-white">Forums</h1>
            <p className="text-sm text-gray-500">Connect with your community</p>
          </div>
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input type="text" placeholder="Search forums..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-20">
            {filteredForums.map((forum) => (
              <button key={forum.id} onClick={() => { setSelectedForum(forum); setShowMobileForums(false); setSelectedThread(null); }} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${selectedForum?.id === forum.id ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
                <span className="text-xl">{forum.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{forum.name}</p>
                  <p className="text-xs text-gray-500 truncate">{forum.memberCount} members</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-600 md:hidden" />
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className={`${showMobileForums ? "hidden" : "flex"} flex-1 flex-col md:flex`}>
          {selectedForum ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-white/10 bg-gray-900/80 px-4 py-3 backdrop-blur-xl">
                <button onClick={() => { setShowMobileForums(true); setSelectedThread(null); }} className="rounded-lg p-2 text-gray-400 hover:bg-white/10 md:hidden">
                  <ChevronRight className="h-5 w-5 rotate-180" />
                </button>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${selectedForum.color} text-lg`}>{selectedForum.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-500" />
                    <h2 className="font-semibold text-white">{selectedThread ? `Thread in #${selectedForum.name}` : selectedForum.name}</h2>
                  </div>
                  <p className="text-xs text-gray-500">{selectedThread ? `Replying to ${selectedThread.senderName}` : selectedForum.description}</p>
                </div>
                {selectedThread && (
                  <button onClick={() => setSelectedThread(null)} className="rounded-lg p-2 text-gray-400 hover:bg-white/10">
                    <X className="h-5 w-5" />
                  </button>
                )}
                <div className="flex items-center gap-2 text-gray-500">
                  <Users className="h-4 w-4" /><span className="text-sm">{selectedForum.memberCount}</span>
                </div>
              </div>

              {/* Messages / Thread */}
              <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
                <div className="mx-auto max-w-3xl space-y-4">
                  {selectedThread ? (
                    <>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <MessageComponent msg={selectedThread} />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <ChevronDown className="h-4 w-4" />
                        <span>{threadReplies.length} {threadReplies.length === 1 ? "reply" : "replies"}</span>
                      </div>
                      {threadReplies.map((msg) => <MessageComponent key={msg.id} msg={msg} isThread />)}
                    </>
                  ) : (
                    <>
                      {messages.length === 0 && (
                        <div className="py-12 text-center">
                          <MessageSquare className="mx-auto mb-3 h-12 w-12 text-gray-600" />
                          <p className="text-gray-400">No messages yet. Be the first to share!</p>
                        </div>
                      )}
                      {messages.map((msg) => <MessageComponent key={msg.id} msg={msg} />)}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input */}
              <div className="border-t border-white/10 bg-gray-900/80 p-4 backdrop-blur-xl">
                <div className="mx-auto max-w-3xl">
                  {/* Reply indicator */}
                  {replyingTo && (
                    <div className="mb-2 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Reply className="h-4 w-4 text-emerald-400" />
                        <span className="text-gray-400">Replying to</span>
                        <span className="font-medium text-white">{replyingTo.senderName}</span>
                      </div>
                      <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-white"><X className="h-4 w-4" /></button>
                    </div>
                  )}

                  {/* Image preview */}
                  {selectedImage && (
                    <div className="relative mb-2 inline-block">
                      <img src={selectedImage} alt="Preview" className="h-20 rounded-lg" />
                      <button onClick={() => setSelectedImage(null)} className="absolute -right-2 -top-2 rounded-full bg-gray-800 p-1 text-white hover:bg-gray-700"><X className="h-3 w-3" /></button>
                    </div>
                  )}

                  {/* Audio preview */}
                  {audioBlob && (
                    <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                      <audio controls src={URL.createObjectURL(audioBlob)} className="h-8 flex-1" />
                      <button onClick={() => setAudioBlob(null)} className="text-gray-500 hover:text-white"><X className="h-4 w-4" /></button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} className="hidden" />
                    
                    <button onClick={() => fileInputRef.current?.click()} className="rounded-lg p-2.5 text-gray-500 hover:bg-white/10 hover:text-white">
                      <ImageIcon className="h-5 w-5" />
                    </button>

                    <button onClick={isRecording ? stopRecording : startRecording} className={`rounded-lg p-2.5 transition-colors ${isRecording ? "bg-red-500/20 text-red-400" : "text-gray-500 hover:bg-white/10 hover:text-white"}`}>
                      {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>

                    <input
                      type="text"
                      placeholder={selectedThread ? "Reply in thread..." : `Message #${selectedForum.name.toLowerCase()}`}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage(!!selectedThread)}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 transition-colors focus:border-emerald-500/50 focus:outline-none"
                    />
                    
                    <Button onClick={() => sendMessage(!!selectedThread)} disabled={!inputText.trim() && !audioBlob && !selectedImage} className="rounded-lg bg-emerald-500 px-4 hover:bg-emerald-400">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="hidden flex-1 items-center justify-center md:flex">
              <div className="text-center">
                <MessageSquare className="mx-auto mb-4 h-16 w-16 text-gray-600" />
                <h2 className="text-xl font-semibold text-white">Select a forum</h2>
                <p className="mt-2 text-gray-500">Choose a community to join the conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </LayoutWrapper>
  );
}
