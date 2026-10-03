import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { ScoreRing } from "@/components/ScoreRing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { calculateDealRisk, riskLevelForScore, type SignalKind } from "@shared/riskModel";
import { ArrowRight, Beaker, CheckCircle2, Info, RotateCcw, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

const SIGNAL_LABELS: Record<SignalKind, string> = {
  response_latency: "Response latency",
  engagement_decline: "Engagement decline",
  stakeholder_coverage: "Stakeholder coverage",
  communication_gap: "Communication gap",
};

const SIGNAL_DESCRIPTIONS: Record<SignalKind, string> = {
  response_latency: "Time between observed activity and reciprocal response.",
  engagement_decline: "Change in recent activity volume against the deal baseline.",
  stakeholder_coverage: "Breadth of mapped buying roles participating in activity.",
  communication_gap: "Longest observed reciprocal-activity gap in the window.",
};

const SIGNAL_ORDER: SignalKind[] = ["response_latency", "engagement_decline", "stakeholder_coverage", "communication_gap"];

type Scenario = Record<SignalKind, number>;

export default function SignalLab() {
  const [, navigate] = useLocation();
  const { data: deals, isLoading } = trpc.aurasync.deals.useQuery();
  const [selectedId, setSelectedId] = useState("deal-nimbus");
  const { data: deal } = trpc.aurasync.deal.useQuery({ id: selectedId });
  const [scenario, setScenario] = useState<Scenario | null>(null);

  const baseline = useMemo(() => {
    if (!deal) return null;
    return calculateDealRisk(deal.signals.map(signal => ({ kind: signal.kind, risk: signal.risk })));
  }, [deal]);
  const scenarioValues = useMemo<Scenario | null>(() => {
    if (!deal) return null;
    return scenario ?? Object.fromEntries(deal.signals.map(signal => [signal.kind, signal.risk])) as Scenario;
  }, [deal, scenario]);
  const simulated = useMemo(() => {
    if (!scenarioValues) return null;
    return calculateDealRisk(SIGNAL_ORDER.map(kind => ({ kind, risk: scenarioValues[kind] })));
  }, [scenarioValues]);
  const delta = simulated && baseline ? simulated.score - baseline.score : 0;
  const changed = Boolean(scenario && baseline && delta !== 0);

  const updateSignal = (kind: SignalKind, value: number[]) => {
    setScenario(current => ({ ...(current ?? scenarioValues!), [kind]: value[0] ?? 0 }));
  };

  const reset = () => setScenario(null);

  if (isLoading || !deals || !deal || !baseline || !simulated || !scenarioValues) {
    return <div className="space-y-5"><Skeleton className="h-32 rounded-2xl" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div></div>;
  }

  return (
    <div className="enter-rise mx-auto max-w-[1500px] space-y-6">
      <PageHeader eyebrow="Signal lab" title="Test the signal before you act." description="A transparent sandbox for exploring how observable relationship patterns move a deal-decay score. Scenarios are local and never change the source record." actions={<Button variant="outline" className="bg-white" onClick={reset}><RotateCcw className="size-4" /> Reset scenario</Button>} />

      <section className="relative overflow-hidden rounded-[26px] bg-slate-950 p-6 text-white shadow-[0_24px_65px_rgba(15,23,42,.18)] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(6,182,212,.18),transparent_28%),radial-gradient(circle_at_20%_100%,rgba(124,58,237,.18),transparent_33%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
          <div><div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300"><Beaker className="size-3.5" /> Scenario engine / local only</div><h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.05em] md:text-4xl">Make the model legible to the operator.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Change one signal at a time, see the score move, and understand which intervention threshold you are approaching. No intent inference. No content inspection.</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5"><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">Simulated posture</p><div className="mt-4 flex items-center gap-4"><ScoreRing score={simulated.score} size="lg" /><div><RiskBadge level={simulated.level} /><p className={`mt-2 text-sm font-semibold ${delta > 0 ? "text-rose-300" : delta < 0 ? "text-emerald-300" : "text-slate-300"}`}>{delta === 0 ? "No movement" : `${delta > 0 ? "+" : ""}${delta} points`}<span className="ml-1 font-normal text-slate-500">vs baseline</span></p></div></div></div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)]">
        <Card className="border-slate-200/80"><CardHeader className="flex-row items-start justify-between space-y-0"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Scenario inputs</p><CardTitle className="mt-1 text-xl tracking-[-0.03em]">Tune the four observable signals</CardTitle></div><SlidersHorizontal className="size-5 text-cyan-600" /></CardHeader><CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">{deals.map(item => <Button key={item.id} size="sm" variant={item.id === selectedId ? "default" : "outline"} className={item.id === selectedId ? "bg-slate-950 hover:bg-slate-800" : "bg-white"} onClick={() => { setSelectedId(item.id); setScenario(null); }}>{item.account}</Button>)}</div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-sm font-semibold text-slate-900">{deal.account}</p><p className="mt-1 text-xs text-slate-500">{deal.name} · {formatCurrency(deal.value)} · current score {baseline.score}/100</p></div>
          {SIGNAL_ORDER.map(kind => <div key={kind} className="space-y-3"><div className="flex items-start justify-between gap-4"><div><Label className="text-sm font-semibold text-slate-900">{SIGNAL_LABELS[kind]}</Label><p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">{SIGNAL_DESCRIPTIONS[kind]}</p></div><span className="font-mono text-sm font-semibold text-slate-900">{scenarioValues[kind]}</span></div><Slider value={[scenarioValues[kind]]} max={100} min={0} step={1} onValueChange={value => updateSignal(kind, value)} aria-label={`${SIGNAL_LABELS[kind]} scenario risk`} /><div className="flex justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400"><span>Inside range</span><span>Material shift</span></div></div>)}
        </CardContent></Card>

        <div className="space-y-4">
          <Card className="border-cyan-200 bg-cyan-50/70"><CardContent className="p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800"><Sparkles className="size-4" /> Readout</div><h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{simulated.score}/100</h3><p className="mt-2 text-sm leading-6 text-slate-700">{simulated.forecastToStall ? "This scenario crosses the operating threshold for a thirty-day stall forecast." : "This scenario remains below the current stall-forecast threshold."}</p><div className="mt-4 flex items-center justify-between border-t border-cyan-200 pt-4 text-xs"><span className="text-slate-500">Model band</span><span className="font-semibold capitalize text-slate-900">{riskLevelForScore(simulated.score)}</span></div>{scenario ? <p className="mt-3 text-xs font-medium text-cyan-800">Local scenario only. No deal record was changed.</p> : null}</CardContent></Card>
          <Card className="border-slate-200/80"><CardHeader><CardTitle className="text-lg tracking-[-0.03em]">Decision guardrails</CardTitle></CardHeader><CardContent className="space-y-3 text-xs leading-5 text-slate-600"><p className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Four fixed signal weights keep the model deterministic and explainable.</p><p className="flex gap-2"><Info className="mt-0.5 size-4 shrink-0 text-cyan-600" /> A score is an operating indicator, not a statement about human intent.</p><p className="flex gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-violet-600" /> Only activity metadata and CRM context are represented.</p></CardContent></Card>
          <Button className="w-full" onClick={() => navigate(`/deals/${deal.id}`)}>Open evidence for {deal.account} <ArrowRight className="size-4" /></Button>
        </div>
      </section>
    </div>
  );
}
