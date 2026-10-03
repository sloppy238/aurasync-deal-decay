export const DRIFT_STORAGE_KEY = "drift.relationships.v2";
export const LEGACY_DRIFT_STORAGE_KEY = "drift.relationships.v1";
export const DRIFT_NOTIFICATIONS_KEY = "drift.notifications-enabled.v1";

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

export type DriftPlan = {
  id: string;
  title: string;
  plannedOn: string | null;
  done: boolean;
};

export type DriftTask = {
  id: string;
  title: string;
  dueOn: string | null;
  done: boolean;
};

export type DriftContact = {
  id: string;
  name: string;
  cadenceDays: CadenceDays;
  lastConnectedOn: string;
  reminderOn: string | null;
  repeatReminder: boolean;
  paused: boolean;
  notes: string;
  checkIns: DriftCheckIn[];
  plans: DriftPlan[];
  tasks: DriftTask[];
};

type StoredDriftData = {
  version: 2;
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

function isPlan(value: unknown): value is DriftPlan {
  if (typeof value !== "object" || value === null) return false;
  const plan = value as Record<string, unknown>;
  return (
    typeof plan.id === "string" &&
    typeof plan.title === "string" &&
    plan.title.trim().length > 0 &&
    plan.title.length <= 120 &&
    (plan.plannedOn === null || isDateOnly(plan.plannedOn)) &&
    typeof plan.done === "boolean"
  );
}

function isTask(value: unknown): value is DriftTask {
  if (typeof value !== "object" || value === null) return false;
  const task = value as Record<string, unknown>;
  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    task.title.trim().length > 0 &&
    task.title.length <= 120 &&
    (task.dueOn === null || isDateOnly(task.dueOn)) &&
    typeof task.done === "boolean"
  );
}

export function isDriftContact(value: unknown): value is DriftContact {
  if (typeof value !== "object" || value === null) return false;
  const contact = value as Record<string, unknown>;
  return (
    typeof contact.id === "string" &&
    typeof contact.name === "string" &&
    contact.name.trim().length > 0 &&
    contact.name.length <= 80 &&
    isCadenceDays(contact.cadenceDays) &&
    isDateOnly(contact.lastConnectedOn) &&
    (contact.reminderOn === null || isDateOnly(contact.reminderOn)) &&
    typeof contact.repeatReminder === "boolean" &&
    typeof contact.paused === "boolean" &&
    typeof contact.notes === "string" &&
    contact.notes.length <= 2000 &&
    Array.isArray(contact.checkIns) &&
    contact.checkIns.every(isCheckIn) &&
    Array.isArray(contact.plans) &&
    contact.plans.every(isPlan) &&
    Array.isArray(contact.tasks) &&
    contact.tasks.every(isTask)
  );
}

export function parseDriftData(raw: string): DriftContact[] {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Saved Drift data is not in a supported format.");
  }
  const data = parsed as Record<string, unknown>;
  if (!Array.isArray(data.contacts)) {
    throw new Error(
      "Saved Drift data is incomplete or from an unsupported version."
    );
  }
  if (data.version === 1) {
    if (!data.contacts.every(isVersionOneContact)) {
      throw new Error(
        "Saved Drift data is incomplete or from an unsupported version."
      );
    }
    return data.contacts.map(contact => ({
      ...contact,
      repeatReminder: false,
      notes: "",
      plans: [],
      tasks: [],
    }));
  }
  if (data.version !== 2 || !data.contacts.every(isDriftContact)) {
    throw new Error(
      "Saved Drift data is incomplete or from an unsupported version."
    );
  }
  return data.contacts;
}

function isVersionOneContact(
  value: unknown
): value is Omit<DriftContact, "repeatReminder" | "notes" | "plans" | "tasks"> {
  if (typeof value !== "object" || value === null) return false;
  const contact = value as Record<string, unknown>;
  return (
    typeof contact.id === "string" &&
    typeof contact.name === "string" &&
    contact.name.trim().length > 0 &&
    contact.name.length <= 80 &&
    isCadenceDays(contact.cadenceDays) &&
    isDateOnly(contact.lastConnectedOn) &&
    (contact.reminderOn === null || isDateOnly(contact.reminderOn)) &&
    typeof contact.paused === "boolean" &&
    Array.isArray(contact.checkIns) &&
    contact.checkIns.every(isCheckIn)
  );
}

export function serializeDriftData(contacts: DriftContact[]): string {
  const data: StoredDriftData = { version: 2, contacts };
  return JSON.stringify(data);
}

export function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function cadenceLabel(days: CadenceDays): string {
  return (
    CADENCE_OPTIONS.find(option => option.days === days)?.label ?? "Custom"
  );
}

export function dueContacts(
  contacts: DriftContact[],
  today = localDateString()
): DriftContact[] {
  return contacts
    .filter(
      contact =>
        !contact.paused &&
        contact.reminderOn !== null &&
        contact.reminderOn <= today
    )
    .sort((a, b) => (a.reminderOn ?? "").localeCompare(b.reminderOn ?? ""));
}

export function upcomingContacts(
  contacts: DriftContact[],
  today = localDateString()
): DriftContact[] {
  return contacts
    .filter(
      contact =>
        !contact.paused &&
        contact.reminderOn !== null &&
        contact.reminderOn > today
    )
    .sort((a, b) => (a.reminderOn ?? "").localeCompare(b.reminderOn ?? ""));
}

export function displayDate(value: string | null): string {
  if (!value) return "No reminder planned";
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}

export function daysFromToday(days: number, date = new Date()): string {
  const nextDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days
  );
  return localDateString(nextDate);
}

export function reminderAfterCheckIn(
  contact: DriftContact,
  date = new Date()
): string | null {
  return contact.repeatReminder
    ? daysFromToday(contact.cadenceDays, date)
    : null;
}

export function reminderAfterSnooze(
  contact: DriftContact,
  date = new Date()
): string {
  return daysFromToday(contact.cadenceDays, date);
}

export function parseContactsCsv(
  raw: string
): Omit<DriftContact, "id" | "checkIns" | "plans" | "tasks">[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];
    if (quoted && character === '"' && raw[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && raw[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some(cell => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error("CSV has an unfinished quoted field.");
  if (field || row.length) {
    row.push(field);
    if (row.some(cell => cell.trim() !== "")) rows.push(row);
  }
  if (rows.length < 2)
    throw new Error("CSV needs a header and at least one person.");

  const headers = rows[0].map(header => header.trim().toLowerCase());
  const nameIndex = headers.indexOf("name");
  const cadenceIndex = headers.indexOf("cadence_days");
  const lastConnectedIndex = headers.indexOf("last_connected_on");
  const reminderIndex = headers.indexOf("reminder_on");
  const notesIndex = headers.indexOf("notes");
  if (nameIndex < 0) throw new Error("CSV must include a name column.");

  return rows.slice(1).map((cells, rowIndex) => {
    const name = (cells[nameIndex] ?? "").trim();
    if (!name || name.length > 80) {
      throw new Error(
        `Row ${rowIndex + 2}: name is required and must be 80 characters or fewer.`
      );
    }
    const cadenceValue = Number(cells[cadenceIndex] || 7);
    if (!isCadenceDays(cadenceValue)) {
      throw new Error(
        `Row ${rowIndex + 2}: cadence_days must be 3, 7, 14, or 30.`
      );
    }
    const lastConnectedOn =
      cells[lastConnectedIndex]?.trim() || localDateString();
    const reminderOn = cells[reminderIndex]?.trim() || null;
    if (
      !isDateOnly(lastConnectedOn) ||
      (reminderOn !== null && !isDateOnly(reminderOn))
    ) {
      throw new Error(`Row ${rowIndex + 2}: dates must use YYYY-MM-DD.`);
    }
    const notes = cells[notesIndex]?.trim() || "";
    if (notes.length > 2000) {
      throw new Error(
        `Row ${rowIndex + 2}: notes must be 2000 characters or fewer.`
      );
    }
    return {
      name,
      cadenceDays: cadenceValue,
      lastConnectedOn,
      reminderOn,
      repeatReminder: false,
      paused: false,
      notes,
    };
  });
}

export function contactsCsvTemplate(): string {
  return "name,cadence_days,last_connected_on,reminder_on,notes\r\n";
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
    throw new Error(
      "Choose a reminder date before adding it to your calendar."
    );
  }
  const eventDate = contact.reminderOn.replace(/-/g, "");
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
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
