import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatRelativeTime } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Cable, CircleDot, Network, ShieldCheck, Target, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

const positions = [
  { left: "13%", top: "18%" },
  { left: "76%", top: "16%" },
  { left: "9%", top: "68%" },
  { left: "78%", top: "70%" },
  { left: "49%", top: "10%" },
  { left: "48%", top: "82%" },
];

export default function RelationshipGraph() {
  const [, navigate] = useLocation();
  const { data: deals, isLoading } = trpc.aurasync.deals.useQuery();
  const [selectedId, setSelectedId] = useState("deal-nimbus");
  const { data: deal } = trpc.aurasync.deal.useQuery({ id: selectedId });

  const nodes = useMemo(() => deal?.stakeholders.map((person, index) => ({ ...person, position: positions[index % positions.length] })) ?? [], [deal?.stakeholders]);
  const engaged = nodes.filter(person => person.status === "engaged").length;
  const cooling = nodes.filter(person => person.status === "cooling").length;
  const singleThreaded = nodes.filter(person => person.status !== "engaged" && person.influence.toLowerCase().includes("economic")).length > 0;

  if (isLoading || !deals || !deal) {
    return <div className="space-y-5"><Skeleton className="h-32 rounded-2xl" /><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]"><Skeleton className="h-[480px] rounded-2xl" /><Skeleton className="h-[480px] rounded-2xl" /></div></div>;
  }

  return (
    <div className="enter-rise mx-auto max-w-[1500px] space-y-6">
      <PageHeader eyebrow="Relationship graph" title="See the connective tissue behind the score." description="A coverage map for the people, roles, and activity participation surrounding an opportunity. It shows relationship structure—not message meaning." actions={<Button variant="outline" className="bg-white" onClick={() => navigate(`/deals/${deal.id}`)}>Open evidence <ArrowRight className="size-4" /></Button>} />

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="border-slate-200/80"><CardContent className="p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700"><UsersRound className="size-4" /> Mapped stakeholders</div><p className="mt-3 text-2xl font-semibold text-slate-950">{nodes.length}</p><p className="mt-1 text-xs text-slate-500">roles attached to this opportunity.</p></CardContent></Card>
        <Card className="border-slate-200/80"><CardContent className="p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700"><CircleDot className="size-4" /> Active coverage</div><p className="mt-3 text-2xl font-semibold text-slate-950">{engaged}/{nodes.length}</p><p className="mt-1 text-xs text-slate-500">stakeholders with current observed activity.</p></CardContent></Card>
        <Card className={`${singleThreaded ? "border-rose-200 bg-rose-50/60" : "border-slate-200/80"}`}><CardContent className="p-5"><div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] ${singleThreaded ? "text-rose-700" : "text-violet-700"}`}><Target className="size-4" /> Thread posture</div><p className="mt-3 text-2xl font-semibold text-slate-950">{singleThreaded ? "Single-threaded" : "Multi-threaded"}</p><p className="mt-1 text-xs text-slate-500">{singleThreaded ? "Economic influence is outside the active field." : `${cooling} relationships need monitoring.`}</p></CardContent></Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <Card className="overflow-hidden border-slate-200/80"><CardHeader className="flex-row items-start justify-between space-y-0 border-b border-slate-100"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">Coverage map</p><CardTitle className="mt-1 text-xl tracking-[-0.03em]">{deal.account} relationship field</CardTitle><p className="mt-1 text-xs text-slate-500">Lines represent mapped role association. Node state reflects activity recency.</p></div><Network className="size-5 text-cyan-600" /></CardHeader><CardContent className="p-5">
          <div className="mb-4 flex flex-wrap gap-2">{deals.map(item => <Button key={item.id} size="sm" variant={item.id === selectedId ? "default" : "outline"} className={item.id === selectedId ? "bg-slate-950 hover:bg-slate-800" : "bg-white"} onClick={() => setSelectedId(item.id)}>{item.account}</Button>)}</div>
          <div className="relative h-[440px] overflow-hidden rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_center,rgba(6,182,212,.09),transparent_38%),linear-gradient(#f8fafc,#eef4f8)]">
            <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(148,163,184,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.12)_1px,transparent_1px)] [background-size:32px_32px]" />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="linkGradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#06b6d4" stopOpacity=".65" /><stop offset="1" stopColor="#7c3aed" stopOpacity=".3" /></linearGradient></defs>{nodes.map((node, index) => <line key={node.name} x1="50" y1="50" x2={parseFloat(node.position.left)} y2={parseFloat(node.position.top) / 4.4} stroke="url(#linkGradient)" strokeWidth=".35" strokeDasharray={node.status === "engaged" ? "0" : "1.2 1.4"} />)}</svg>
            <div className="absolute left-1/2 top-1/2 flex size-36 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 border-cyan-300/70 bg-slate-950 text-center text-white shadow-[0_0_0_12px_rgba(6,182,212,.08),0_20px_45px_rgba(15,23,42,.25)]"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-cyan-300">Opportunity</p><p className="mt-2 max-w-[110px] truncate text-sm font-semibold">{deal.account}</p><p className="mt-1 font-mono text-xs text-slate-400">{formatCurrency(deal.value, true)}</p></div>
            {nodes.map(node => <div key={node.name} className="absolute -translate-x-1/2 -translate-y-1/2" style={node.position}><div className={`group relative grid size-16 place-items-center rounded-full border-4 bg-white shadow-lg ${node.status === "engaged" ? "border-emerald-400" : node.status === "cooling" ? "border-amber-400" : "border-rose-400"}`}><span className="text-xs font-semibold text-slate-700">{node.name.split(" ").map(part => part[0]).join("")}</span><div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-40 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-left opacity-0 shadow-xl transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"><p className="text-xs font-semibold text-slate-900">{node.name}</p><p className="mt-1 text-[10px] text-slate-500">{node.role}</p><p className="mt-2 text-[10px] text-slate-500">{node.influence} · {node.activityShare}% activity</p></div></div><p className="mt-2 max-w-24 truncate text-center text-[10px] font-medium text-slate-700">{node.name}</p></div>)}
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-[10px] text-slate-500 backdrop-blur"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-400" /> Engaged</span><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-400" /> Cooling</span><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-400" /> Inactive</span></div>
          </div>
        </CardContent></Card>

        <div className="space-y-4">
          <Card className="border-slate-200/80"><CardHeader><CardTitle className="text-lg tracking-[-0.03em]">Role ledger</CardTitle><p className="text-xs text-slate-500">Activity metadata by mapped buying role.</p></CardHeader><CardContent className="space-y-3">{nodes.map(node => <div key={node.name} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><span className={`grid size-9 place-items-center rounded-full text-[10px] font-semibold ${node.status === "engaged" ? "bg-emerald-50 text-emerald-700" : node.status === "cooling" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{node.name.split(" ").map(part => part[0]).join("")}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-900">{node.name}</p><p className="truncate text-[10px] text-slate-500">{node.role} · {node.influence}</p></div><span className="font-mono text-[10px] text-slate-500">{node.activityShare}%</span></div>)}</CardContent></Card>
          <Card className="border-cyan-200 bg-cyan-50/70"><CardContent className="p-5"><div className="flex items-center gap-2 text-xs font-semibold text-cyan-800"><Cable className="size-4" /> Metadata interpretation</div><p className="mt-2 text-xs leading-5 text-slate-600">The graph uses participant identifiers, role metadata, and activity timestamps. It does not inspect the meaning of a conversation.</p><p className="mt-3 flex items-center gap-1 text-[10px] text-slate-500"><ShieldCheck className="size-3.5 text-cyan-700" /> Last field activity {formatRelativeTime(deal.lastActivityAtMs)}</p></CardContent></Card>
        </div>
      </section>
    </div>
  );
}
