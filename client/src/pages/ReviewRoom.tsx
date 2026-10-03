import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Check, CheckCircle2, ClipboardCheck, Download, FileText, LockKeyhole, RotateCcw, ShieldCheck, Timer, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const REVIEW_STATE_KEY = "aurasync:review-room:v1";
const checklist = [
  { id: "boundary", label: "Metadata-only collection boundary confirmed", detail: "No content-bearing fields appear in the active ingestion contract." },
  { id: "provenance", label: "Signal provenance sample reviewed", detail: "Each score component exposes source, observation time, baseline, and current value." },
  { id: "retention", label: "Retention posture acknowledged", detail: "The workspace retains metadata for the configured rolling window only." },
  { id: "purpose", label: "Purpose limitation acknowledged", detail: "Signals are used for deal operating decisions, not individual profiling." },
];

type ReviewState = Record<string, boolean>;

function readState(): ReviewState {
  try {
    return JSON.parse(sessionStorage.getItem(REVIEW_STATE_KEY) ?? "{}") as ReviewState;
  } catch {
    return {};
  }
}

export default function ReviewRoom() {
  const { data, isLoading } = trpc.aurasync.governance.useQuery();
  const [state, setState] = useState<ReviewState>(() => readState());

  useEffect(() => {
    sessionStorage.setItem(REVIEW_STATE_KEY, JSON.stringify(state));
  }, [state]);

  const completedCount = checklist.filter(item => state[item.id]).length;
  const reviewComplete = completedCount === checklist.length;
  const completion = useMemo(() => Math.round((completedCount / checklist.length) * 100), [completedCount]);

  const toggle = (id: string) => setState(current => ({ ...current, [id]: !current[id] }));
  const reset = () => {
    setState({});
    toast.success("Review checklist reset");
  };

  const downloadReview = () => {
    if (!data) return;
    const lines = [
      "AURASYNC GOVERNANCE REVIEW",
      `Review posture: ${reviewComplete ? "Complete" : "Open"}`,
      `Retention: ${data.retentionDays} days`,
      `Last reviewed: ${formatDate(data.lastReviewAtMs)}`,
      `Next review: ${formatDate(data.nextReviewAtMs)}`,
      "",
      ...checklist.map(item => `${state[item.id] ? "[x]" : "[ ]"} ${item.label}\n    ${item.detail}`),
      "",
      "Boundary: metadata in, signals out. Content is excluded from collection and scoring.",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "aurasync-governance-review.txt";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Review brief downloaded");
  };

  if (isLoading || !data) return <div className="space-y-5"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>;

  return (
    <div className="enter-rise mx-auto max-w-[1500px] space-y-6">
      <PageHeader eyebrow="Review room" title="Make the boundary reviewable, not assumed." description="A lightweight control room for periodic review of collection posture, signal provenance, and purpose limitation." actions={<div className="flex flex-wrap gap-2"><Button variant="outline" className="bg-white" onClick={reset}><RotateCcw className="size-4" /> Reset review</Button><Button onClick={downloadReview}><Download className="size-4" /> Export review brief</Button></div>} />

      <section className="relative overflow-hidden rounded-[26px] bg-slate-950 p-6 text-white shadow-[0_24px_65px_rgba(15,23,42,.18)] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(6,182,212,.18),transparent_30%),radial-gradient(circle_at_25%_100%,rgba(124,58,237,.2),transparent_35%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center"><div><div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300"><ClipboardCheck className="size-3.5" /> Governance review / {data.posture}</div><h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.05em] md:text-4xl">Evidence, controls, and accountable review.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Review the system as a set of constrained decisions. Complete the record, export it for your operating meeting, and keep the score inside its stated boundary.</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5"><div className="flex items-center justify-between gap-4"><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">Review completion</p><span className="font-mono text-sm text-cyan-300">{completion}%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300 transition-all duration-200" style={{ width: `${completion}%` }} /></div><p className="mt-3 text-xs text-slate-400">{reviewComplete ? "Review ready for sign-off." : `${checklist.length - completedCount} controls remain open.`}</p></div></div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3"><Card className="border-slate-200/80"><CardContent className="p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700"><LockKeyhole className="size-4" /> Posture</div><p className="mt-3 text-2xl font-semibold text-slate-950">{data.posture}</p><p className="mt-1 text-xs text-slate-500">active boundary enforcement state.</p></CardContent></Card><Card className="border-slate-200/80"><CardContent className="p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700"><Timer className="size-4" /> Retention</div><p className="mt-3 text-2xl font-semibold text-slate-950">{data.retentionDays} days</p><p className="mt-1 text-xs text-slate-500">rolling metadata retention window.</p></CardContent></Card><Card className={`${reviewComplete ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}><CardContent className="p-5"><div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] ${reviewComplete ? "text-emerald-700" : "text-amber-700"}`}>{reviewComplete ? <CheckCircle2 className="size-4" /> : <Timer className="size-4" />} Status</div><p className="mt-3 text-2xl font-semibold text-slate-950">{reviewComplete ? "Ready" : "In review"}</p><p className="mt-1 text-xs text-slate-500">next review {formatDate(data.nextReviewAtMs)}.</p></CardContent></Card></section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]"><Card className="border-slate-200/80"><CardHeader className="border-b border-slate-100"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700"><ClipboardCheck className="size-4" /> Control ledger</div><CardTitle className="mt-1 text-xl tracking-[-0.03em]">Complete the review record</CardTitle><p className="text-xs text-slate-500">This checklist is stored in the active browser session until you export or reset it.</p></CardHeader><CardContent className="divide-y divide-slate-100 p-0">{checklist.map(item => { const checked = Boolean(state[item.id]); return <button key={item.id} onClick={() => toggle(item.id)} className="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-slate-50"><span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border ${checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent"}`}>{checked ? <Check className="size-4" /> : <X className="size-4" />}</span><span className="min-w-0 flex-1"><span className={`block text-sm font-semibold ${checked ? "text-slate-500 line-through" : "text-slate-950"}`}>{item.label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{item.detail}</span></span><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${checked ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{checked ? "Reviewed" : "Open"}</span></button>; })}</CardContent></Card><div className="space-y-4"><Card className="border-cyan-200 bg-cyan-50/70"><CardContent className="p-5"><div className="flex items-center gap-2 text-xs font-semibold text-cyan-800"><ShieldCheck className="size-4" /> What the record proves</div><p className="mt-3 text-sm leading-6 text-slate-700">The system can demonstrate that its collection boundary, provenance posture, retention window, and purpose limitation were reviewed.</p><div className="mt-4 border-t border-cyan-200 pt-4 text-xs text-slate-500"><p>Last system review</p><p className="mt-1 font-semibold text-slate-800">{formatDate(data.lastReviewAtMs)}</p></div></CardContent></Card><Card className="border-slate-200/80"><CardHeader><CardTitle className="text-lg tracking-[-0.03em]">Review controls</CardTitle></CardHeader><CardContent className="space-y-3 text-xs leading-5 text-slate-600"><p className="flex gap-2"><FileText className="mt-0.5 size-4 shrink-0 text-violet-600" /> Export a plain-text brief for your decision record.</p><p className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-cyan-600" /> Keep controls separate from score output.</p><p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Re-run the checklist when the source posture changes.</p></CardContent></Card></div></section>
    </div>
  );
}
