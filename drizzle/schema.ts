import {
  bigint,
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const workspaces = mysqlTable("workspaces", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  mode: mysqlEnum("mode", ["demo", "live"]).default("demo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const deals = mysqlTable("deals", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  externalId: varchar("externalId", { length: 128 }).notNull(),
  name: varchar("name", { length: 240 }).notNull(),
  accountName: varchar("accountName", { length: 200 }).notNull(),
  ownerName: varchar("ownerName", { length: 160 }).notNull(),
  stage: varchar("stage", { length: 120 }).notNull(),
  valueCents: bigint("valueCents", { mode: "number" }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  closeDateMs: bigint("closeDateMs", { mode: "number" }).notNull(),
  lastActivityAtMs: bigint("lastActivityAtMs", { mode: "number" }).notNull(),
  decayScore: int("decayScore").notNull(),
  riskLevel: mysqlEnum("riskLevel", ["critical", "high", "medium", "low"]).notNull(),
  predictedStallDateMs: bigint("predictedStallDateMs", { mode: "number" }),
  recommendedAction: text("recommendedAction").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const dealSignals = mysqlTable("dealSignals", {
  id: int("id").autoincrement().primaryKey(),
  dealId: int("dealId").notNull(),
  kind: mysqlEnum("kind", [
    "response_latency",
    "engagement_decline",
    "stakeholder_coverage",
    "communication_gap",
  ]).notNull(),
  riskScore: int("riskScore").notNull(),
  contribution: int("contribution").notNull(),
  trend: mysqlEnum("trend", ["rising", "stable", "improving"]).notNull(),
  baselineValue: int("baselineValue").notNull(),
  currentValue: int("currentValue").notNull(),
  unit: varchar("unit", { length: 40 }).notNull(),
  sourceSystem: varchar("sourceSystem", { length: 40 }).notNull(),
  observedAtMs: bigint("observedAtMs", { mode: "number" }).notNull(),
  provenance: text("provenance").notNull(),
});

export const integrations = mysqlTable("integrations", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  provider: mysqlEnum("provider", [
    "gmail",
    "outlook",
    "slack",
    "teams",
    "salesforce",
    "hubspot",
  ]).notNull(),
  category: mysqlEnum("category", ["email", "collaboration", "crm"]).notNull(),
  status: mysqlEnum("status", ["connected", "attention", "available"]).notNull(),
  connectionName: varchar("connectionName", { length: 200 }),
  collectedFields: text("collectedFields").notNull(),
  lastSyncAtMs: bigint("lastSyncAtMs", { mode: "number" }),
  eventCount: int("eventCount").default(0).notNull(),
  metadataScopeVerified: boolean("metadataScopeVerified").default(true).notNull(),
});

export const governancePolicies = mysqlTable("governancePolicies", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  retentionDays: int("retentionDays").default(90).notNull(),
  contentCollectionDisabled: boolean("contentCollectionDisabled").default(true).notNull(),
  contentStorageDisabled: boolean("contentStorageDisabled").default(true).notNull(),
  participantHashingEnabled: boolean("participantHashingEnabled").default(true).notNull(),
  auditLoggingEnabled: boolean("auditLoggingEnabled").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type DealSignal = typeof dealSignals.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type GovernancePolicy = typeof governancePolicies.$inferSelect;
