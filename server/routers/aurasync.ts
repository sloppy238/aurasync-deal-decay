import { z } from "zod";
import { validateMetadataCsv, type ImportSource } from "../../shared/csvImport";
import { publicProcedure, router } from "../_core/trpc";
import {
  dealPortfolio,
  getDashboardSnapshot,
  getDealById,
  governance,
  integrations,
} from "../demoData";

const importSourceSchema = z.enum(["salesforce", "gmail"]);

export const aurasyncRouter = router({
  dashboard: publicProcedure.query(() => getDashboardSnapshot()),
  deals: publicProcedure.query(() => dealPortfolio),
  deal: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(({ input }) => getDealById(input.id)),
  integrations: publicProcedure.query(() => integrations),
  governance: publicProcedure.query(() => governance),
  importContract: publicProcedure
    .input(z.object({ source: importSourceSchema }))
    .query(({ input }) => {
      const source = input.source as ImportSource;
      return {
        ...getImportContract(source),
        privacyNote: "Files are parsed locally. Only validation summaries are sent to AuraSync; raw CSV rows are never uploaded.",
      };
    }),
  validateImport: publicProcedure
    .input(z.object({ source: importSourceSchema, csv: z.string().max(2_000_000) }))
    .mutation(({ input }) => validateMetadataCsv(input.source, input.csv)),
  stageImport: publicProcedure
    .input(z.object({
      source: importSourceSchema,
      columns: z.array(z.string()).max(30),
      rowCount: z.number().int().min(0).max(100_000),
      acceptedCount: z.number().int().min(0).max(100_000),
      rejectedCount: z.number().int().min(0).max(100_000),
    }))
    .mutation(({ input }) => ({
      staged: input.acceptedCount > 0 && input.rejectedCount === 0,
      source: input.source,
      columns: input.columns,
      rowCount: input.rowCount,
      acceptedCount: input.acceptedCount,
      rejectedCount: input.rejectedCount,
      importedAtMs: Date.now(),
      mode: "local_metadata_import" as const,
      message: input.acceptedCount > 0 && input.rejectedCount === 0
        ? "Metadata staged for relationship scoring."
        : "Nothing staged. Resolve the validation issues and try again.",
    })),
});

function getImportContract(source: ImportSource) {
  return {
    source,
    allowedColumns: source === "salesforce"
      ? ["opportunity_id", "opportunity_name", "account_name", "stage", "owner_email", "amount", "close_date", "contact_id", "contact_role"]
      : ["message_id", "occurred_at", "sender_id", "participant_ids", "thread_id", "direction", "label_ids"],
    prohibitedColumns: ["subject", "body", "message_body", "attachment", "attachment_content", "transcript", "recording", "raw", "payload", "snippet", "summary"],
    description: source === "salesforce"
      ? "Opportunity and contact-role metadata for safe CRM association."
      : "Message timing, participants, thread relationships, and labels only.",
  } as const;
}
