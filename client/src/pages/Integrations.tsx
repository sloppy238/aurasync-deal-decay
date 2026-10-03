import { MomentumGlyph } from "@/components/MomentumGlyph";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { getImportContract, parseCsvLine, validateMetadataCsv, type ImportSource, type ImportValidationResult } from "@shared/csvImport";
import { Activity, ArrowRight, CheckCircle2, Clock3, Database, Download, FileCheck2, FileUp, GitCompareArrows, History, KeyRound, Layers3, Map as MapIcon, RefreshCw, ShieldCheck, Sparkles, UploadCloud, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Integration = {
  provider: keyof typeof brand;
  name: string;
  category: string;
  status: "connected" | "attention" | "available";
  connection: string | null;
  lastSyncAtMs: number | null;
  events: number;
  collected: readonly string[];
};

type ImportRow = Record<string, string>;
type ImportDiff = { added: number; changed: number; removed: number; unchanged: number };
type MappingPreview = { label: string; value: string; confidence: number };
type ImportRun = {
  id: string;
  source: ImportSource;
  fileName: string;
  createdAtMs: number;
  rowCount: number;
  acceptedCount: number;
  status: "staged" | "blocked";
  diff: ImportDiff;
  mappings: MappingPreview[];
};

const brand = {
  gmail: { mark: "G", className: "bg-red-50 text-red-600" },
  outlook: { mark: "O", className: "bg-blue-50 text-blue-600" },
  slack: { mark: "S", className: "bg-fuchsia-50 text-fuchsia-600" },
  teams: { mark: "T", className: "bg-indigo-50 text-indigo-600" },
  salesforce: { mark: "SF", className: "bg-sky-50 text-sky-600" },
  hubspot: { mark: "H", className: "bg-orange-50 text-orange-600" },
};

const templates: Record<ImportSource, string> = {
  salesforce: "opportunity_id,opportunity_name,account_name,stage,owner_email,amount,close_date,contact_id,contact_role\n006-demo,Nimbus Renewal,Nimbus Retail,Negotiation,owner@example.com,840000,2026-09-25,003-demo,Decision maker\n",
  gmail: "message_id,occurred_at,sender_id,participant_ids,thread_id,direction,label_ids\nmsg-demo-001,2026-09-01T12:00:00Z,sender-001,participant-001|participant-002,thread-001,inbound,label-001\n",
};

const emptyDiff = (): ImportDiff => ({ added: 0, changed: 0, removed: 0, unchanged: 0 });
const HISTORY_STORAGE_KEY = "aurasync:import-history:v1";

function seedHistory(): ImportRun[] {
  const now = Date.now();
  return [
    { id: "seed-sf", source: "salesforce", fileName: "salesforce-opportunities-aug.csv", createdAtMs: now - 12 * 60_000, rowCount: 642, acceptedCount: 642, status: "staged", diff: { added: 18, changed: 32, removed: 4, unchanged: 588 }, mappings: [{ label: "Opportunity", value: "Opportunity IDs", confidence: 99 }, { label: "Account", value: "Account names", confidence: 99 }] },
    { id: "seed-gmail", source: "gmail", fileName: "gmail-activity-aug.csv", createdAtMs: now - 48 * 60_000, rowCount: 18420, acceptedCount: 18420, status: "staged", diff: { added: 286, changed: 402, removed: 22, unchanged: 17710 }, mappings: [{ label: "Activity ID", value: "Message IDs", confidence: 99 }, { label: "Participants", value: "Participant IDs", confidence: 99 }] },
  ];
}

function rowsFromCsv(csv: string, columns: string[]) {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim().length > 0);
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    return columns.reduce<ImportRow>((row, column, index) => {
      row[column] = values[index] ?? "";
      return row;
    }, {});
  });
}

function rowKey(source: ImportSource, row: ImportRow, index: number) {
  return row[source === "salesforce" ? "opportunity_id" : "message_id"] || `${source}-${index}`;
}

function calculateDiff(source: ImportSource, previous: ImportRow[], current: ImportRow[]): ImportDiff {
  const previousMap = new Map<string, ImportRow>(previous.map((row: ImportRow, index: number) => [rowKey(source, row, index), row] as [string, ImportRow]));
  const currentMap = new Map<string, ImportRow>(current.map((row: ImportRow, index: number) => [rowKey(source, row, index), row] as [string, ImportRow]));
  let changed = 0;
  let unchanged = 0;
  currentMap.forEach((row, key) => {
    const old = previousMap.get(key);
    if (!old) return;
    if (JSON.stringify(old) === JSON.stringify(row)) unchanged += 1;
    else changed += 1;
  });
  return {
    added: Array.from(currentMap.keys()).filter(key => !previousMap.has(key)).length,
    changed,
    removed: Array.from(previousMap.keys()).filter(key => !currentMap.has(key)).length,
    unchanged,
  };
}

function mappingsFor(source: ImportSource, row?: ImportRow): MappingPreview[] {
  if (!row) return [];
  const fields: Array<[string, string]> = source === "salesforce"
    ? [["Opportunity", row.opportunity_name ?? ""], ["Account", row.account_name ?? ""], ["Stage", row.stage ?? ""], ["Contact role", row.contact_role ?? ""]]
    : [["Activity ID", row.message_id ?? ""], ["Occurred at", row.occurred_at ?? ""], ["Participants", row.participant_ids ?? ""], ["Thread", row.thread_id ?? ""]];
  return fields.map(([label, value]) => ({ label, value: value || "Not provided", confidence: value ? (label === "Contact role" || label === "Thread" ? 92 : 99) : 36 }));
}

function DiffPill({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white px-3 py-2"><div className="flex items-center justify-between gap-3"><span className="text-[10px] text-slate-500">{label}</span><span className={`font-mono text-xs font-semibold ${tone}`}>{value}</span></div></div>;
}

export default function Integrations() {
  const { data, isLoading } = trpc.aurasync.integrations.useQuery();
  const stageImport = trpc.aurasync.stageImport.useMutation();
  const [selected, setSelected] = useState<Integration | null>(null);
  const [importSource, setImportSource] = useState<ImportSource>("salesforce");
  const [validation, setValidation] = useState<ImportValidationResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [previousRows, setPreviousRows] = useState<Record<ImportSource, ImportRow[]>>({ salesforce: [], gmail: [] });
  const [diff, setDiff] = useState<ImportDiff>(emptyDiff());
  const [mappingOpen, setMappingOpen] = useState(false);
  const [history, setHistory] = useState<ImportRun[]>(() => {
    try {
      const saved = window.sessionStorage.getItem(HISTORY_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as ImportRun[]) : seedHistory();
    } catch {
      return seedHistory();
    }
  });
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.sessionStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const activeContract = useMemo(() => getImportContract(importSource), [importSource]);
  const currentMappings = useMemo(() => mappingsFor(importSource, parsedRows[0]), [importSource, parsedRows]);
  const latestBySource = (source: ImportSource) => history.find(run => run.source === source);

  const resetImport = () => {
    setValidation(null);
    setFileName("");
    setParsedRows([]);
    setDiff(emptyDiff());
    if (fileInput.current) fileInput.current.value = "";
  };

  const downloadTemplate = () => {
    const blob = new Blob([templates[importSource]], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `aurasync-${importSource}-metadata-template.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const selectSource = (source: ImportSource) => {
    setImportSource(source);
    setValidation(null);
    setFileName("");
    setParsedRows([]);
    setDiff(emptyDiff());
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    if (file.size > 2_000_000) {
      setValidation({ source: importSource, accepted: false, columns: [], rowCount: 0, acceptedCount: 0, rejectedCount: 0, errors: ["The file exceeds the 2 MB local import limit."] });
      setParsedRows([]);
      toast.error("Import blocked: the file exceeds the 2 MB local limit");
      return;
    }
    const csv = await file.text();
    const result = validateMetadataCsv(importSource, csv);
    setValidation(result);
    if (result.accepted) {
      const rows = rowsFromCsv(csv, result.columns);
      setParsedRows(rows);
      setDiff(calculateDiff(importSource, previousRows[importSource], rows));
      toast.success(`${result.acceptedCount.toLocaleString()} metadata rows passed the boundary check`);
    } else {
      setParsedRows([]);
      setDiff(emptyDiff());
      toast.error("Import blocked until the metadata contract is satisfied");
    }
  };

  const commitImport = async () => {
    if (!validation || !validation.accepted) return;
    const result = await stageImport.mutateAsync({ source: validation.source, columns: validation.columns, rowCount: validation.rowCount, acceptedCount: validation.acceptedCount, rejectedCount: validation.rejectedCount });
    const run: ImportRun = { id: `${validation.source}-${Date.now()}`, source: validation.source, fileName, createdAtMs: Date.now(), rowCount: validation.rowCount, acceptedCount: validation.acceptedCount, status: "staged", diff, mappings: currentMappings };
    setHistory(current => [run, ...current].slice(0, 8));
    setPreviousRows(current => ({ ...current, [validation.source]: parsedRows }));
    toast.success(result.message);
  };

  return (
    <div className="enter-rise mx-auto max-w-[1500px] space-y-6">
      <PageHeader eyebrow="Source connections" title="Bring activity signals together—without bringing content." description="Connect communication systems and CRM context through least-privilege metadata scopes. AuraSync normalizes timing, participation, and activity patterns into a single relationship layer." />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-700"><CheckCircle2 className="size-4" /> 3 sources connected</div><p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">31,830</p><p className="mt-1 text-xs text-slate-500">metadata events in the current retained window</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-xs font-semibold text-slate-700"><RefreshCw className="size-4 text-violet-500" /> Sync health</div><p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">98.7%</p><p className="mt-1 text-xs text-slate-500">successful normalized activity batches</p></div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5"><div className="flex items-center gap-2 text-xs font-semibold text-violet-700"><ShieldCheck className="size-4" /> Boundary status</div><p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Enforced</p><p className="mt-1 text-xs text-slate-500">content fields are excluded from ingestion contracts</p></div>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-violet-200 bg-violet-50/70 p-5 md:p-6">
        <MomentumGlyph className="absolute -right-20 -top-20 w-64 opacity-10" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,.95fr)] lg:items-center">
          <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700"><FileUp className="size-4" /> Easy setup · local import</div><h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-950">Start with a safe metadata file.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Upload a Salesforce opportunity export or Gmail metadata export. AuraSync checks the file in your browser first; only the validation summary is staged. Raw CSV rows never leave the browser.</p><div className="mt-4 flex flex-wrap gap-2"><Button variant={importSource === "salesforce" ? "default" : "outline"} className={importSource === "salesforce" ? "bg-slate-950 hover:bg-slate-800" : "bg-white"} onClick={() => selectSource("salesforce")}>Salesforce file</Button><Button variant={importSource === "gmail" ? "default" : "outline"} className={importSource === "gmail" ? "bg-slate-950 hover:bg-slate-800" : "bg-white"} onClick={() => selectSource("gmail")}>Gmail file</Button><Button variant="ghost" className="text-violet-700" onClick={downloadTemplate}><Download className="size-4" /> Download template</Button></div></div>
          <div className="relative rounded-2xl border border-white/80 bg-white p-4 shadow-[0_14px_35px_rgba(76,29,149,0.08)]"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-950">{importSource === "salesforce" ? "Salesforce opportunity metadata" : "Gmail activity metadata"}</p><p className="mt-1 text-xs text-slate-500">CSV · local boundary check</p></div><Database className="size-5 text-violet-500" /></div><div className="mt-4 flex flex-wrap gap-1.5">{activeContract.allowedColumns.slice(0, 6).map(column => <span key={column} className="rounded-md bg-slate-50 px-2 py-1 font-mono text-[9px] text-slate-500">{column}</span>)}</div><input ref={fileInput} type="file" accept=".csv,text/csv" aria-label="Select metadata CSV file" className="hidden" onChange={event => void handleFile(event.target.files?.[0])} /><Button className="mt-4 w-full" onClick={() => fileInput.current?.click()}><UploadCloud className="size-4" /> Choose CSV file</Button>{fileName ? <p className="mt-3 truncate text-xs text-slate-500">Selected: <span className="font-medium text-slate-700">{fileName}</span></p> : null}{validation ? <div className={`mt-4 rounded-xl border p-3 ${validation.accepted ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}><p className={`flex items-center gap-2 text-xs font-semibold ${validation.accepted ? "text-emerald-700" : "text-rose-700"}`}>{validation.accepted ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}{validation.accepted ? "Boundary check passed" : "Import blocked"}</p><p className="mt-2 text-xs text-slate-600">{validation.rowCount.toLocaleString()} rows · {validation.columns.length} columns · {validation.acceptedCount.toLocaleString()} accepted</p>{validation.errors.length > 0 ? <ul className="mt-2 space-y-1 text-[11px] text-rose-700">{validation.errors.map(error => <li key={error}>{error}</li>)}</ul> : null}<div className="mt-3 grid grid-cols-2 gap-2"><DiffPill label="Added" value={diff.added} tone="text-emerald-600" /><DiffPill label="Changed" value={diff.changed} tone="text-amber-600" /><DiffPill label="Removed" value={diff.removed} tone="text-rose-600" /><DiffPill label="Unchanged" value={diff.unchanged} tone="text-slate-600" /></div><div className="mt-3 grid gap-2 sm:grid-cols-3"><Button variant="outline" className="bg-white" disabled={!validation.accepted} onClick={() => setMappingOpen(true)}><MapIcon className="size-4" /> Review mapping</Button><Button disabled={!validation.accepted || stageImport.isPending} onClick={() => void commitImport()}>{stageImport.isPending ? "Staging…" : "Stage metadata for scoring"}<ArrowRight className="size-4" /></Button><Button variant="ghost" className="text-slate-500" onClick={resetImport}><XCircle className="size-4" /> Reset</Button></div></div> : <p className="mt-3 flex items-center gap-2 text-[11px] leading-4 text-slate-500"><ShieldCheck className="size-3.5 text-emerald-600" /> Content fields are rejected before upload.</p>}</div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <Card className="elite-surface"><CardHeader className="flex-row items-start justify-between space-y-0"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-600"><History className="size-4" /> Import history</div><CardTitle className="mt-2 text-xl tracking-[-0.03em]">What changed between files</CardTitle><p className="mt-1 text-xs text-slate-500">A local session ledger for staged metadata summaries.</p></div><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{history.length} runs</Badge></CardHeader><CardContent className="space-y-2">{history.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center"><History className="mx-auto size-5 text-slate-400" /><p className="mt-3 text-xs font-semibold text-slate-700">No staged imports yet</p><p className="mt-1 text-[11px] leading-4 text-slate-500">Validated metadata runs will appear here after you stage a file.</p></div> : history.map(run => <div key={run.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"><div className="flex min-w-0 items-center gap-3"><div className={`grid size-9 shrink-0 place-items-center rounded-lg ${run.source === "salesforce" ? "bg-sky-50 text-sky-600" : "bg-red-50 text-red-600"}`}>{run.source === "salesforce" ? "SF" : "G"}</div><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-900">{run.fileName}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><Clock3 className="size-3" /> {formatRelativeTime(run.createdAtMs)} · {run.rowCount.toLocaleString()} rows · {run.acceptedCount.toLocaleString()} accepted</p></div></div><div className="flex flex-wrap gap-1.5 text-[10px]"><span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">+{run.diff.added} added</span><span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">{run.diff.changed} changed</span><span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{run.diff.unchanged} same</span></div><Badge variant="outline" className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700">staged</Badge></div>)}</CardContent></Card>
        <Card className="border-slate-200/80"><CardHeader><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700"><GitCompareArrows className="size-4" /> Refresh posture</div><CardTitle className="mt-2 text-xl tracking-[-0.03em]">Refresh with confidence</CardTitle></CardHeader><CardContent><div className="space-y-3"><div className="rounded-xl bg-slate-50 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-800"><Layers3 className="size-4 text-violet-500" /> Compare before staging</div><p className="mt-2 text-xs leading-5 text-slate-500">AuraSync compares stable metadata identifiers locally and surfaces added, changed, removed, and unchanged rows before scoring.</p></div><div className="rounded-xl bg-emerald-50 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-700"><FileCheck2 className="size-4" /> Stage summary only</div><p className="mt-2 text-xs leading-5 text-emerald-800/70">The server receives columns and counts—not CSV rows or message content.</p></div></div><Button variant="outline" className="mt-4 w-full bg-white" onClick={() => toast.success(`Latest ${importSource} import is ready for refresh`)}><RefreshCw className="size-4" /> Prepare {importSource === "salesforce" ? "Salesforce" : "Gmail"} refresh</Button></CardContent></Card>
      </section>

      <section><div className="mb-4"><h2 className="text-lg font-semibold tracking-[-0.025em] text-slate-950">Available connectors</h2><p className="mt-1 text-xs text-slate-500">Configure one provider per category or combine sources for broader activity coverage.</p></div><div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{isLoading ? [0, 1, 2, 3, 4, 5].map(item => <Skeleton key={item} className="h-72 rounded-2xl" />) : data?.map(item => { const identity = brand[item.provider]; return <article key={item.provider} className="elite-surface rounded-2xl p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(15,23,42,0.095)]"><div className="flex items-start justify-between gap-3"><div className={`grid size-11 place-items-center rounded-xl text-xs font-bold ${identity.className}`}>{identity.mark}</div><Badge variant="outline" className={item.status === "connected" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : item.status === "attention" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-500"}>{item.status}</Badge></div><h3 className="mt-5 text-lg font-semibold tracking-[-0.025em] text-slate-950">{item.name}</h3><p className="mt-1 text-xs text-slate-500">{item.category} metadata connector</p><div className="mt-5 space-y-2 border-t border-slate-100 pt-4"><div className="flex items-center justify-between text-xs"><span className="text-slate-400">Connection</span><span className="max-w-[170px] truncate font-medium text-slate-700">{item.connection ?? "Not configured"}</span></div><div className="flex items-center justify-between text-xs"><span className="text-slate-400">Last sync</span><span className="font-medium text-slate-700">{item.lastSyncAtMs ? formatRelativeTime(item.lastSyncAtMs) : "—"}</span></div><div className="flex items-center justify-between text-xs"><span className="text-slate-400">Events</span><span className="font-mono text-slate-700">{item.events.toLocaleString()}</span></div></div><Button variant={item.status === "connected" ? "outline" : "default"} className={`mt-5 w-full ${item.status === "connected" ? "bg-white" : ""}`} onClick={() => setSelected(item)}>{item.status === "connected" ? "View configuration" : item.status === "attention" ? "Review connection" : "Configure connector"}<ArrowRight className="size-4" /></Button></article>; })}</div></section>

      <section className="relative grid gap-4 overflow-hidden rounded-2xl bg-slate-950 p-6 text-white md:grid-cols-[minmax(0,.8fr)_minmax(0,2fr)] md:items-center"><MomentumGlyph className="absolute -left-20 -top-20 w-56 opacity-15" /><div className="relative"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Integration contract</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em]">Metadata in. Signals out.</h2></div><div className="relative grid gap-3 sm:grid-cols-3">{[{ icon: KeyRound, title: "Least privilege", text: "Only approved metadata scopes." }, { icon: Database, title: "Normalized", text: "Shared event model across sources." }, { icon: ShieldCheck, title: "Content blocked", text: "Bodies and transcripts never enter." }].map(item => <div key={item.title} className="rounded-xl border border-white/10 bg-white/[0.04] p-4"><item.icon className="size-4 text-cyan-300" /><p className="mt-3 text-xs font-semibold">{item.title}</p><p className="mt-1 text-[11px] text-slate-400">{item.text}</p></div>)}</div></section>

      <Dialog open={Boolean(mappingOpen)} onOpenChange={setMappingOpen}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Review {importSource === "salesforce" ? "Salesforce" : "Gmail"} metadata mapping</DialogTitle><DialogDescription>Confirm the local field interpretation before staging. Only labels, identifiers, timestamps, participants, and activity metadata are shown.</DialogDescription></DialogHeader><div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-4"><p className="flex items-center gap-2 text-xs font-semibold text-violet-700"><MapIcon className="size-4" /> Mapping preview · {parsedRows.length.toLocaleString()} local rows</p><div className="mt-4 space-y-2">{currentMappings.length === 0 ? <div className="rounded-lg border border-dashed border-violet-200 bg-white/60 p-4 text-center"><MapIcon className="mx-auto size-4 text-violet-400" /><p className="mt-2 text-xs font-semibold text-slate-700">No mapping preview available</p><p className="mt-1 text-[11px] text-slate-500">Select a valid metadata file to preview field mappings.</p></div> : currentMappings.map(mapping => <div key={mapping.label} className="flex items-center justify-between gap-4 rounded-lg bg-white/70 p-3"><div><p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{mapping.label}</p><p className="mt-1 max-w-[280px] truncate text-xs font-medium text-slate-800">{mapping.value}</p></div><span className={`font-mono text-xs font-semibold ${mapping.confidence >= 90 ? "text-emerald-600" : "text-amber-600"}`}>{mapping.confidence}%</span></div>)}</div></div><div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700"><ShieldCheck className="size-4 shrink-0" /> Mapping stays in the browser and excludes content-bearing fields.</div><Button onClick={() => { setMappingOpen(false); toast.success("Metadata mapping confirmed"); }}>Confirm mapping <CheckCircle2 className="size-4" /></Button></DialogContent></Dialog>
      <Dialog open={Boolean(selected)} onOpenChange={open => !open && setSelected(null)}><DialogContent className="max-w-lg">{selected ? <><DialogHeader><DialogTitle>{selected.name} metadata configuration</DialogTitle><DialogDescription>{selected.connection ? `Connection: ${selected.connection}` : "This demo shows the least-privilege fields AuraSync requests before a live connection is created."}</DialogDescription></DialogHeader><div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="flex items-center gap-2 text-xs font-semibold text-emerald-700"><ShieldCheck className="size-4" /> Metadata scope verified</p><p className="mt-2 text-xs text-emerald-800/70">No subject, body, attachment content, transcript, recording, or semantic summary field is requested.</p></div><div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Collected fields</p><div className="flex flex-wrap gap-2">{selected.collected.map(field => <span key={field} className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-[10px] text-slate-600">{field}</span>)}</div></div><div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs text-slate-500"><Activity className="size-4 text-violet-500" /> {selected.status === "available" ? "Live authorization requires provider OAuth credentials." : `Current status: ${selected.status}. ${selected.events.toLocaleString()} retained events.`}</div><Button className="w-full" onClick={() => setSelected(null)}>Done</Button></> : null}</DialogContent></Dialog>
    </div>
  );
}
