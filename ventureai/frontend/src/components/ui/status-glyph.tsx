import { cn } from "@/lib/utils";

/**
 * The signature status device. Availability is communicated with shape and
 * motion only — a filled, pulsing square for live; a hollow square for pending.
 * No color is ever used to encode state (the system is strictly achromatic).
 *
 * Everything is drawn in `currentColor`, so the glyph inverts automatically
 * when its container flips from paper to ink (e.g. on card hover).
 */
export function StatusGlyph({
  available,
  className,
}: {
  available: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className={cn(
          "h-2 w-2",
          available
            ? "animate-pulse-dot bg-current"
            : "border border-current/50 bg-transparent",
        )}
      />
      <span className="font-mono text-[10px] uppercase tracking-ledger opacity-70">
        {available ? "Live" : "Pending"}
      </span>
    </span>
  );
}
