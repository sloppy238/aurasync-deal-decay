export const SIGNAL_KINDS = [
  "response_latency",
  "engagement_decline",
  "stakeholder_coverage",
  "communication_gap",
] as const;

export type SignalKind = (typeof SIGNAL_KINDS)[number];
export type RiskLevel = "critical" | "high" | "medium" | "low";

export type DealSignalInput = {
  kind: SignalKind;
  risk: number;
};

export type DealRiskResult = {
  score: number;
  level: RiskLevel;
  forecastWindowDays: 30;
  forecastToStall: boolean;
  contributions: Record<SignalKind, number>;
};

export const SIGNAL_WEIGHTS: Record<SignalKind, number> = {
  response_latency: 0.3,
  engagement_decline: 0.25,
  stakeholder_coverage: 0.25,
  communication_gap: 0.2,
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));

export function riskLevelForScore(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 65) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export function calculateDealRisk(signals: DealSignalInput[]): DealRiskResult {
  const byKind = new Map(signals.map(signal => [signal.kind, clamp(signal.risk)]));
  const contributions = SIGNAL_KINDS.reduce(
    (result, kind) => {
      result[kind] = Math.round((byKind.get(kind) ?? 0) * SIGNAL_WEIGHTS[kind]);
      return result;
    },
    {} as Record<SignalKind, number>,
  );

  const score = clamp(
    Math.round(Object.values(contributions).reduce((sum, value) => sum + value, 0)),
  );

  return {
    score,
    level: riskLevelForScore(score),
    forecastWindowDays: 30,
    forecastToStall: score >= 65,
    contributions,
  };
}

export const METADATA_ONLY_FIELDS = [
  "message or activity identifier",
  "sent or occurred timestamp",
  "sender identifier",
  "recipient or participant identifiers",
  "channel or system identifier",
  "response-thread relationship",
  "meeting attendance status",
  "CRM deal, stage, owner, amount, and close-date fields",
] as const;

export const PROHIBITED_CONTENT_FIELDS = [
  "subject",
  "message body",
  "attachment content",
  "meeting transcript",
  "call recording",
  "semantic summary",
] as const;

export type MetadataEvent = {
  eventId: string;
  occurredAtMs: number;
  source: "gmail" | "outlook" | "slack" | "teams" | "salesforce" | "hubspot";
  participantIds: string[];
  channelId?: string;
  threadId?: string;
  direction?: "inbound" | "outbound" | "internal";
  dealExternalId?: string;
};
