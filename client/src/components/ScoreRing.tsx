import { cn } from "@/lib/utils";

export function ScoreRing({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const color = score >= 80 ? "#e11d48" : score >= 65 ? "#d97706" : score >= 45 ? "#7c3aed" : "#059669";
  const degrees = Math.round((score / 100) * 360);
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full",
        size === "sm" && "size-10",
        size === "md" && "size-14",
        size === "lg" && "size-28",
      )}
      style={{ background: `conic-gradient(${color} ${degrees}deg, #e8edf4 ${degrees}deg)` }}
      aria-label={`Decay score ${score} out of 100`}
    >
      <div
        className={cn(
          "grid place-items-center rounded-full bg-white font-semibold text-slate-950",
          size === "sm" && "size-8 text-xs",
          size === "md" && "size-11 text-sm",
          size === "lg" && "size-[92px] text-3xl tracking-[-0.04em]",
        )}
      >
        {score}
      </div>
    </div>
  );
}
