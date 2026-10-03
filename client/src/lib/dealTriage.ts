export type TriageDeal = {
  account: string;
  name: string;
  owner: string;
  value: number;
  risk: {
    score: number;
    forecastToStall: boolean;
  };
};

export type TriageFilter = "all" | "at-risk" | "healthy";
export type TriageSortDirection = "descending" | "ascending";

export function filterAndSortDeals<T extends TriageDeal>(
  deals: readonly T[],
  search: string,
  filter: TriageFilter,
  sortDirection: TriageSortDirection,
): T[] {
  const query = search.trim().toLowerCase();
  return [...deals]
    .filter(deal => !query || `${deal.account} ${deal.name} ${deal.owner}`.toLowerCase().includes(query))
    .filter(deal => filter === "all" || (filter === "at-risk" ? deal.risk.forecastToStall : !deal.risk.forecastToStall))
    .sort((a, b) => sortDirection === "descending" ? b.risk.score - a.risk.score : a.risk.score - b.risk.score);
}

export function getRiskSpan<T extends TriageDeal>(deals: readonly T[]): string {
  if (deals.length === 0) return "—";
  const scores = deals.map(deal => deal.risk.score);
  return `${Math.min(...scores)}–${Math.max(...scores)}`;
}

export function getHighestPriorityAccount<T extends TriageDeal>(deals: readonly T[]): string {
  return [...deals].sort((a, b) => b.risk.score - a.risk.score)[0]?.account ?? "—";
}
