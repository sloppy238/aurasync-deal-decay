import {
  calculateDealRisk,
  METADATA_ONLY_FIELDS,
  PROHIBITED_CONTENT_FIELDS,
  type DealSignalInput,
  type SignalKind,
} from "../shared/riskModel";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 1, 16, 0, 0);

type SeedSignal = DealSignalInput & {
  label: string;
  baseline: number;
  current: number;
  unit: string;
  trend: "rising" | "stable" | "improving";
  source: string;
  observedAtMs: number;
  evidence: string;
};

type SeedDeal = {
  id: string;
  name: string;
  account: string;
  owner: string;
  ownerInitials: string;
  stage: string;
  value: number;
  closeDateMs: number;
  lastActivityAtMs: number;
  signals: SeedSignal[];
  recommendation: {
    title: string;
    rationale: string;
    owner: string;
    dueInDays: number;
  };
  stakeholders: Array<{
    name: string;
    role: string;
    influence: "Decision maker" | "Champion" | "Evaluator" | "Procurement";
    status: "engaged" | "cooling" | "inactive";
    lastActivityAtMs: number;
    activityShare: number;
  }>;
};

const signal = (
  kind: SignalKind,
  risk: number,
  label: string,
  baseline: number,
  current: number,
  unit: string,
  trend: SeedSignal["trend"],
  source: string,
  observedDaysAgo: number,
  evidence: string,
): SeedSignal => ({
  kind,
  risk,
  label,
  baseline,
  current,
  unit,
  trend,
  source,
  observedAtMs: NOW - observedDaysAgo * DAY,
  evidence,
});

const deals: SeedDeal[] = [
  {
    id: "deal-nimbus",
    name: "Enterprise Commerce Renewal",
    account: "Nimbus Retail",
    owner: "Maya Chen",
    ownerInitials: "MC",
    stage: "Negotiation",
    value: 840000,
    closeDateMs: NOW + 24 * DAY,
    lastActivityAtMs: NOW - 6 * DAY,
    signals: [
      signal("response_latency", 90, "Response latency", 5, 29, "hours", "rising", "Gmail", 2, "Median external response time is 5.8× the 90-day relationship baseline."),
      signal("engagement_decline", 88, "Engagement decline", 24, 8, "weekly events", "rising", "Slack + Gmail", 2, "Customer-side activity volume is down 67% across the last three weekly windows."),
      signal("stakeholder_coverage", 84, "Stakeholder coverage", 5, 2, "active contacts", "rising", "Salesforce", 3, "Only two of five mapped buying-committee members remain active in the current window."),
      signal("communication_gap", 92, "Communication gap", 2, 6, "days", "rising", "Gmail", 1, "The current reciprocal-activity gap is three times the established cadence."),
    ],
    recommendation: {
      title: "Re-engage the economic buyer",
      rationale: "Coverage has narrowed while response time and reciprocal-activity gaps are both deteriorating. A sponsor-led checkpoint is the highest-leverage intervention.",
      owner: "Maya Chen",
      dueInDays: 1,
    },
    stakeholders: [
      { name: "Dana Ruiz", role: "VP Digital", influence: "Decision maker", status: "inactive", lastActivityAtMs: NOW - 18 * DAY, activityShare: 4 },
      { name: "Eli Foster", role: "Director, Commerce", influence: "Champion", status: "cooling", lastActivityAtMs: NOW - 8 * DAY, activityShare: 31 },
      { name: "Priya Nair", role: "Security Lead", influence: "Evaluator", status: "engaged", lastActivityAtMs: NOW - 3 * DAY, activityShare: 42 },
      { name: "Noah Kim", role: "Strategic Sourcing", influence: "Procurement", status: "cooling", lastActivityAtMs: NOW - 11 * DAY, activityShare: 15 },
    ],
  },
  {
    id: "deal-atlas",
    name: "Cloud Data Expansion",
    account: "Atlas Systems",
    owner: "Jon Bell",
    ownerInitials: "JB",
    stage: "Proposal",
    value: 620000,
    closeDateMs: NOW + 31 * DAY,
    lastActivityAtMs: NOW - 4 * DAY,
    signals: [
      signal("response_latency", 82, "Response latency", 7, 22, "hours", "rising", "Outlook", 1, "Median response time is 3.1× the prior 60-day baseline."),
      signal("engagement_decline", 74, "Engagement decline", 18, 9, "weekly events", "rising", "Teams + Outlook", 2, "Customer-side activity has declined in three consecutive weekly windows."),
      signal("stakeholder_coverage", 68, "Stakeholder coverage", 6, 3, "active contacts", "rising", "HubSpot", 2, "Activity is concentrated among three of six mapped stakeholders."),
      signal("communication_gap", 80, "Communication gap", 3, 7, "days", "rising", "Outlook", 1, "The longest reciprocal-activity gap is 4 days above the relationship norm."),
    ],
    recommendation: {
      title: "Restore multithreaded coverage",
      rationale: "Engagement is becoming concentrated in a technical evaluator while the executive and procurement lanes cool.",
      owner: "Jon Bell",
      dueInDays: 2,
    },
    stakeholders: [
      { name: "Iris Wong", role: "Chief Data Officer", influence: "Decision maker", status: "cooling", lastActivityAtMs: NOW - 12 * DAY, activityShare: 10 },
      { name: "Marcus Reed", role: "Platform Director", influence: "Champion", status: "engaged", lastActivityAtMs: NOW - 2 * DAY, activityShare: 55 },
      { name: "Ava Shah", role: "Cloud Architecture", influence: "Evaluator", status: "engaged", lastActivityAtMs: NOW - 4 * DAY, activityShare: 25 },
      { name: "Leo Martin", role: "Procurement", influence: "Procurement", status: "inactive", lastActivityAtMs: NOW - 17 * DAY, activityShare: 3 },
    ],
  },
  {
    id: "deal-meridian",
    name: "Clinical Operations Pilot",
    account: "Meridian Health",
    owner: "Sofia Patel",
    ownerInitials: "SP",
    stage: "Evaluation",
    value: 410000,
    closeDateMs: NOW + 38 * DAY,
    lastActivityAtMs: NOW - 3 * DAY,
    signals: [
      signal("response_latency", 68, "Response latency", 9, 18, "hours", "rising", "Gmail", 2, "Median response time has doubled against the relationship baseline."),
      signal("engagement_decline", 64, "Engagement decline", 20, 12, "weekly events", "rising", "Slack + Gmail", 2, "External activity is 40% below the four-week moving average."),
      signal("stakeholder_coverage", 72, "Stakeholder coverage", 5, 2, "active contacts", "rising", "Salesforce", 4, "Three mapped stakeholders have no observed activity in the current window."),
      signal("communication_gap", 60, "Communication gap", 4, 6, "days", "stable", "Gmail", 3, "The current gap is two days beyond the established reciprocal cadence."),
    ],
    recommendation: {
      title: "Confirm evaluation ownership",
      rationale: "The pilot remains active, but stakeholder breadth is contracting. Reconfirm decision roles before the next milestone.",
      owner: "Sofia Patel",
      dueInDays: 3,
    },
    stakeholders: [
      { name: "Grace Liu", role: "COO", influence: "Decision maker", status: "cooling", lastActivityAtMs: NOW - 13 * DAY, activityShare: 9 },
      { name: "Owen Hayes", role: "Clinical Systems", influence: "Champion", status: "engaged", lastActivityAtMs: NOW - 3 * DAY, activityShare: 49 },
      { name: "Sara Ahmed", role: "Privacy Officer", influence: "Evaluator", status: "engaged", lastActivityAtMs: NOW - 5 * DAY, activityShare: 28 },
    ],
  },
  {
    id: "deal-northstar",
    name: "Fleet Intelligence Platform",
    account: "Northstar Logistics",
    owner: "Maya Chen",
    ownerInitials: "MC",
    stage: "Discovery",
    value: 350000,
    closeDateMs: NOW + 53 * DAY,
    lastActivityAtMs: NOW - 2 * DAY,
    signals: [
      signal("response_latency", 52, "Response latency", 8, 13, "hours", "rising", "Gmail", 1, "Response time is 63% above the relationship baseline."),
      signal("engagement_decline", 45, "Engagement decline", 14, 11, "weekly events", "stable", "Slack + Gmail", 2, "Activity is slightly below the recent four-week average."),
      signal("stakeholder_coverage", 44, "Stakeholder coverage", 4, 3, "active contacts", "stable", "Salesforce", 2, "One mapped evaluator has not appeared in the current activity window."),
      signal("communication_gap", 50, "Communication gap", 3, 5, "days", "rising", "Gmail", 1, "The current gap is two days beyond the relationship norm."),
    ],
    recommendation: {
      title: "Validate next-step ownership",
      rationale: "Risk is emerging rather than acute. A clear owner and scheduled checkpoint should prevent further cadence decay.",
      owner: "Maya Chen",
      dueInDays: 5,
    },
    stakeholders: [
      { name: "Henry Cho", role: "VP Operations", influence: "Decision maker", status: "engaged", lastActivityAtMs: NOW - 4 * DAY, activityShare: 28 },
      { name: "Mina Torres", role: "Fleet Analytics", influence: "Champion", status: "engaged", lastActivityAtMs: NOW - 2 * DAY, activityShare: 45 },
      { name: "Theo Brooks", role: "Enterprise IT", influence: "Evaluator", status: "cooling", lastActivityAtMs: NOW - 9 * DAY, activityShare: 14 },
    ],
  },
  {
    id: "deal-cedar",
    name: "Data Governance Rollout",
    account: "Cedar Financial",
    owner: "Jon Bell",
    ownerInitials: "JB",
    stage: "Negotiation",
    value: 510000,
    closeDateMs: NOW + 20 * DAY,
    lastActivityAtMs: NOW - DAY,
    signals: [
      signal("response_latency", 35, "Response latency", 6, 8, "hours", "stable", "Outlook", 1, "Response time remains within the expected variance band."),
      signal("engagement_decline", 30, "Engagement decline", 17, 15, "weekly events", "stable", "Teams + Outlook", 2, "Activity remains close to the recent moving average."),
      signal("stakeholder_coverage", 28, "Stakeholder coverage", 5, 4, "active contacts", "stable", "HubSpot", 1, "Four of five mapped buying-committee members are active."),
      signal("communication_gap", 20, "Communication gap", 3, 3, "days", "improving", "Outlook", 1, "Reciprocal activity is occurring at the expected cadence."),
    ],
    recommendation: {
      title: "Maintain current cadence",
      rationale: "Relationship indicators remain healthy. Continue the agreed operating rhythm and monitor procurement coverage.",
      owner: "Jon Bell",
      dueInDays: 7,
    },
    stakeholders: [
      { name: "Rina Gupta", role: "Chief Risk Officer", influence: "Decision maker", status: "engaged", lastActivityAtMs: NOW - 2 * DAY, activityShare: 24 },
      { name: "Ben Clarke", role: "Data Governance", influence: "Champion", status: "engaged", lastActivityAtMs: NOW - DAY, activityShare: 38 },
      { name: "Mei Tan", role: "Security", influence: "Evaluator", status: "engaged", lastActivityAtMs: NOW - 4 * DAY, activityShare: 20 },
    ],
  },
  {
    id: "deal-lumen",
    name: "Field Service Transformation",
    account: "Lumen Energy",
    owner: "Sofia Patel",
    ownerInitials: "SP",
    stage: "Proposal",
    value: 290000,
    closeDateMs: NOW + 45 * DAY,
    lastActivityAtMs: NOW - DAY,
    signals: [
      signal("response_latency", 20, "Response latency", 10, 9, "hours", "improving", "Gmail", 1, "Response time is slightly faster than the relationship baseline."),
      signal("engagement_decline", 25, "Engagement decline", 12, 13, "weekly events", "improving", "Slack + Gmail", 1, "External activity is above the recent moving average."),
      signal("stakeholder_coverage", 24, "Stakeholder coverage", 4, 4, "active contacts", "stable", "Salesforce", 2, "All mapped buying-committee roles are active."),
      signal("communication_gap", 15, "Communication gap", 4, 3, "days", "improving", "Gmail", 1, "Reciprocal activity is occurring faster than the established cadence."),
    ],
    recommendation: {
      title: "Advance the mutual action plan",
      rationale: "Momentum and stakeholder coverage are healthy. Convert the current engagement into a dated evaluation plan.",
      owner: "Sofia Patel",
      dueInDays: 6,
    },
    stakeholders: [
      { name: "Victor Stone", role: "SVP Field Operations", influence: "Decision maker", status: "engaged", lastActivityAtMs: NOW - 3 * DAY, activityShare: 27 },
      { name: "Amara Cole", role: "Transformation Lead", influence: "Champion", status: "engaged", lastActivityAtMs: NOW - DAY, activityShare: 43 },
      { name: "Lucas Meyer", role: "Enterprise Apps", influence: "Evaluator", status: "engaged", lastActivityAtMs: NOW - 2 * DAY, activityShare: 21 },
    ],
  },
];

export const dealPortfolio = deals.map(deal => {
  const risk = calculateDealRisk(deal.signals);
  return {
    ...deal,
    risk,
    predictedStallDateMs: risk.forecastToStall ? NOW + risk.forecastWindowDays * DAY : null,
  };
});

export const portfolioTrend = [
  { label: "Jul 7", portfolioHealth: 82, atRiskValue: 1040000 },
  { label: "Jul 14", portfolioHealth: 80, atRiskValue: 1040000 },
  { label: "Jul 21", portfolioHealth: 78, atRiskValue: 1250000 },
  { label: "Jul 28", portfolioHealth: 76, atRiskValue: 1460000 },
  { label: "Aug 4", portfolioHealth: 73, atRiskValue: 1460000 },
  { label: "Aug 11", portfolioHealth: 71, atRiskValue: 1870000 },
  { label: "Aug 18", portfolioHealth: 69, atRiskValue: 1870000 },
  { label: "Aug 25", portfolioHealth: 68, atRiskValue: 1870000 },
];

export const integrations = [
  { provider: "gmail", name: "Gmail", category: "Email", status: "connected", connection: "North America Sales", lastSyncAtMs: NOW - 7 * 60_000, events: 18420, collected: ["message ID", "sent timestamp", "sender ID", "recipient IDs", "thread ID", "direction"] },
  { provider: "outlook", name: "Outlook", category: "Email", status: "available", connection: null, lastSyncAtMs: null, events: 0, collected: ["message ID", "sent timestamp", "sender ID", "recipient IDs", "thread ID", "direction"] },
  { provider: "slack", name: "Slack", category: "Collaboration", status: "connected", connection: "AuraSync GTM", lastSyncAtMs: NOW - 4 * 60_000, events: 12768, collected: ["activity timestamp", "participant IDs", "channel ID", "thread relationship", "reaction count"] },
  { provider: "teams", name: "Microsoft Teams", category: "Collaboration", status: "attention", connection: "EMEA Revenue", lastSyncAtMs: NOW - 19 * 60 * 60_000, events: 3940, collected: ["activity timestamp", "participant IDs", "channel ID", "thread relationship", "meeting attendance"] },
  { provider: "salesforce", name: "Salesforce", category: "CRM", status: "connected", connection: "Production Org", lastSyncAtMs: NOW - 12 * 60_000, events: 642, collected: ["deal ID", "account", "stage", "owner", "amount", "close date", "contact roles"] },
  { provider: "hubspot", name: "HubSpot", category: "CRM", status: "available", connection: null, lastSyncAtMs: null, events: 0, collected: ["deal ID", "account", "stage", "owner", "amount", "close date", "associated contacts"] },
] as const;

export const governance = {
  posture: "Enforced",
  retentionDays: 90,
  lastReviewAtMs: NOW - 8 * DAY,
  nextReviewAtMs: NOW + 82 * DAY,
  controls: [
    { name: "Content collection", status: "Blocked at ingestion", detail: "Connector scopes and ingestion contracts exclude message subjects, bodies, attachments, transcripts, and recordings." },
    { name: "Participant protection", status: "Enabled", detail: "Source identifiers are normalized and pseudonymized before signal computation." },
    { name: "Purpose limitation", status: "Enforced", detail: "Metadata is processed only for deal-level relationship signals and portfolio analytics." },
    { name: "Auditability", status: "Enabled", detail: "Every score component retains source, observation time, baseline, and calculation provenance." },
  ],
  collectedFields: METADATA_ONLY_FIELDS,
  prohibitedFields: PROHIBITED_CONTENT_FIELDS,
  processingStages: [
    { title: "Connect", description: "Authorize least-privilege metadata scopes for communication and CRM systems." },
    { title: "Normalize", description: "Transform timestamps, participant identifiers, threads, and CRM references into a common event model." },
    { title: "Compute", description: "Aggregate latency, volume, coverage, and gap signals without inspecting semantic content." },
    { title: "Explain", description: "Show score contributions, time windows, source systems, and recommended operating actions." },
  ],
};

export function getDashboardSnapshot() {
  const totalValue = dealPortfolio.reduce((sum, deal) => sum + deal.value, 0);
  const atRiskDeals = dealPortfolio.filter(deal => deal.risk.forecastToStall);
  const atRiskValue = atRiskDeals.reduce((sum, deal) => sum + deal.value, 0);
  const valueWeightedDecay =
    dealPortfolio.reduce((sum, deal) => sum + deal.risk.score * deal.value, 0) / totalValue;
  const portfolioHealth = Math.round(100 - valueWeightedDecay * 0.52);

  return {
    workspace: { name: "AuraSync Enterprise — Demo", mode: "Seeded workspace", asOfMs: NOW },
    summary: {
      portfolioHealth,
      totalDeals: dealPortfolio.length,
      totalValue,
      atRiskDeals: atRiskDeals.length,
      atRiskValue,
      newAlerts: 3,
      averageRisk: Math.round(dealPortfolio.reduce((sum, deal) => sum + deal.risk.score, 0) / dealPortfolio.length),
    },
    trend: portfolioTrend,
    prioritizedAlerts: [...dealPortfolio]
      .sort((a, b) => b.risk.score - a.risk.score)
      .slice(0, 4)
      .map(deal => ({
        dealId: deal.id,
        account: deal.account,
        dealName: deal.name,
        score: deal.risk.score,
        level: deal.risk.level,
        value: deal.value,
        owner: deal.owner,
        signal: deal.signals.sort((a, b) => b.risk - a.risk)[0],
        recommendation: deal.recommendation,
      })),
    riskDistribution: (["critical", "high", "medium", "low"] as const).map(level => ({
      level,
      count: dealPortfolio.filter(deal => deal.risk.level === level).length,
      value: dealPortfolio.filter(deal => deal.risk.level === level).reduce((sum, deal) => sum + deal.value, 0),
    })),
  };
}

export function getDealById(id: string) {
  return dealPortfolio.find(deal => deal.id === id) ?? null;
}
