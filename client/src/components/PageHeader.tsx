import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="relative flex flex-col gap-5 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <span className="absolute -bottom-px left-0 h-px w-24 bg-gradient-to-r from-violet-600 to-cyan-400" />
      <div className="max-w-3xl">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600">{eyebrow}</p>
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
            <ShieldCheck className="mr-1 size-3" />
            Metadata only · Content excluded
          </Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.045em] text-slate-950 md:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
