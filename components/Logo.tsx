/**
 * Theraklick brand logo — actual logo image + optional wordmark.
 *
 * Single source of truth for the brand mark. Change it here,
 * it updates everywhere (sidebar, splash, auth screens).
 */

import Image from "next/image";

/** Bump when replacing the file so browsers and CDNs fetch the new asset. */
export const THERAKLICK_LOGO_SRC = "/images/theraklick-logo.png?v=2";

interface LogoProps {
  className?: string;
  size?: "sm" | "default" | "lg";
  /** Show only the icon, no text */
  iconOnly?: boolean;
}

const sizeMap = {
  sm:      { img: 32, text: "text-base" },
  default: { img: 40, text: "text-xl" },
  lg:      { img: 56, text: "text-2xl" },
};

export function Logo({ className = "", size = "default", iconOnly }: LogoProps) {
  const s = sizeMap[size];
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src={THERAKLICK_LOGO_SRC}
        alt="Theraklick"
        width={s.img}
        height={s.img}
        unoptimized
        className="shrink-0 bg-transparent object-contain"
        priority
      />
      {!iconOnly && (
        <span className={`${s.text} font-bold tracking-tight`}>
          Theraklick
        </span>
      )}
    </div>
  );
}

/**
 * Standalone logo mark for splash / hero screens.
 */
export function BrainMark({ className = "" }: { className?: string }) {
  return (
    <Image
      src={THERAKLICK_LOGO_SRC}
      alt="Theraklick"
      width={80}
      height={80}
      unoptimized
      className={`bg-transparent object-contain ${className}`}
      priority
    />
  );
}
