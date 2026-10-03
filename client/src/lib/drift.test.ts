import { describe, expect, it } from "vitest";
import {
  calendarEvent,
  daysFromToday,
  dueContacts,
  parseDriftData,
  serializeDriftData,
  upcomingContacts,
  type DriftContact,
} from "./drift";

const contacts: DriftContact[] = [
  {
    id: "due",
    name: "Maya",
    cadenceDays: 7,
    lastConnectedOn: "2026-09-10",
    reminderOn: "2026-10-04",
    paused: false,
    checkIns: [],
  },
  {
    id: "upcoming",
    name: "Sam",
    cadenceDays: 30,
    lastConnectedOn: "2026-09-20",
    reminderOn: "2026-10-11",
    paused: false,
    checkIns: [],
  },
  {
    id: "paused",
    name: "Jo",
    cadenceDays: 14,
    lastConnectedOn: "2026-09-01",
    reminderOn: "2026-10-03",
    paused: true,
    checkIns: [],
  },
  {
    id: "none",
    name: "Alex",
    cadenceDays: 3,
    lastConnectedOn: "2026-10-01",
    reminderOn: null,
    paused: false,
    checkIns: [],
  },
];

describe("Drift local data", () => {
  it("round-trips versioned contact data and rejects invalid records", () => {
    expect(parseDriftData(serializeDriftData(contacts))).toEqual(contacts);
    expect(() => parseDriftData('{"version":2,"contacts":[]}')).toThrow(
      "unsupported version",
    );
    expect(() => parseDriftData('{"version":1,"contacts":[{"name":"Maya"}]}')).toThrow(
      "incomplete",
    );
  });

  it("separates due and upcoming reminders, excluding paused contacts", () => {
    expect(dueContacts(contacts, "2026-10-04").map(contact => contact.id)).toEqual([
      "due",
    ]);
    expect(upcomingContacts(contacts, "2026-10-04").map(contact => contact.id)).toEqual([
      "upcoming",
    ]);
  });

  it("creates reminder dates using calendar days", () => {
    expect(daysFromToday(7, new Date(2026, 9, 4))).toBe("2026-10-11");
  });

  it("exports a calendar reminder with escaped contact text", () => {
    const content = calendarEvent(
      { ...contacts[0], name: "Maya, Jo; & Sam" },
      new Date("2026-10-04T10:00:00.000Z"),
    );
    expect(content).toContain("DTSTART:20261004T090000");
    expect(content).toContain("SUMMARY:Check in with Maya\\, Jo\\; & Sam");
    expect(content).toContain("TRIGGER:-PT5M");
  });
});
