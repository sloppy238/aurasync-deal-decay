import { cn } from "@/lib/utils";

export function MomentumGlyph({ className }: { className?: string }) {
  return (
    <div className={cn("relative aspect-square", className)} aria-hidden="true">
      <div className="absolute inset-[8%] rounded-full border border-cyan-300/20" />
      <div className="absolute inset-[23%] rounded-full border border-violet-300/25" />
      <div className="absolute inset-[38%] rounded-full bg-cyan-300/10 shadow-[0_0_50px_rgba(103,232,249,.18)] ring-1 ring-cyan-300/30" />
      <div className="absolute left-1/2 top-[8%] h-[84%] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
      <div className="absolute left-[8%] top-1/2 h-px w-[84%] -translate-y-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="absolute left-[21%] top-[27%] size-2.5 rounded-full bg-violet-300 shadow-[0_0_18px_rgba(196,181,253,.8)]" />
      <div className="absolute right-[13%] top-[43%] size-3 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,.9)]" />
      <div className="absolute bottom-[17%] left-[38%] size-2 rounded-full bg-rose-300 shadow-[0_0_16px_rgba(253,164,175,.8)]" />
      <div className="absolute left-[38%] top-[38%] size-[24%] rounded-full border border-white/20 bg-slate-950/70 backdrop-blur-sm">
        <div className="absolute inset-[28%] rounded-full bg-cyan-300" />
      </div>
      <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100">
        <path d="M22 28 Q46 2 87 44" fill="none" stroke="rgba(103,232,249,.38)" strokeWidth=".8" strokeDasharray="2 3" />
        <path d="M39 83 Q74 73 87 44" fill="none" stroke="rgba(196,181,253,.42)" strokeWidth=".8" />
        <path d="M22 28 Q18 67 39 83" fill="none" stroke="rgba(253,164,175,.32)" strokeWidth=".8" strokeDasharray="1.5 2.5" />
      </svg>
    </div>
  );
}
