"use client";

/**
 * Lightweight emoji picker — no external dependencies.
 *
 * WHY build our own instead of using a library?
 * Libraries like emoji-mart add ~200KB+ to the bundle.
 * For a chat app, a compact grid of common emojis is enough.
 *
 * PATTERN: Controlled component — parent handles the selected emoji via onSelect callback.
 */

import { useState, useRef, useEffect } from "react";
import { Smile, X } from "lucide-react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

const emojiCategories: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: [
      "😊", "😂", "🥹", "😭", "😅", "😍", "🥰", "😘", "😜", "😎",
      "🤔", "😳", "😤", "😢", "😴", "🤗", "🤭", "😬", "🙄", "😌",
      "🥺", "😏", "🤣", "😇", "🫠", "🤯", "😡", "🥲", "😋", "🤩",
    ],
  },
  {
    label: "Gestures",
    emojis: [
      "👍", "👎", "👏", "🙌", "🤝", "✌️", "🤞", "💪", "🙏", "👋",
      "🫶", "❤️", "🔥", "💯", "⭐", "✨", "💔", "💕", "💖", "💗",
    ],
  },
  {
    label: "Reactions",
    emojis: [
      "😮", "👀", "🎉", "🥳", "💀", "☠️", "🤡", "👻", "😈", "🤮",
      "🤢", "🥴", "😵", "🫣", "🫡", "🫥", "🤥", "😶", "😑", "😐",
    ],
  },
  {
    label: "Nature",
    emojis: [
      "🌸", "🌺", "🌻", "🌿", "🍀", "🌙", "⛅", "🌈", "🦋", "🐝",
      "🌊", "🍃", "🌴", "🌵", "🍂", "🌾", "☀️", "🌤️", "❄️", "💧",
    ],
  },
  {
    label: "Objects",
    emojis: [
      "📚", "✏️", "💻", "📱", "🎵", "🎧", "☕", "🍵", "🎯", "💡",
      "📝", "📌", "🗓️", "⏰", "🔔", "🎓", "🏠", "🚀", "🎨", "🧠",
    ],
  },
];

export function EmojiPicker({ onSelect, className = "" }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <div ref={pickerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-all
          ${isOpen
            ? "bg-green-100 dark:bg-green-900 text-green-600"
            : "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Smile className="h-5 w-5" />}
      </button>

      {/* Picker dropdown */}
      {isOpen && (
        <div className="absolute bottom-12 left-0 z-50 w-[280px] rounded-2xl border border-gray-200 dark:border-gray-800
          bg-white dark:bg-gray-950 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Category tabs */}
          <div className="flex border-b border-gray-100 dark:border-gray-800 px-2 pt-2">
            {emojiCategories.map((cat, i) => (
              <button
                key={cat.label}
                onClick={() => setActiveTab(i)}
                className={`flex-1 rounded-t-lg px-1 py-1.5 text-[10px] font-medium transition-colors
                  ${activeTab === i
                    ? "bg-green-50 dark:bg-green-950 text-green-700"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="grid grid-cols-8 gap-0.5 p-2 max-h-[200px] overflow-y-auto">
            {emojiCategories[activeTab].emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onSelect(emoji);
                  // Don't close — let user pick multiple
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg
                  hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-90 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
