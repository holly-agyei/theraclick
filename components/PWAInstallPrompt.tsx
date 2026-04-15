"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { X, Download, Share2, Smartphone } from "lucide-react";

const STORAGE_KEY = "theraklick_pwa_install_dismissed";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const t = Number.parseInt(raw, 10);
    if (Number.isNaN(t)) return false;
    return Date.now() - t < COOLDOWN_MS;
  } catch {
    return false;
  }
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PWAInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"chrome" | "ios" | "generic" | null>(null);
  const [installable, setInstallable] = useState(false);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const [webShareAvailable, setWebShareAvailable] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setWebShareAvailable(typeof navigator.share === "function");
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    deferredRef.current = null;
    setInstallable(false);
    setMode(null);
    setVisible(false);
    setShareHint(null);
  }, []);

  useEffect(() => {
    if (!isMobileViewport()) return;
    if (isStandalone()) return;
    if (wasDismissedRecently()) return;

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }

    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    let androidFallbackTimer: ReturnType<typeof setTimeout> | undefined;

    const onBip = (e: Event) => {
      e.preventDefault();
      const ev = e as BeforeInstallPromptEvent;
      deferredRef.current = ev;
      setInstallable(true);
      setMode("chrome");
      setVisible(true);
      if (androidFallbackTimer) {
        clearTimeout(androidFallbackTimer);
        androidFallbackTimer = undefined;
      }
    };
    window.addEventListener("beforeinstallprompt", onBip);

    if (isIos()) {
      iosTimer = setTimeout(() => {
        if (isStandalone()) return;
        if (wasDismissedRecently()) return;
        setMode("ios");
        setVisible(true);
      }, 2200);
    } else {
      androidFallbackTimer = setTimeout(() => {
        if (isStandalone()) return;
        if (wasDismissedRecently()) return;
        if (deferredRef.current) return;
        if (!isMobileViewport()) return;
        setMode("generic");
        setVisible(true);
      }, 4500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      if (iosTimer) clearTimeout(iosTimer);
      if (androidFallbackTimer) clearTimeout(androidFallbackTimer);
    };
  }, []);

  const onInstall = async () => {
    const d = deferredRef.current;
    if (!d) return;
    try {
      await d.prompt();
      await d.userChoice;
    } catch {
      /* user dismissed native sheet */
    }
    dismiss();
  };

  const onIosOpenShare = async () => {
    setShareHint(null);
    if (typeof navigator === "undefined" || !navigator.share) {
      setShareHint(
        "Use Safari’s own Share button in the toolbar (bottom or top): square with an arrow pointing up. Then choose Add to Home Screen."
      );
      return;
    }
    try {
      await navigator.share({
        title: "Theraklick",
        text: "Add Theraklick to your home screen from the next menu if you see it — or go back and use Safari’s Share → Add to Home Screen.",
        url: window.location.href,
      });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setShareHint(
        "Use Safari’s Share button in the browser toolbar, then Add to Home Screen. (Apple doesn’t let websites open that menu automatically.)"
      );
    }
  };

  if (!visible || isStandalone()) return null;

  const Icon = mode === "ios" ? Share2 : mode === "chrome" ? Download : Smartphone;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-label="Install app"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#0F4F47]/20 bg-white shadow-xl dark:border-white/10 dark:bg-gray-900">
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0F4F47]/10 text-[#0F4F47] dark:bg-[#2BB5A0]/20 dark:text-[#7BD8CA]">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[15px] font-bold text-gray-900 dark:text-white">Add Theraklick to your phone</p>
            {mode === "ios" && (
              <>
                <p className="mt-1 text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
                  Apple only allows this from <span className="font-semibold text-gray-800 dark:text-gray-200">Safari’s toolbar</span>
                  — not from this page. Tap the{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">Share</span> icon there (square with an arrow{" "}
                  <span className="whitespace-nowrap">↑</span>
                  ), scroll the list, then tap{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">Add to Home Screen</span>.
                </p>
                {webShareAvailable ? (
                  <button
                    type="button"
                    onClick={() => void onIosOpenShare()}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F4F47] py-2.5 text-[14px] font-semibold text-white transition-colors active:scale-[0.99] hover:bg-[#0a3d36] dark:bg-[#2BB5A0] dark:text-[#0D1F1D] dark:hover:bg-[#5ad4c4]"
                  >
                    <Share2 className="h-4 w-4 shrink-0" aria-hidden />
                    Open Share sheet
                  </button>
                ) : null}
                <p className="mt-2 text-[11px] leading-snug text-gray-500 dark:text-gray-500">
                  If you’re in Chrome or an in-app browser, open this site in <strong>Safari</strong> first — Add to Home Screen only works there on iPhone.
                </p>
                {shareHint ? (
                  <p className="mt-2 text-[12px] leading-relaxed text-amber-800 dark:text-amber-200/90">{shareHint}</p>
                ) : null}
              </>
            )}
            {mode === "generic" && (
              <p className="mt-1 text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
                Open your browser menu (often <span className="font-semibold">⋮</span> or{" "}
                <span className="font-semibold">Install</span>) and choose{" "}
                <span className="font-semibold text-gray-900 dark:text-white">Add to Home screen</span> or{" "}
                <span className="font-semibold text-gray-900 dark:text-white">Install app</span>.
              </p>
            )}
            {mode === "chrome" && installable && (
              <>
                <p className="mt-1 text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
                  Install for quick access from your home screen.
                </p>
                <button
                  type="button"
                  onClick={() => void onInstall()}
                  className="mt-3 w-full rounded-xl bg-[#0F4F47] py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#0a3d36] active:scale-[0.99] dark:bg-[#2BB5A0] dark:text-[#0D1F1D] dark:hover:bg-[#5ad4c4]"
                >
                  Install app
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
