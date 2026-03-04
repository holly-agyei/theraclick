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
          ? "border-gray-800 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
          : "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
        className
      )}
    >
      {children}
    </button>
  );
}


