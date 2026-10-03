import { PageHeader } from "@/components/PageHeader";
import { RiskBadge } from "@/components/RiskBadge";
import { ScoreRing } from "@/components/ScoreRing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/format";
import { filterAndSortDeals, getHighestPriorityAccount, getRiskSpan } from "@/lib/dealTriage";
import { trpc } from "@/lib/trpc";
import { ArrowRight, ArrowUpDown, ListFilter, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

type Filter = "all" | "at-risk" | "healthy";
type SortDirection = "descending" | "ascending";

export default function Deals() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortDirection, setSortDirection] = useState<SortDirection>("descending");
  const searchRef = useRef<HTMLInputElement>(null);
  const { data, isLoading } = trpc.aurasync.deals.useQuery();

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const filtered = useMemo(
    () => filterAndSortDeals(data ?? [], search, filter, sortDirection),
    [data, filter, search, sortDirection],
  );

  return (
    <div className="enter-rise mx-auto max-w-[1500px] space-y-6">
      <PageHeader eyebrow="Deal portfolio" title="Every deal, ordered by relationship risk." description="Explore open opportunities, compare decay signals, and move from warning to evidence-backed action." />

      {!isLoading && data ? (
        <section className="grid overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-[0_18px_45px_rgba(15,23,42,.16)] sm:grid-cols-2 xl:grid-cols-4">
                      {[
            { label: "Open relationship field", value: `${data.length} deals`, detail: formatCurrency(data.reduce((sum, deal) => sum + deal.value, 0), true) },
            { label: "Forecast concentration", value: `${data.filter(deal => deal.risk.forecastToStall).length} flagged`, detail: formatCurrency(data.filter(deal => deal.risk.forecastToStall).reduce((sum, deal) => sum + deal.value, 0), true) },
            { label: "Risk span", value: getRiskSpan(data), detail: "decay score range" },
            { label: "Highest priority", value: getHighestPriorityAccount(data), detail: "immediate intervention" },
          ].map((item, index) => (
            <div key={item.label} className="relative border-white/10 p-5 sm:border-r xl:last:border-r-0">
              <span className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-cyan-300/50 via-violet-400/20 to-transparent opacity-0 first:opacity-100" />
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">0{index + 1} · {item.label}</p>
              <p className="mt-3 truncate text-lg font-semibold tracking-[-0.03em] text-white">{item.value}</p>
              <p className="mt-1 text-[10px] text-slate-500">{item.detail}</p>
            </div>
          ))}
        </section>
      ) : null}

      <section className="elite-surface overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input ref={searchRef} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search account, deal, or owner" className="h-10 bg-slate-50 pl-9" aria-label="Search deals" aria-keyshortcuts="/" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ListFilter className="mr-1 size-4 text-slate-400" />
            {(["all", "at-risk", "healthy"] as Filter[]).map(option => (
              <Button key={option} size="sm" variant={filter === option ? "default" : "outline"} className={filter === option ? "bg-slate-950 hover:bg-slate-800" : "bg-white"} onClick={() => setFilter(option)}>
                {option === "all" ? "All deals" : option === "at-risk" ? "Forecast to stall" : "Healthy"}
              </Button>
            ))}
            <Button size="sm" variant="outline" className="bg-white" onClick={() => setSortDirection(current => current === "descending" ? "ascending" : "descending")}>
              <ArrowUpDown className="size-3.5" /> Risk {sortDirection === "descending" ? "high–low" : "low–high"}
            </Button>
          </div>
        </div>

        <div className="hidden grid-cols-[minmax(0,1.7fr)_minmax(150px,.7fr)_minmax(140px,.6fr)_110px_130px_32px] gap-4 border-b border-slate-100 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 lg:grid">
          <span>Opportunity</span><span>Owner</span><span>Stage</span><span>Value</span><span>Risk</span><span />
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading ? [0, 1, 2, 3].map(item => <Skeleton key={item} className="m-4 h-20 rounded-xl" />) : filtered.map(deal => (
            <button key={deal.id} onClick={() => navigate(`/deals/${deal.id}`)} className="grid w-full gap-4 p-5 text-left hover:bg-slate-50/80 lg:grid-cols-[minmax(0,1.7fr)_minmax(150px,.7fr)_minmax(140px,.6fr)_110px_130px_32px] lg:items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <ScoreRing score={deal.risk.score} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{deal.account}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{deal.name} · closes {formatDate(deal.closeDateMs)}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-full bg-violet-50 text-[10px] font-semibold text-violet-700">{deal.ownerInitials}</span>
                <span className="text-xs font-medium text-slate-700">{deal.owner}</span>
              </div>
              <p className="text-xs text-slate-600">{deal.stage}<span className="mt-1 block text-[11px] text-slate-400">Active {formatRelativeTime(deal.lastActivityAtMs)}</span></p>
              <p className="font-mono text-xs font-medium text-slate-900">{formatCurrency(deal.value, true)}</p>
              <div><RiskBadge level={deal.risk.level} /><p className="mt-1 text-[10px] text-slate-400">{deal.risk.forecastToStall ? "30-day flag" : "monitored"}</p></div>
              <ArrowRight className="size-4 text-slate-300" />
            </button>
          ))}
        </div>

        {!isLoading && filtered.length === 0 ? <div className="p-12 text-center"><p className="text-sm font-medium text-slate-800">No deals match this view.</p><p className="mt-1 text-xs text-slate-500">Try another search or risk filter.</p></div> : null}
      </section>
    </div>
  );
}
