import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  accent = "violet",
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  accent?: "violet" | "rose" | "amber" | "emerald";
}) {
  const iconStyles = {
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
    rose: "bg-rose-50 text-rose-600 ring-rose-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  };
  const accentLine = {
    violet: "from-violet-500 via-violet-300 to-transparent",
    rose: "from-rose-500 via-rose-300 to-transparent",
    amber: "from-amber-500 via-amber-300 to-transparent",
    emerald: "from-emerald-500 via-emerald-300 to-transparent",
  };

  return (
    <article className="elite-surface group relative overflow-hidden rounded-2xl p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(15,23,42,0.095)]">
      <span className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accentLine[accent]}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-slate-950">{value}</p>
        </div>
        <div className={cn("grid size-10 place-items-center rounded-xl ring-1", iconStyles[accent])}>
          <Icon className="size-[18px]" />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}
