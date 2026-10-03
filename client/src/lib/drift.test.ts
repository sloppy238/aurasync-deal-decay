import { describe, expect, it } from "vitest";
import {
  calendarEvent,
  contactsCsvTemplate,
  daysFromToday,
  dueContacts,
  parseContactsCsv,
  parseDriftData,
  reminderAfterCheckIn,
  reminderAfterSnooze,
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
    repeatReminder: false,
    paused: false,
    notes: "",
    checkIns: [],
    plans: [],
    tasks: [],
  },
  {
    id: "upcoming",
    name: "Sam",
    cadenceDays: 30,
    lastConnectedOn: "2026-09-20",
    reminderOn: "2026-10-11",
    repeatReminder: false,
    paused: false,
    notes: "",
    checkIns: [],
    plans: [],
    tasks: [],
  },
  {
    id: "paused",
    name: "Jo",
    cadenceDays: 14,
    lastConnectedOn: "2026-09-01",
    reminderOn: "2026-10-03",
    repeatReminder: false,
    paused: true,
    notes: "",
    checkIns: [],
    plans: [],
    tasks: [],
  },
  {
    id: "none",
    name: "Alex",
    cadenceDays: 3,
    lastConnectedOn: "2026-10-01",
    reminderOn: null,
    repeatReminder: false,
    paused: false,
    notes: "",
    checkIns: [],
    plans: [],
    tasks: [],
  },
];

describe("Drift local data", () => {
  it("round-trips versioned contact data and rejects invalid records", () => {
    expect(parseDriftData(serializeDriftData(contacts))).toEqual(contacts);
    expect(() => parseDriftData('{"version":3,"contacts":[]}')).toThrow(
      "unsupported version"
    );
    expect(() =>
      parseDriftData('{"version":2,"contacts":[{"name":"Maya"}]}')
    ).toThrow("incomplete");
    expect(() =>
      parseDriftData(
        JSON.stringify({
          version: 2,
          contacts: [{ ...contacts[0], notes: "x".repeat(2001) }],
        })
      )
    ).toThrow("incomplete");
  });

  it("migrates version-one data and preserves existing check-in history", () => {
    const {
      repeatReminder: _repeat,
      notes: _notes,
      plans: _plans,
      tasks: _tasks,
      ...legacy
    } = contacts[0];
    expect(
      parseDriftData(JSON.stringify({ version: 1, contacts: [legacy] }))
    ).toEqual([
      {
        ...contacts[0],
        repeatReminder: false,
        notes: "",
        plans: [],
        tasks: [],
      },
    ]);
  });

  it("separates due and upcoming reminders, excluding paused contacts", () => {
    expect(
      dueContacts(contacts, "2026-10-04").map(contact => contact.id)
    ).toEqual(["due"]);
    expect(
      upcomingContacts(contacts, "2026-10-04").map(contact => contact.id)
    ).toEqual(["upcoming"]);
  });

  it("creates reminder dates using calendar days", () => {
    expect(daysFromToday(7, new Date(2026, 9, 4))).toBe("2026-10-11");
    expect(reminderAfterCheckIn(contacts[0], new Date(2026, 9, 4))).toBeNull();
    expect(
      reminderAfterCheckIn(
        { ...contacts[0], repeatReminder: true },
        new Date(2026, 9, 4)
      )
    ).toBe("2026-10-11");
    expect(reminderAfterSnooze(contacts[2], new Date(2026, 9, 4))).toBe(
      "2026-10-18"
    );
  });

  it("exports a calendar reminder with escaped contact text", () => {
    const content = calendarEvent(
      { ...contacts[0], name: "Maya, Jo; & Sam" },
      new Date("2026-10-04T10:00:00.000Z")
    );
    expect(content).toContain("DTSTART:20261004T090000");
    expect(content).toContain("SUMMARY:Check in with Maya\\, Jo\\; & Sam");
    expect(content).toContain("TRIGGER:-PT5M");
  });

  it("parses a minimal CSV and preserves quoted commas in names and notes", () => {
    expect(
      parseContactsCsv(
        `${contactsCsvTemplate()}"Maya, Jo",14,2026-09-10,2026-10-12,"Talk about art, not work"`
      )
    ).toEqual([
      {
        name: "Maya, Jo",
        cadenceDays: 14,
        lastConnectedOn: "2026-09-10",
        reminderOn: "2026-10-12",
        repeatReminder: false,
        paused: false,
        notes: "Talk about art, not work",
      },
    ]);
  });

  it("rejects malformed CSV rows instead of partially importing", () => {
    expect(() => parseContactsCsv("name,cadence_days\nMaya,5")).toThrow(
      "cadence_days"
    );
    expect(() => parseContactsCsv('name,notes\nMaya,"unfinished')).toThrow(
      "unfinished quoted field"
    );
  });
});
