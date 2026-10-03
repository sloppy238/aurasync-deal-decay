import { MetricCard } from "@/components/MetricCard";
import { MomentumGlyph } from "@/components/MomentumGlyph";
import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { ScoreRing } from "@/components/ScoreRing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CircleDollarSign,
  Clock3,
  Radar,
  ShieldCheck,
  Sparkles,
  FlaskConical,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocation } from "wouter";

const riskColors = {
  critical: "#e11d48",
  high: "#d97706",
  medium: "#7c3aed",
  low: "#059669",
};

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map(item => <Skeleton key={item} className="h-36 rounded-2xl" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const { data, isLoading } = trpc.aurasync.dashboard.useQuery();

  if (isLoading || !data) return <DashboardSkeleton />;

  return (
    <div className="enter-rise mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        eyebrow="Executive overview"
        title="Relationship momentum, made operational."
        description={`Portfolio intelligence as of ${new Date(data.workspace.asOfMs).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. Scores use communication activity metadata and CRM context only.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate("/command-center")}><FlaskConical className="size-4" /> Open command center</Button>
            <Button variant="outline" className="bg-white" onClick={() => navigate("/governance")}>
              <ShieldCheck className="size-4" /> Review controls
            </Button>
          </div>
        }
      />

      <section className="relative overflow-hidden rounded-[28px] bg-[#050a19] px-6 py-7 text-white shadow-[0_24px_65px_rgba(15,23,42,.2)] md:px-8 md:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(124,58,237,.23),transparent_34%),radial-gradient(circle_at_58%_100%,rgba(6,182,212,.12),transparent_30%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_360px] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">Aura signal / Portfolio 01</span>
              <span className="h-px w-12 bg-white/15" />
              <span className="flex items-center gap-1.5 text-[10px] text-slate-400"><span className="size-1.5 rounded-full bg-emerald-400" /> Scoring current</span>
            </div>
            <div className="mt-7 flex flex-col gap-7 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-medium text-slate-400">Relationship-adjusted portfolio health</p>
                <div className="mt-2 flex items-end gap-3"><span className="text-7xl font-semibold tracking-[-0.075em] text-white">{data.summary.portfolioHealth}</span><span className="pb-2 font-mono text-xs text-slate-500">/100</span></div>
              </div>
              <div className="pb-1 sm:border-l sm:border-white/10 sm:pl-7">
                <p className="text-2xl font-semibold tracking-[-0.04em] text-rose-300">{formatCurrency(data.summary.atRiskValue, true)}</p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">concentrated across {data.summary.atRiskDeals} opportunities forecast to stall inside the next 30 days.</p>
              </div>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[{ label: "Response", value: "3.1×", note: "peak latency shift" }, { label: "Coverage", value: "−46%", note: "active buying roles" }, { label: "Cadence", value: "+4d", note: "widest gap variance" }].map(item => (
                <div key={item.label} className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{item.label}</span><span className="font-mono text-sm text-cyan-200">{item.value}</span></div>
                  <p className="mt-1 text-[10px] text-slate-500">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative hidden min-h-[240px] lg:block">
            <MomentumGlyph className="absolute right-0 top-1/2 w-[260px] -translate-y-1/2" />
            <div className="absolute right-0 top-0 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 backdrop-blur-md"><p className="font-mono text-[9px] text-slate-500">NETWORK DENSITY</p><p className="mt-1 text-sm font-medium text-white">6 active deals</p></div>
            <div className="absolute bottom-0 left-6 rounded-xl border border-rose-300/15 bg-rose-300/[0.06] px-3 py-2 backdrop-blur-md"><p className="font-mono text-[9px] text-rose-300">DECAY CLUSTER</p><p className="mt-1 text-sm font-medium text-white">3 require action</p></div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Portfolio health" value={`${data.summary.portfolioHealth}/100`} detail="Value-weighted relationship health across the open pipeline." icon={Activity} accent="violet" />
        <MetricCard label="Forecast to stall" value={`${data.summary.atRiskDeals} deals`} detail={`${formatCurrency(data.summary.atRiskValue, true)} in pipeline value is trending toward a stall within 30 days.`} icon={AlertTriangle} accent="rose" />
        <MetricCard label="Pipeline monitored" value={formatCurrency(data.summary.totalValue, true)} detail={`${data.summary.totalDeals} active opportunities are mapped to metadata-based engagement patterns.`} icon={CircleDollarSign} accent="emerald" />
        <MetricCard label="New interventions" value={`${data.summary.newAlerts}`} detail="Prioritized operating actions generated from material signal changes this week." icon={Sparkles} accent="amber" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
        <Card className="border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Eight-week movement</p>
              <CardTitle className="mt-2 text-xl tracking-[-0.025em]">Portfolio health trend</CardTitle>
            </div>
            <div className="rounded-xl bg-violet-50 px-3 py-2 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-500">Current</p>
              <p className="text-lg font-semibold text-violet-700">{data.summary.portfolioHealth}</p>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[270px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend} margin={{ left: -18, right: 8, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="healthFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e8edf4" strokeDasharray="3 5" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis domain={[60, 90]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 14px 35px rgba(15,23,42,.1)", fontSize: 12 }} />
                  <Area type="monotone" dataKey="portfolioHealth" stroke="#7c3aed" strokeWidth={2.5} fill="url(#healthFill)" activeDot={{ r: 5, fill: "#7c3aed", stroke: "white", strokeWidth: 2 }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Exposure by severity</p>
            <CardTitle className="mt-1 text-xl tracking-[-0.025em]">Risk distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.riskDistribution} layout="vertical" margin={{ left: 4, right: 12, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="level" type="category" axisLine={false} tickLine={false} width={65} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip cursor={{ fill: "#f8fafc" }} formatter={(value: number) => formatCurrency(value, true)} contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="value" radius={[0, 7, 7, 0]} barSize={18} isAnimationActive={false}>
                    {data.riskDistribution.map(item => <Cell key={item.level} fill={riskColors[item.level]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
              {data.riskDistribution.map(item => (
                <div key={item.level} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: riskColors[item.level] }} />
                    <span className="text-xs capitalize text-slate-600">{item.level}</span>
                  </div>
                  <span className="font-mono text-xs text-slate-950">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">Prioritized now</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950">Emerging deal risk</h2>
          </div>
          <Button variant="ghost" className="justify-start text-violet-700" onClick={() => navigate("/deals")}>View all deals <ArrowRight className="size-4" /></Button>
        </div>
        <div className="divide-y divide-slate-100">
          {data.prioritizedAlerts.map((alert, index) => (
            <button key={alert.dealId} onClick={() => navigate(`/deals/${alert.dealId}`)} className="grid w-full gap-4 p-5 text-left hover:bg-slate-50/80 md:grid-cols-[auto_minmax(0,1fr)_minmax(220px,.7fr)_auto] md:items-center">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-slate-400">0{index + 1}</span>
                <ScoreRing score={alert.score} size="sm" />
              </div>
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-950">{alert.account}</p>
                  <RiskBadge level={alert.level} />
                </div>
                <p className="truncate text-xs text-slate-500">{alert.dealName} · {formatCurrency(alert.value)}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700"><Radar className="size-3.5 text-violet-500" /> {alert.signal?.label}</div>
                <p className="mt-1 line-clamp-1 text-xs text-slate-500">{alert.signal?.evidence}</p>
              </div>
              <div className="flex items-center justify-between gap-4 md:justify-end">
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-800">{alert.recommendation.title}</p>
                  <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-400"><Clock3 className="size-3" /> due in {alert.recommendation.dueInDays}d</p>
                </div>
                <ArrowRight className="size-4 text-slate-300" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-950 p-5 text-white md:col-span-2">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-cyan-300/10 ring-1 ring-cyan-300/20"><Radar className="size-5 text-cyan-300" /></div>
              <h3 className="text-lg font-semibold tracking-[-0.025em]">Thirty-day stall forecast</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">A deterministic score combines four observable relationship signals. The forecast is an operating indicator—not a claim about human intent.</p>
            </div>
            <span className="font-mono text-xs text-cyan-300">v0.1</span>
          </div>
        </div>
        <button onClick={() => navigate("/integrations")} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-[0_8px_30px_rgba(15,23,42,0.04)] hover:border-violet-200">
          <BriefcaseBusiness className="size-5 text-violet-600" />
          <p className="mt-5 text-sm font-semibold text-slate-950">3 sources connected</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Review metadata scopes and synchronization health.</p>
        </button>
      </section>
    </div>
  );
}
