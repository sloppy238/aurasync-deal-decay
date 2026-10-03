import { PageHeader } from "@/components/PageHeader";
import { MomentumGlyph } from "@/components/MomentumGlyph";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Ban, CheckCircle2, Database, EyeOff, Fingerprint, FileClock, LockKeyhole, Route, ShieldCheck } from "lucide-react";

const controlIcons = [EyeOff, Fingerprint, LockKeyhole, Route];

export default function Governance() {
  const { data, isLoading } = trpc.aurasync.governance.useQuery();
  if (isLoading || !data) return <div className="space-y-5"><Skeleton className="h-36 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>;

  return (
    <div className="enter-rise mx-auto max-w-[1500px] space-y-6">
      <PageHeader eyebrow="Privacy & governance" title="A narrow data boundary, visible by design." description="AuraSync documents what enters the platform, what is explicitly blocked, how long metadata is retained, and how every risk signal can be traced to its source." />

      <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-[0_20px_55px_rgba(15,23,42,0.22)] md:p-8">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-violet-600/20 blur-3xl" />
        <MomentumGlyph className="absolute -right-16 -top-20 w-80 opacity-15" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.4fr)] lg:items-center">
          <div><div className="flex size-11 items-center justify-center rounded-xl bg-cyan-300/10 ring-1 ring-cyan-300/20"><ShieldCheck className="size-5 text-cyan-300" /></div><p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Boundary posture · {data.posture}</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em]">Content never enters the system.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Relationship signals are computed from event timing, pseudonymized participants, channel identifiers, thread relationships, and CRM context—never the meaning of a conversation.</p></div>
          <div className="grid gap-3 sm:grid-cols-4">
            {data.processingStages.map((stage, index) => <div key={stage.title} className="relative rounded-xl border border-white/10 bg-white/[0.04] p-4"><span className="font-mono text-[10px] text-cyan-300">0{index + 1}</span><p className="mt-4 text-sm font-semibold">{stage.title}</p><p className="mt-2 text-[11px] leading-4 text-slate-400">{stage.description}</p>{index < data.processingStages.length - 1 ? <span className="absolute -right-2 top-1/2 hidden size-4 -translate-y-1/2 rounded-full border border-white/10 bg-slate-950 lg:block" /> : null}</div>)}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.controls.map((control, index) => { const Icon = controlIcons[index]; return <Card key={control.name} className="elite-surface border-0"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600"><Icon className="size-4" /></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">{control.status}</span></div><h3 className="mt-5 text-sm font-semibold text-slate-950">{control.name}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{control.detail}</p></CardContent></Card>; })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-emerald-200 bg-emerald-50/50 shadow-none"><CardContent className="p-6"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700"><CheckCircle2 className="size-4" /> Collected and processed</div><div className="mt-5 grid gap-2 sm:grid-cols-2">{data.collectedFields.map(field => <div key={field} className="flex items-start gap-2 rounded-xl bg-white/70 p-3 text-xs text-slate-600"><Database className="mt-0.5 size-3.5 shrink-0 text-emerald-600" /> {field}</div>)}</div></CardContent></Card>
        <Card className="border-rose-200 bg-rose-50/50 shadow-none"><CardContent className="p-6"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700"><Ban className="size-4" /> Explicitly not collected</div><div className="mt-5 grid gap-2 sm:grid-cols-2">{data.prohibitedFields.map(field => <div key={field} className="flex items-start gap-2 rounded-xl bg-white/70 p-3 text-xs text-slate-600"><EyeOff className="mt-0.5 size-3.5 shrink-0 text-rose-600" /> {field}</div>)}</div></CardContent></Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><FileClock className="size-5 text-violet-600" /><p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Retention posture</p><p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{data.retentionDays} days</p><p className="mt-2 text-xs leading-5 text-slate-500">Rolling metadata retention for the demo policy. Aggregates may be recomputed after source events expire.</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><Fingerprint className="size-5 text-violet-600" /><p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Signal provenance</p><p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Traceable</p><p className="mt-2 text-xs leading-5 text-slate-500">Each score component records its source, observation window, baseline, current value, and weighted contribution.</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><LockKeyhole className="size-5 text-violet-600" /><p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Review cadence</p><p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Quarterly</p><p className="mt-2 text-xs leading-5 text-slate-500">Last reviewed {formatDate(data.lastReviewAtMs)}. Next scheduled review {formatDate(data.nextReviewAtMs)}.</p></div>
      </section>
    </div>
  );
}
