/**
 * TheraClick brand logo — actual logo image + optional wordmark.
 *
 * Single source of truth for the brand mark. Change it here,
 * it updates everywhere (sidebar, splash, auth screens).
 */

import Image from "next/image";

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
        src="/images/theraklick-logo.png"
        alt="TheraClick"
        width={s.img}
        height={s.img}
        className="shrink-0 object-contain"
        priority
      />
      {!iconOnly && (
        <span className={`${s.text} font-bold tracking-tight`}>
          TheraClick
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
      src="/images/theraklick-logo.png"
      alt="TheraClick"
      width={80}
      height={80}
      className={`object-contain ${className}`}
      priority
    />
  );
}
