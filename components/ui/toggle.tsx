import * as React from "react";
import { cn } from "@/lib/utils";

interface ToggleProps {
  value: string;
  selected: boolean;
  onSelect: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Toggle({
  value,
  selected,
  onSelect,
  children,
  className,
}: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-4 py-3 transition-colors",
        selected
          ? "border-gray-800 bg-white text-gray-900"
          : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100",
        className
      )}
    >
      {children}
    </button>
  );
}


