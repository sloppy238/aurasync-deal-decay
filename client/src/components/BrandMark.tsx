import { cn } from "@/lib/utils";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
        <span className="absolute size-5 rounded-full border border-cyan-300/70" />
        <span className="absolute size-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.9)]" />
        <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-violet-300" />
      </div>
      <div className={cn("min-w-0", compact && "hidden")}>
        <p className="truncate text-[15px] font-semibold tracking-[-0.02em] text-white">AuraSync</p>
        <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Deal intelligence</p>
      </div>
    </div>
  );
}
