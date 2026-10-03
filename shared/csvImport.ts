export type ImportSource = "salesforce" | "gmail";

export type ImportValidationResult = {
  source: ImportSource;
  accepted: boolean;
  columns: string[];
  rowCount: number;
  acceptedCount: number;
  rejectedCount: number;
  errors: string[];
};

const prohibitedColumns = new Set([
  "subject",
  "body",
  "message_body",
  "messagebody",
  "attachment",
  "attachment_content",
  "transcript",
  "recording",
  "raw",
  "payload",
  "snippet",
  "summary",
]);

const allowedColumns: Record<ImportSource, string[]> = {
  salesforce: [
    "opportunity_id",
    "opportunity_name",
    "account_name",
    "stage",
    "owner_email",
    "amount",
    "close_date",
    "contact_id",
    "contact_role",
  ],
  gmail: [
    "message_id",
    "occurred_at",
    "sender_id",
    "participant_ids",
    "thread_id",
    "direction",
    "label_ids",
  ],
};

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "_");

export function getImportContract(source: ImportSource) {
  return {
    source,
    allowedColumns: allowedColumns[source],
    prohibitedColumns: Array.from(prohibitedColumns),
    description:
      source === "salesforce"
        ? "Opportunity and contact-role metadata for safe CRM association."
        : "Message timing, participants, thread relationships, and labels only.",
  } as const;
}

export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

export function validateMetadataCsv(source: ImportSource, csv: string): ImportValidationResult {
  const errors: string[] = [];
  if (csv.length > 2_000_000) errors.push("The file exceeds the 2 MB local import limit.");
  const quoteCount = (csv.match(/\"/g) ?? []).length;
  if (quoteCount % 2 !== 0) errors.push("The file contains an unclosed quoted field.");
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim().length > 0);
  const columns = lines.length > 0 ? parseCsvLine(lines[0]).map(normalize) : [];
  const contract = getImportContract(source);
  const allowed = new Set(contract.allowedColumns);
  const prohibitedFound = columns.filter(column => prohibitedColumns.has(column));
  const unknown = columns.filter(column => !allowed.has(column) && !prohibitedColumns.has(column));

  if (lines.length === 0) errors.push("The file is empty.");
  if (columns.length === 0) errors.push("A header row is required.");
  if (prohibitedFound.length > 0) errors.push(`Blocked content-bearing columns: ${prohibitedFound.join(", ")}.`);
  if (unknown.length > 0) errors.push(`Unrecognized columns: ${unknown.join(", ")}.`);
  if (source === "salesforce" && !columns.includes("opportunity_id")) errors.push("Salesforce files require opportunity_id.");
  if (source === "gmail" && !columns.includes("occurred_at")) errors.push("Gmail files require occurred_at.");
  lines.slice(1).forEach((line, index) => {
    if (parseCsvLine(line).length !== columns.length) errors.push(`Row ${index + 2} has a different number of columns than the header.`);
  });

  const rowCount = Math.max(0, lines.length - 1);
  const accepted = errors.length === 0 && rowCount > 0;
  return {
    source,
    accepted,
    columns,
    rowCount,
    acceptedCount: accepted ? rowCount : 0,
    rejectedCount: accepted ? 0 : rowCount,
    errors,
  };
}
