import { PageHeader } from "@/components/PageHeader";
import { MomentumGlyph } from "@/components/MomentumGlyph";
import { RiskBadge } from "@/components/RiskBadge";
import { ScoreRing } from "@/components/ScoreRing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatRelativeTime, titleCase } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, Database, Radar, Sparkles, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const signalColors = {
  response_latency: "bg-rose-500",
  engagement_decline: "bg-amber-500",
  stakeholder_coverage: "bg-violet-500",
  communication_gap: "bg-cyan-500",
};

export default function DealDetail({ id }: { id: string }) {
  const [, navigate] = useLocation();
  const { data: deal, isLoading } = trpc.aurasync.deal.useQuery({ id });

  if (isLoading) return <div className="space-y-5"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>;
  if (!deal) return <div className="rounded-2xl border bg-white p-10 text-center"><p className="font-semibold">Deal not found</p><Button className="mt-4" onClick={() => navigate("/deals")}>Return to deals</Button></div>;

  return (
    <div className="enter-rise mx-auto max-w-[1500px] space-y-6">
      <Button variant="ghost" className="-ml-3 text-slate-500" onClick={() => navigate("/deals")}><ArrowLeft className="size-4" /> Back to deals</Button>
      <PageHeader
        eyebrow={`${deal.stage} · ${formatCurrency(deal.value)}`}
        title={deal.account}
        description={`${deal.name}. Owned by ${deal.owner}; expected close ${formatDate(deal.closeDateMs)}.`}
        actions={<Button onClick={() => toast.success("Action added to the intervention queue")}>Create intervention <ArrowUpRight className="size-4" /></Button>}
      />

      <section className="elite-surface grid overflow-hidden rounded-2xl sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Expected close", value: formatDate(deal.closeDateMs), detail: deal.stage },
          { label: "Last observed activity", value: formatRelativeTime(deal.lastActivityAtMs), detail: "across connected metadata" },
          { label: "Stakeholder field", value: `${deal.stakeholders.filter(person => person.status === "engaged").length}/${deal.stakeholders.length} active`, detail: "mapped buying roles" },
          { label: "Forecast posture", value: deal.risk.forecastToStall ? "Intervene" : "Monitor", detail: `${deal.risk.forecastWindowDays}-day operating window` },
        ].map((item, index) => (
          <div key={item.label} className="border-b border-slate-100 p-4 last:border-b-0 sm:border-r sm:[&:nth-child(3)]:border-b-0 sm:[&:nth-child(4)]:border-b-0 xl:border-b-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">0{index + 1} · {item.label}</p>
            <p className="mt-2 text-sm font-semibold text-slate-950">{item.value}</p>
            <p className="mt-1 text-[10px] text-slate-500">{item.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="relative overflow-hidden border-0 bg-slate-950 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
          <MomentumGlyph className="absolute -right-24 -top-20 w-64 opacity-20" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Deal decay score</p><p className="mt-2 text-xs text-slate-400">Forecast window: {deal.risk.forecastWindowDays} days</p></div>
              <RiskBadge level={deal.risk.level} />
            </div>
            <div className="my-8 flex justify-center"><ScoreRing score={deal.risk.score} size="lg" /></div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-white"><Radar className="size-4 text-cyan-300" /> {deal.risk.forecastToStall ? "Forecast to stall" : "No stall forecast"}</div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{deal.risk.forecastToStall ? `Relationship momentum is projected to create a visible CRM stall by ${formatDate(deal.predictedStallDateMs ?? deal.closeDateMs)}.` : "Current metadata patterns remain inside the expected operating range."}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Explainability</p>
            <CardTitle className="mt-1 text-xl tracking-[-0.03em]">What is driving the score</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {deal.signals.map(item => (
              <article key={item.kind} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between gap-4"><p className="text-sm font-semibold text-slate-900">{item.label}</p><span className="font-mono text-xs text-slate-500">+{deal.risk.contributions[item.kind]}</span></div>
                <div className="mt-4"><Progress value={item.risk} className="h-1.5" /></div>
                <div className="mt-3 flex items-end justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Baseline</p><p className="mt-1 text-xs text-slate-700">{item.baseline} {item.unit}</p></div><div className="text-right"><p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Current</p><p className="mt-1 text-sm font-semibold text-slate-950">{item.current} {item.unit}</p></div></div>
                <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">{item.evidence}</p>
              </article>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.8fr)]">
        <Card className="border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <CardHeader className="border-b border-slate-100"><CardTitle className="text-lg tracking-[-0.025em]">Signal evidence timeline</CardTitle><p className="text-xs text-slate-500">Metric-level observations with source and calculation provenance.</p></CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {[...deal.signals].sort((a, b) => b.observedAtMs - a.observedAtMs).map(signal => (
              <div key={signal.kind} className="grid gap-3 p-5 sm:grid-cols-[14px_minmax(0,1fr)_auto] sm:items-start">
                <span className={`mt-1 size-2.5 rounded-full ${signalColors[signal.kind]}`} />
                <div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-900">{signal.label}</p><span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[9px] text-slate-500">{signal.source}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{signal.evidence}</p><p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400"><Database className="size-3" /> timestamp + participant + activity metadata</p></div>
                <span className="text-[10px] text-slate-400">{formatRelativeTime(signal.observedAtMs)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-violet-200 bg-violet-50/70 shadow-none">
            <CardContent className="p-5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-violet-600 text-white"><Sparkles className="size-4" /></div>
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600">Recommended next action</p>
              <h3 className="mt-2 text-lg font-semibold tracking-[-0.025em] text-slate-950">{deal.recommendation.title}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-600">{deal.recommendation.rationale}</p>
              <div className="mt-5 flex items-center justify-between border-t border-violet-200 pt-4 text-xs"><span className="text-slate-500">Owner</span><span className="font-semibold text-slate-900">{deal.recommendation.owner}</span></div>
              <div className="mt-2 flex items-center justify-between text-xs"><span className="text-slate-500">Due</span><span className="font-semibold text-slate-900">Within {deal.recommendation.dueInDays} days</span></div>
              <Button className="mt-5 w-full" onClick={() => toast.success("Intervention assigned to the deal owner")}>Assign intervention</Button>
            </CardContent>
          </Card>
          <Card className="border-slate-200/80"><CardContent className="p-5"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-700"><CheckCircle2 className="size-4" /> Metadata-only boundary verified</div><p className="mt-2 text-xs leading-5 text-slate-500">No subject lines, message bodies, attachment content, transcripts, or recordings are used in this score.</p></CardContent></Card>
        </div>
      </section>

      <Card className="border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-slate-100"><div><CardTitle className="text-lg tracking-[-0.025em]">Stakeholder coverage</CardTitle><p className="mt-1 text-xs text-slate-500">CRM roles mapped to observed activity participation.</p></div><UsersRound className="size-5 text-violet-500" /></CardHeader>
        <CardContent className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
          {deal.stakeholders.map(person => (
            <article key={person.name} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between"><span className="grid size-8 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700">{person.name.split(" ").map(part => part[0]).join("")}</span><span className={`size-2 rounded-full ${person.status === "engaged" ? "bg-emerald-500" : person.status === "cooling" ? "bg-amber-500" : "bg-rose-500"}`} /></div>
              <p className="mt-3 text-sm font-semibold text-slate-900">{person.name}</p><p className="mt-1 text-xs text-slate-500">{person.role}</p>
              <div className="mt-4 flex items-center justify-between text-[10px]"><span className="text-slate-400">{person.influence}</span><span className="font-mono text-slate-600">{person.activityShare}% activity</span></div>
              <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400"><CalendarDays className="size-3" /> last active {formatRelativeTime(person.lastActivityAtMs)}</p>
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
