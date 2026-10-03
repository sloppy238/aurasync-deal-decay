import { describe, expect, it } from "vitest";
import { parseCsvLine, validateMetadataCsv } from "../shared/csvImport";

describe("metadata-only CSV import", () => {
  it("parses quoted CSV cells without interpreting content fields", () => {
    expect(parseCsvLine('opportunity_id,"Nimbus, Inc.",Negotiation')).toEqual([
      "opportunity_id",
      "Nimbus, Inc.",
      "Negotiation",
    ]);
  });

  it("accepts a Salesforce opportunity metadata export", () => {
    const result = validateMetadataCsv(
      "salesforce",
      "opportunity_id,account_name,stage,amount,close_date\n006-demo,Nimbus Retail,Negotiation,840000,2026-09-25\n",
    );
    expect(result.accepted).toBe(true);
    expect(result.acceptedCount).toBe(1);
    expect(result.rejectedCount).toBe(0);
  });

  it("accepts a Gmail metadata export only when the timestamp is present", () => {
    const result = validateMetadataCsv(
      "gmail",
      "message_id,occurred_at,sender_id,participant_ids,thread_id,direction\nmsg-001,2026-09-01T12:00:00Z,sender-001,p-001|p-002,thread-001,inbound\n",
    );
    expect(result.accepted).toBe(true);
    expect(result.columns).toContain("participant_ids");
  });

  it("blocks content-bearing columns before anything can be staged", () => {
    const result = validateMetadataCsv(
      "gmail",
      "message_id,occurred_at,subject,body\nmsg-001,2026-09-01T12:00:00Z,not stored,not stored\n",
    );
    expect(result.accepted).toBe(false);
    expect(result.acceptedCount).toBe(0);
    expect(result.errors.join(" ")).toContain("Blocked content-bearing columns");
  });

  it("blocks unknown columns instead of silently accepting broader exports", () => {
    const result = validateMetadataCsv(
      "salesforce",
      "opportunity_id,account_name,internal_notes\n006-demo,Nimbus Retail,private\n",
    );
    expect(result.accepted).toBe(false);
    expect(result.errors.join(" ")).toContain("Unrecognized columns");
  });
});


describe("metadata-only CSV import edge cases", () => {
  it("rejects an oversized file before staging", () => {
    const result = validateMetadataCsv("salesforce", "opportunity_id\n" + "x".repeat(2_000_001));
    expect(result.accepted).toBe(false);
    expect(result.errors).toContain("The file exceeds the 2 MB local import limit.");
  });

  it("rejects an unclosed quoted field", () => {
    const result = validateMetadataCsv("gmail", "message_id,occurred_at\n\"msg-001,2026-09-01T12:00:00Z\n");
    expect(result.accepted).toBe(false);
    expect(result.errors).toContain("The file contains an unclosed quoted field.");
  });

  it("rejects rows with a different number of columns", () => {
    const result = validateMetadataCsv("gmail", "message_id,occurred_at,sender_id\nmsg-001,2026-09-01T12:00:00Z\n");
    expect(result.accepted).toBe(false);
    expect(result.errors).toContain("Row 2 has a different number of columns than the header.");
  });
});
