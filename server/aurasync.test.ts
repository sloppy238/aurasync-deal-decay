import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { dealPortfolio, getDashboardSnapshot, integrations } from "./demoData";
import { calculateDealRisk, riskLevelForScore } from "../shared/riskModel";

const DAY = 86_400_000;

function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function collectKeys(value: unknown, keys: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach(item => collectKeys(item, keys));
    return keys;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, nested]) => {
      keys.push(key);
      collectKeys(nested, keys);
    });
  }
  return keys;
}

describe("AuraSync deal decay scoring", () => {
  it("applies the four explicit signal weights and forecasts high-risk deals", () => {
    const result = calculateDealRisk([
      { kind: "response_latency", risk: 90 },
      { kind: "engagement_decline", risk: 80 },
      { kind: "stakeholder_coverage", risk: 70 },
      { kind: "communication_gap", risk: 60 },
    ]);

    expect(result.contributions).toEqual({
      response_latency: 27,
      engagement_decline: 20,
      stakeholder_coverage: 18,
      communication_gap: 12,
    });
    expect(result.score).toBe(77);
    expect(result.level).toBe("high");
    expect(result.forecastToStall).toBe(true);
    expect(result.forecastWindowDays).toBe(30);
  });

  it("uses stable, deterministic risk bands", () => {
    expect(riskLevelForScore(80)).toBe("critical");
    expect(riskLevelForScore(65)).toBe("high");
    expect(riskLevelForScore(45)).toBe("medium");
    expect(riskLevelForScore(44)).toBe("low");
  });

  it("clamps malformed signal risk values into the valid score range", () => {
    const result = calculateDealRisk([
      { kind: "response_latency", risk: 140 },
      { kind: "engagement_decline", risk: -20 },
      { kind: "stakeholder_coverage", risk: 100 },
      { kind: "communication_gap", risk: 100 },
    ]);
    expect(result.score).toBe(75);
  });
});

describe("AuraSync seeded workspace", () => {
  it("creates a thirty-day forecast date only for flagged deals", () => {
    const snapshot = getDashboardSnapshot();
    dealPortfolio.forEach(deal => {
      if (deal.risk.forecastToStall) {
        expect(deal.predictedStallDateMs).toBe(snapshot.workspace.asOfMs + 30 * DAY);
      } else {
        expect(deal.predictedStallDateMs).toBeNull();
      }
    });
  });

  it("contains no content-bearing fields in deal or integration records", () => {
    const keys = collectKeys({ deals: dealPortfolio, integrations }).map(key => key.toLowerCase());
    const prohibitedKeys = [
      "subject",
      "body",
      "messagebody",
      "attachmentcontent",
      "transcript",
      "recording",
      "semanticsummary",
    ];
    prohibitedKeys.forEach(key => expect(keys).not.toContain(key));
  });

  it("prioritizes dashboard alerts in descending risk order", () => {
    const alerts = getDashboardSnapshot().prioritizedAlerts;
    expect(alerts).toHaveLength(4);
    expect(alerts.map(alert => alert.score)).toEqual(
      [...alerts].map(alert => alert.score).sort((a, b) => b - a),
    );
  });
});

describe("AuraSync API", () => {
  it("serves the demo dashboard and deal detail through typed procedures", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());
    const dashboard = await caller.aurasync.dashboard();
    const detail = await caller.aurasync.deal({ id: dashboard.prioritizedAlerts[0].dealId });

    expect(dashboard.summary.totalDeals).toBe(dealPortfolio.length);
    expect(detail?.risk.forecastWindowDays).toBe(30);
    expect(detail?.signals).toHaveLength(4);
  });
});
