export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className || ""}`}>
      <div className="relative h-10 w-10 rounded-lg border-2 border-gray-900">
        <div className="absolute bottom-1 left-1 h-6 w-6 rounded bg-primary-300"></div>
        <div className="absolute top-1 right-1 h-4 w-4 rounded bg-yellow-400"></div>
      </div>
      <span className="text-xl font-bold text-gray-900">Theraklick</span>
    </div>
  );
}


