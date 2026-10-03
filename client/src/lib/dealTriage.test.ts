import { describe, expect, it } from "vitest";
import { filterAndSortDeals, getHighestPriorityAccount, getRiskSpan, type TriageDeal } from "./dealTriage";

const deals: TriageDeal[] = [
  { account: "Atlas Systems", name: "Cloud expansion", owner: "Jon Bell", value: 620_000, risk: { score: 77, forecastToStall: true } },
  { account: "Cedar Financial", name: "Data rollout", owner: "Maya Chen", value: 510_000, risk: { score: 30, forecastToStall: false } },
  { account: "Nimbus Retail", name: "Renewal", owner: "Maya Chen", value: 840_000, risk: { score: 88, forecastToStall: true } },
];

describe("deal triage utilities", () => {
  it("sorts a copy without mutating the source collection", () => {
    const originalOrder = deals.map(deal => deal.account);
    const result = filterAndSortDeals(deals, "", "all", "descending");

    expect(result.map(deal => deal.account)).toEqual(["Nimbus Retail", "Atlas Systems", "Cedar Financial"]);
    expect(deals.map(deal => deal.account)).toEqual(originalOrder);
  });

  it("filters by account, owner, and forecast posture", () => {
    expect(filterAndSortDeals(deals, "maya", "all", "descending").map(deal => deal.account)).toEqual(["Nimbus Retail", "Cedar Financial"]);
    expect(filterAndSortDeals(deals, "", "at-risk", "descending").map(deal => deal.account)).toEqual(["Nimbus Retail", "Atlas Systems"]);
    expect(filterAndSortDeals(deals, "", "healthy", "descending").map(deal => deal.account)).toEqual(["Cedar Financial"]);
  });

  it("returns safe summary values for an empty portfolio", () => {
    expect(getRiskSpan([])).toBe("—");
    expect(getHighestPriorityAccount([])).toBe("—");
  });
});
