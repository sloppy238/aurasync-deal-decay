import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Beaker, BriefcaseBusiness, Cable, CheckSquare, Command, FlaskConical, LayoutDashboard, Network, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

const destinations = [
  { label: "Executive portfolio", detail: "Health, exposure, and prioritized risk", path: "/", icon: LayoutDashboard },
  { label: "Command Center", detail: "Turn signal changes into accountable actions", path: "/command-center", icon: FlaskConical },
  { label: "Signal Lab", detail: "Test transparent what-if scenarios", path: "/signal-lab", icon: Beaker },
  { label: "Relationship Graph", detail: "Map stakeholder coverage and thread risk", path: "/relationship-graph", icon: Network },
  { label: "Review Room", detail: "Review governance controls and provenance", path: "/review-room", icon: CheckSquare },
  { label: "Deal intelligence", detail: "Search and inspect decay evidence", path: "/deals", icon: BriefcaseBusiness },
  { label: "Source connections", detail: "Review metadata connector status", path: "/integrations", icon: Cable },
  { label: "Privacy & governance", detail: "Inspect the metadata-only boundary", path: "/governance", icon: ShieldCheck },
];

const routeLabel = (location: string) => {
  if (location.startsWith("/deals/")) return "Deal intelligence / Evidence";
  if (location === "/command-center") return "Command Center / Operating queue";
  if (location === "/signal-lab") return "Signal Lab / Scenario engine";
  if (location === "/relationship-graph") return "Relationship Graph / Coverage map";
  if (location === "/review-room") return "Review Room / Governance record";
  return destinations.find(item => item.path === location)?.label ?? "Executive portfolio";
};

export function ExecutiveCommandBar() {
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return destinations.filter(item => !normalized || `${item.label} ${item.detail}`.toLowerCase().includes(normalized));
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(current => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const select = (path: string) => {
    navigate(path);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <div className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-slate-200/70 bg-[#f7f8fc]/85 px-8 backdrop-blur-xl md:flex">
        <div className="flex items-center gap-3">
          <span className="size-1.5 rounded-full bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,.7)]" />
          <p className="text-xs font-semibold text-slate-800">{routeLabel(location)}</p>
          <span className="text-slate-300">/</span>
          <p className="text-xs text-slate-400">AuraSync Enterprise</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 w-72 justify-between border-slate-200 bg-white/80 px-3 text-slate-400 shadow-[0_4px_18px_rgba(15,23,42,.04)]" onClick={() => setOpen(true)}>
            <span className="flex items-center gap-2 text-xs"><Search className="size-3.5" /> Search intelligence</span>
            <span className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[9px] text-slate-500"><Command className="size-2.5" />K</span>
          </Button>
          <div className="flex h-9 items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3">
            <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-50" /><span className="relative inline-flex size-2 rounded-full bg-emerald-500" /></span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Metadata current</span>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden border-white/10 bg-slate-950 p-0 text-white shadow-[0_30px_90px_rgba(2,6,23,.5)] sm:max-w-xl">
          <DialogHeader className="border-b border-white/10 p-5 pb-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300"><Sparkles className="size-3.5" /> Aura command</div>
            <DialogTitle className="text-xl tracking-[-0.03em] text-white">Navigate relationship intelligence</DialogTitle>
            <DialogDescription className="text-slate-400">Jump to a decision surface. No communication content is indexed.</DialogDescription>
          </DialogHeader>
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search portfolio, deals, sources, governance…" className="h-11 border-white/10 bg-white/[0.06] pl-9 text-white placeholder:text-slate-500" aria-label="Search AuraSync destinations" />
            </div>
            <div className="mt-3 space-y-1">
              {results.map(item => {
                const active = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                return (
                  <button key={item.path} onClick={() => select(item.path)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/[0.07]", active && "bg-white/[0.07]")}>
                    <span className="grid size-9 place-items-center rounded-xl bg-white/[0.06] text-cyan-300 ring-1 ring-white/10"><item.icon className="size-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-white">{item.label}</span><span className="mt-0.5 block text-xs text-slate-500">{item.detail}</span></span>
                    <span className="font-mono text-[9px] text-slate-600">OPEN</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.025] px-5 py-3 text-[10px] text-slate-500"><span>Metadata-only index</span><span>ESC to close</span></div>
        </DialogContent>
      </Dialog>
    </>
  );
}
