export const DRIFT_STORAGE_KEY = "drift.relationships.v1";

export const CADENCE_OPTIONS = [
  { days: 3, label: "Every few days" },
  { days: 7, label: "Weekly" },
  { days: 14, label: "Every couple of weeks" },
  { days: 30, label: "Monthly" },
] as const;

export type CadenceDays = (typeof CADENCE_OPTIONS)[number]["days"];

export type DriftCheckIn = {
  id: string;
  connectedOn: string;
};

export type DriftContact = {
  id: string;
  name: string;
  cadenceDays: CadenceDays;
  lastConnectedOn: string;
  reminderOn: string | null;
  paused: boolean;
  checkIns: DriftCheckIn[];
};

type StoredDriftData = {
  version: 1;
  contacts: DriftContact[];
};

function isDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && localDateString(parsed) === value;
}

function isCadenceDays(value: unknown): value is CadenceDays {
  return CADENCE_OPTIONS.some(option => option.days === value);
}

function isCheckIn(value: unknown): value is DriftCheckIn {
  if (typeof value !== "object" || value === null) return false;
  const checkIn = value as Record<string, unknown>;
  return typeof checkIn.id === "string" && isDateOnly(checkIn.connectedOn);
}

function isContact(value: unknown): value is DriftContact {
  if (typeof value !== "object" || value === null) return false;
  const contact = value as Record<string, unknown>;
  return (
    typeof contact.id === "string" &&
    typeof contact.name === "string" &&
    contact.name.trim().length > 0 &&
    isCadenceDays(contact.cadenceDays) &&
    isDateOnly(contact.lastConnectedOn) &&
    (contact.reminderOn === null || isDateOnly(contact.reminderOn)) &&
    typeof contact.paused === "boolean" &&
    Array.isArray(contact.checkIns) &&
    contact.checkIns.every(isCheckIn)
  );
}

export function parseDriftData(raw: string): DriftContact[] {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Saved Drift data is not in a supported format.");
  }
  const data = parsed as Record<string, unknown>;
  if (
    data.version !== 1 ||
    !Array.isArray(data.contacts) ||
    !data.contacts.every(isContact)
  ) {
    throw new Error("Saved Drift data is incomplete or from an unsupported version.");
  }
  return data.contacts;
}

export function serializeDriftData(contacts: DriftContact[]): string {
  const data: StoredDriftData = { version: 1, contacts };
  return JSON.stringify(data);
}

export function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function cadenceLabel(days: CadenceDays): string {
  return CADENCE_OPTIONS.find(option => option.days === days)?.label ?? "Custom";
}

export function dueContacts(
  contacts: DriftContact[],
  today = localDateString(),
): DriftContact[] {
  return contacts
    .filter(contact => !contact.paused && contact.reminderOn !== null && contact.reminderOn <= today)
    .sort((a, b) => (a.reminderOn ?? "").localeCompare(b.reminderOn ?? ""));
}

export function upcomingContacts(
  contacts: DriftContact[],
  today = localDateString(),
): DriftContact[] {
  return contacts
    .filter(contact => !contact.paused && contact.reminderOn !== null && contact.reminderOn > today)
    .sort((a, b) => (a.reminderOn ?? "").localeCompare(b.reminderOn ?? ""));
}

export function displayDate(value: string | null): string {
  if (!value) return "No reminder planned";
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}

export function daysFromToday(days: number, date = new Date()): string {
  const nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  return localDateString(nextDate);
}

function escapeCalendarText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function calendarEvent(contact: DriftContact, now = new Date()): string {
  if (!contact.reminderOn) {
    throw new Error("Choose a reminder date before adding it to your calendar.");
  }
  const eventDate = contact.reminderOn.replace(/-/g, "");
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const uid = `${contact.id}@drift.local`;
  const summary = escapeCalendarText(`Check in with ${contact.name}`);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Drift//Check-in reminder//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${eventDate}T090000`,
    `DTEND:${eventDate}T091500`,
    `SUMMARY:${summary}`,
    "DESCRIPTION:Reminder you chose in Drift. Stored locally in this browser.",
    "BEGIN:VALARM",
    "TRIGGER:-PT5M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${summary}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
