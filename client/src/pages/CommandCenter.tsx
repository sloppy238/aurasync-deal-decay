import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { ScoreRing } from "@/components/ScoreRing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CalendarClock, Check, Download, Flag, Gauge, Layers3, RotateCcw, ShieldCheck, TimerReset } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const COMPLETED_KEY = "aurasync:command-center:completed:v1";
const SNOOZED_KEY = "aurasync:command-center:snoozed:v1";

type QueueState = Record<string, boolean>;

function readState(key: string): QueueState {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? "{}") as QueueState;
  } catch {
    return {};
  }
}

export default function CommandCenter() {
  const [, navigate] = useLocation();
  const { data: dashboard, isLoading: dashboardLoading } = trpc.aurasync.dashboard.useQuery();
  const { data: deals, isLoading: dealsLoading } = trpc.aurasync.deals.useQuery();
  const [completed, setCompleted] = useState<QueueState>(() => readState(COMPLETED_KEY));
  const [snoozed, setSnoozed] = useState<QueueState>(() => readState(SNOOZED_KEY));

  useEffect(() => {
    sessionStorage.setItem(COMPLETED_KEY, JSON.stringify(completed));
  }, [completed]);

  useEffect(() => {
    sessionStorage.setItem(SNOOZED_KEY, JSON.stringify(snoozed));
  }, [snoozed]);

  const queue = useMemo(() => (dashboard?.prioritizedAlerts ?? []).map(alert => ({
    ...alert,
    deal: deals?.find(deal => deal.id === alert.dealId),
  })), [dashboard?.prioritizedAlerts, deals]);
  const activeQueue = queue.filter(item => !completed[item.dealId] && !snoozed[item.dealId]);
  const completedCount = queue.filter(item => completed[item.dealId]).length;
  const snoozedCount = queue.filter(item => snoozed[item.dealId]).length;

  const toggleCompleted = (dealId: string) => {
    setCompleted(current => ({ ...current, [dealId]: !current[dealId] }));
    toast.success(completed[dealId] ? "Action returned to the active queue" : "Action marked complete");
  };

  const snooze = (dealId: string) => {
    setSnoozed(current => ({ ...current, [dealId]: true }));
    toast.success("Action snoozed for this session");
  };

  const restoreAll = () => {
    setCompleted({});
    setSnoozed({});
    toast.success("Command queue restored");
  };

  const downloadBrief = () => {
    if (!dashboard) return;
    const lines = [
      "AURASYNC COMMAND BRIEF",
      `Generated: ${new Date(dashboard.workspace.asOfMs).toISOString()}`,
      `Portfolio health: ${dashboard.summary.portfolioHealth}/100`,
      `At-risk value: ${formatCurrency(dashboard.summary.atRiskValue)}`,
      "",
      ...activeQueue.map((item, index) => `${index + 1}. ${item.account} — ${item.recommendation.title} (${item.recommendation.dueInDays}d)\n   Signal: ${item.signal?.label}\n   Evidence: ${item.signal?.evidence}`),
      "",
      "Boundary: metadata in, signals out. No communication content is included.",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "aurasync-command-brief.txt";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Command brief downloaded");
  };

  if (dashboardLoading || dealsLoading || !dashboard) {
    return <div className="space-y-5"><Skeleton className="h-36 rounded-2xl" /><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div><Skeleton className="h-96 rounded-2xl" /></div>;
  }

  return (
    <div className="enter-rise mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        eyebrow="Operating command"
        title="Move the signal before it becomes the stall."
        description="A focused action queue for the relationship changes that deserve an accountable next move—not another dashboard glance."
        actions={<Button variant="outline" className="bg-white" onClick={downloadBrief}><Download className="size-4" /> Download brief</Button>}
      />

      <section className="relative overflow-hidden rounded-[26px] bg-slate-950 p-6 text-white shadow-[0_24px_65px_rgba(15,23,42,.18)] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(6,182,212,.2),transparent_28%),radial-gradient(circle_at_35%_100%,rgba(124,58,237,.18),transparent_35%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300"><Gauge className="size-3.5" /> Intervention control layer</div>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.05em] md:text-4xl">The next best action is a product surface.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">AuraSync turns explainable metadata shifts into a small, ordered queue. Mark the move, snooze the noise, and keep the operating record separate from the score.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[{ label: "Active", value: activeQueue.length, tone: "text-cyan-300" }, { label: "Done", value: completedCount, tone: "text-emerald-300" }, { label: "Snoozed", value: snoozedCount, tone: "text-amber-300" }].map(item => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">{item.label}</p><p className={`mt-3 text-3xl font-semibold tracking-[-0.05em] ${item.tone}`}>{item.value}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200/80"><CardContent className="p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700"><Flag className="size-4" /> Queue coverage</div><p className="mt-3 text-2xl font-semibold text-slate-950">{queue.length ? Math.round(((completedCount + snoozedCount) / queue.length) * 100) : 100}%</p><p className="mt-1 text-xs leading-5 text-slate-500">of prioritized signals have an explicit operating disposition.</p></CardContent></Card>
        <Card className="border-slate-200/80"><CardContent className="p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700"><Layers3 className="size-4" /> Value in motion</div><p className="mt-3 text-2xl font-semibold text-slate-950">{formatCurrency(activeQueue.reduce((sum, item) => sum + (item.deal?.value ?? 0), 0), true)}</p><p className="mt-1 text-xs leading-5 text-slate-500">open opportunity value represented by active interventions.</p></CardContent></Card>
        <Card className="border-slate-200/80"><CardContent className="p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700"><ShieldCheck className="size-4" /> Decision boundary</div><p className="mt-3 text-2xl font-semibold text-slate-950">Metadata only</p><p className="mt-1 text-xs leading-5 text-slate-500">The queue records actions, never message content or inferred intent.</p></CardContent></Card>
      </section>

      <section className="elite-surface overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Priority queue</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950">Interventions requiring a human owner</h2><p className="mt-1 text-xs text-slate-500">Every row is tied to an explainable signal and a due window.</p></div><Button variant="ghost" className="text-slate-500" onClick={restoreAll}><RotateCcw className="size-4" /> Restore queue</Button></div>
        <div className="divide-y divide-slate-100">
          {queue.map((item, index) => {
            const isDone = Boolean(completed[item.dealId]);
            const isSnoozed = Boolean(snoozed[item.dealId]);
            return <article key={item.dealId} className={`grid gap-4 p-5 transition-colors md:grid-cols-[auto_minmax(0,1.2fr)_minmax(240px,.9fr)_auto] md:items-center ${isDone ? "bg-emerald-50/40" : isSnoozed ? "bg-slate-50/70" : "hover:bg-slate-50/70"}`}>
              <div className="flex items-center gap-3"><span className="font-mono text-[10px] text-slate-400">0{index + 1}</span><ScoreRing score={item.score} size="sm" /></div>
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><button className="truncate text-left text-sm font-semibold text-slate-950 hover:text-cyan-700" onClick={() => navigate(`/deals/${item.dealId}`)}>{item.account}</button><RiskBadge level={item.level} /></div><p className="mt-1 truncate text-xs text-slate-500">{item.dealName} · {item.deal ? formatCurrency(item.deal.value) : "value unavailable"}</p></div>
              <div><p className="flex items-center gap-2 text-xs font-medium text-slate-800"><TimerReset className="size-3.5 text-cyan-600" /> {item.recommendation.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.signal?.evidence}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><CalendarClock className="size-3" /> due by {formatDate((dashboard.workspace.asOfMs ?? Date.now()) + item.recommendation.dueInDays * 86_400_000)}</p></div>
              <div className="flex flex-wrap justify-start gap-2 md:justify-end"><Button size="sm" variant={isDone ? "default" : "outline"} className={isDone ? "bg-emerald-600 hover:bg-emerald-700" : "bg-white"} onClick={() => toggleCompleted(item.dealId)}>{isDone ? <Check className="size-3.5" /> : null}{isDone ? "Done" : "Mark done"}</Button>{!isDone ? <Button size="sm" variant="ghost" className="text-slate-500" onClick={() => snooze(item.dealId)}>Snooze</Button> : null}<Button size="icon" variant="ghost" aria-label={`Open ${item.account}`} onClick={() => navigate(`/deals/${item.dealId}`)}><ArrowRight className="size-4" /></Button></div>
            </article>;
          })}
        </div>
      </section>

      <div className="flex items-center gap-2 rounded-xl border border-cyan-200/80 bg-cyan-50/70 px-4 py-3 text-xs text-slate-600"><ShieldCheck className="size-4 text-cyan-700" /> This workspace separates operating decisions from relationship evidence. The command record contains actions and owners, not communication content.</div>
    </div>
  );
}
