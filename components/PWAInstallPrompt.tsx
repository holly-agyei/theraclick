"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Download, Share2, Smartphone, ChevronDown, ChevronUp, Link2 } from "lucide-react";

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

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PWAInstallPrompt() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [mode, setMode] = useState<"chrome" | "ios" | "generic">("generic");
  const [installable, setInstallable] = useState(false);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  const needsNavClearance = /^\/(student|counselor|peer-mentor)(\/|$)/.test(pathname ?? "");

  useEffect(() => {
    setMounted(true);
  }, []);

  const setMinimized = useCallback((min: boolean) => {
    setExpanded(!min);
  }, []);

  useEffect(() => {
    setExpanded(true);
  }, [pathname]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (!isMobileViewport() || isStandalone()) return;
      setExpanded(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let androidFallbackTimer: ReturnType<typeof setTimeout> | undefined;

    const onBip = (e: Event) => {
      e.preventDefault();
      const ev = e as BeforeInstallPromptEvent;
      deferredRef.current = ev;
      setInstallable(true);
      setMode("chrome");
      if (androidFallbackTimer) {
        clearTimeout(androidFallbackTimer);
        androidFallbackTimer = undefined;
      }
    };

    const sync = () => {
      if (!isMobileViewport() || isStandalone()) {
        setEligible(false);
        window.removeEventListener("beforeinstallprompt", onBip);
        if (androidFallbackTimer) {
          clearTimeout(androidFallbackTimer);
          androidFallbackTimer = undefined;
        }
        return;
      }

      setEligible(true);
      setMode((prev) => {
        if (deferredRef.current || prev === "chrome") return "chrome";
        return isIos() ? "ios" : "generic";
      });

      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
      }

      window.removeEventListener("beforeinstallprompt", onBip);
      window.addEventListener("beforeinstallprompt", onBip);

      if (!isIos()) {
        if (androidFallbackTimer) clearTimeout(androidFallbackTimer);
        androidFallbackTimer = setTimeout(() => {
          if (isStandalone()) return;
          if (deferredRef.current) return;
          if (!isMobileViewport()) return;
          setMode((m) => (m === "chrome" ? "chrome" : "generic"));
        }, 1200);
      }
    };

    sync();
    const mq = window.matchMedia("(max-width: 768px)");
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("beforeinstallprompt", onBip);
      if (androidFallbackTimer) clearTimeout(androidFallbackTimer);
    };
  }, [mounted]);

  const onInstall = async () => {
    const d = deferredRef.current;
    if (!d) return;
    try {
      await d.prompt();
      await d.userChoice;
    } catch {
      /* user dismissed native sheet */
    }
    setMinimized(true);
  };

  const onCopyLink = async () => {
    setShareHint(null);
    setCopyDone(false);
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyDone(true);
    } catch {
      setShareHint("Long-press the address bar to copy the link, then open it in Safari.");
    }
  };

  if (!mounted || !eligible || isStandalone()) return null;

  const bottomOffset = needsNavClearance
    ? "calc(4.25rem + env(safe-area-inset-bottom, 0px))"
    : "max(12px, env(safe-area-inset-bottom, 0px))";

  const shellZ = 100050;

  const collapsedBar = (
    <button
      type="button"
      onClick={() => setMinimized(false)}
      className="flex w-full max-w-lg items-center justify-center gap-2 rounded-t-2xl border border-b-0 border-[#0F4F47]/25 bg-[#0F4F47] py-2.5 pl-4 pr-4 text-[13px] font-semibold text-white shadow-lg touch-manipulation dark:border-[#2BB5A0]/40 dark:bg-[#0a3d36]"
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        right: "auto",
        width: "min(100% - 1.5rem, 32rem)",
        bottom: bottomOffset,
        zIndex: shellZ,
      }}
    >
      <ChevronUp className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
      Add Theraklick to your phone
    </button>
  );

  const expandedCard = (
    <div
      className="flex w-full max-w-lg justify-center px-3 pt-0 touch-manipulation"
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(100%, 36rem)",
        bottom: bottomOffset,
        zIndex: shellZ,
      }}
      role="dialog"
      aria-label="Install Theraklick on your phone"
    >
      <div className="w-full overflow-hidden rounded-2xl border border-[#0F4F47]/20 bg-white shadow-2xl dark:border-white/10 dark:bg-gray-900">
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0F4F47]/10 text-[#0F4F47] dark:bg-[#2BB5A0]/20 dark:text-[#7BD8CA]">
            {mode === "ios" ? (
              <Share2 className="h-5 w-5" aria-hidden />
            ) : mode === "chrome" ? (
              <Download className="h-5 w-5" aria-hidden />
            ) : (
              <Smartphone className="h-5 w-5" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[15px] font-bold text-gray-900 dark:text-white">Add Theraklick to your phone</p>
            {mode === "ios" && (
              <>
                <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-[12px] leading-snug text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                  <strong className="font-semibold">Important:</strong> any “share this page” button inside a website only
                  sends the link to WhatsApp, Messages, etc. It does <strong>not</strong> show{" "}
                  <strong>Add to Home Screen</strong>. That option exists only in{" "}
                  <strong>Safari’s own toolbar</strong> (the browser chrome), not inside our page.
                </p>
                <ol className="mt-3 list-decimal space-y-2 pl-4 text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
                  <li>
                    Make sure you are in <strong className="text-gray-900 dark:text-gray-200">Safari</strong> (blue/white
                    compass icon), not Chrome or an in-app browser.
                  </li>
                  <li>
                    Tap the <strong className="text-gray-900 dark:text-gray-200">Share</strong> icon in Safari’s{" "}
                    <strong>bottom bar</strong> (small square with an arrow pointing up — it is part of Safari’s UI, above
                    the home indicator).
                  </li>
                  <li>
                    Scroll the gray sheet and tap <strong className="text-gray-900 dark:text-gray-200">Add to Home Screen</strong>.
                  </li>
                </ol>
                <button
                  type="button"
                  onClick={() => void onCopyLink()}
                  className="mt-3 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#0F4F47] px-4 py-3 text-[15px] font-semibold text-white active:bg-[#0c4540] dark:bg-[#2BB5A0] dark:text-[#0D1F1D] dark:active:bg-[#48c9b8]"
                >
                  <Link2 className="h-5 w-5 shrink-0" aria-hidden />
                  {copyDone ? "Copied — now paste in Safari’s address bar" : "Copy link — paste in Safari if needed"}
                </button>
                <p className="mt-2 text-[11px] leading-snug text-gray-500 dark:text-gray-500">
                  Opened this link from Instagram / TikTok / Messages? Copy the link, open <strong>Safari</strong>, paste
                  into the address bar, go to the site, then use Safari’s <strong>Share → Add to Home Screen</strong>.
                </p>
                {shareHint ? (
                  <p className="mt-2 text-[12px] leading-relaxed text-amber-800 dark:text-amber-200/90">{shareHint}</p>
                ) : null}
              </>
            )}
            {mode === "generic" && (
              <p className="mt-1 text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
                Open the browser menu (<span className="font-semibold">⋮</span> or <span className="font-semibold">Install</span>
                ), then <span className="font-semibold text-gray-900 dark:text-white">Add to Home screen</span> or{" "}
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
                  className="mt-3 w-full min-h-[48px] rounded-xl bg-[#0F4F47] px-4 py-3 text-[15px] font-semibold text-white active:bg-[#0c4540] dark:bg-[#2BB5A0] dark:text-[#0D1F1D] dark:active:bg-[#48c9b8]"
                >
                  Install app
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 active:bg-gray-200 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Minimize install hint"
          >
            <ChevronDown className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );

  const node = expanded ? expandedCard : collapsedBar;
  return createPortal(node, document.body);
}
