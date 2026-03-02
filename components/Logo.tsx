/**
 * Theraklick brand logo — brain icon + wordmark.
 *
 * WHY a dedicated component instead of inline SVG?
 * Single source of truth for the brand mark. Change it here,
 * it updates everywhere (sidebar, splash, auth screens).
 */

import { Brain } from "lucide-react";

interface LogoProps {
  className?: string;
  size?: "sm" | "default" | "lg";
  /** Show only the icon, no text */
  iconOnly?: boolean;
}

const sizeMap = {
  sm:      { box: "h-8 w-8",   icon: "h-4 w-4", text: "text-base" },
  default: { box: "h-10 w-10", icon: "h-5 w-5", text: "text-xl" },
  lg:      { box: "h-14 w-14", icon: "h-7 w-7", text: "text-2xl" },
};

export function Logo({ className = "", size = "default", iconOnly }: LogoProps) {
  const s = sizeMap[size];
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Tinted background box with the brain icon */}
      <div
        className={`${s.box} flex shrink-0 items-center justify-center rounded-xl bg-primary-400/15`}
      >
        <Brain className={`${s.icon} text-primary-400`} strokeWidth={1.8} />
      </div>
      {!iconOnly && (
        <span className={`${s.text} font-bold tracking-tight`}>
          Theraklick
        </span>
      )}
    </div>
  );
}

/**
 * Standalone brain icon for the splash / hero screens.
 * Renders at whatever size you give it via className.
 */
export function BrainMark({ className = "" }: { className?: string }) {
  return (
    <Brain className={className} strokeWidth={1.5} />
  );
}
