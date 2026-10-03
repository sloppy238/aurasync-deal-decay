import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CADENCE_OPTIONS,
  DRIFT_NOTIFICATIONS_KEY,
  DRIFT_STORAGE_KEY,
  LEGACY_DRIFT_STORAGE_KEY,
  calendarEvent,
  cadenceLabel,
  contactsCsvTemplate,
  displayDate,
  dueContacts,
  isDriftContact,
  localDateString,
  parseContactsCsv,
  parseDriftData,
  reminderAfterCheckIn,
  reminderAfterSnooze,
  serializeDriftData,
  upcomingContacts,
  type CadenceDays,
  type DriftContact,
  type DriftPlan,
  type DriftTask,
} from "@/lib/drift";
import {
  Bell,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock3,
  Download,
  FileUp,
  Heart,
  ListTodo,
  NotebookPen,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type ContactDraft = {
  id: string | null;
  name: string;
  cadenceDays: CadenceDays;
  lastConnectedOn: string;
  reminderOn: string;
  repeatReminder: boolean;
  notes: string;
};

type StorageState = "loading" | "ready" | "error";

function emptyDraft(): ContactDraft {
  return {
    id: null,
    name: "",
    cadenceDays: 7,
    lastConnectedOn: localDateString(),
    reminderOn: "",
    repeatReminder: false,
    notes: "",
  };
}

function downloadFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\w-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "check-in"
  );
}

function localSaveError(error: unknown): string {
  return error instanceof Error
    ? `This browser couldn't save your Drift data: ${error.message}`
    : "This browser couldn't save your Drift data. You can still export it before leaving.";
}

function parseCadence(value: string): CadenceDays {
  const days = Number(value);
  const match = CADENCE_OPTIONS.find(option => option.days === days);
  return match?.days ?? 7;
}

function lastConnectedLabel(date: string, today: string): string {
  return date === today ? "Today" : displayDate(date);
}

export default function Drift() {
  const [contacts, setContacts] = useState<DriftContact[]>([]);
  const [storageState, setStorageState] = useState<StorageState>("loading");
  const [storageMessage, setStorageMessage] = useState("");
  const [draft, setDraft] = useState<ContactDraft>(emptyDraft);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [expandedContactId, setExpandedContactId] = useState<string | null>(
    null
  );
  const [taskDrafts, setTaskDrafts] = useState<
    Record<string, { title: string; date: string }>
  >({});
  const [planDrafts, setPlanDrafts] = useState<
    Record<string, { title: string; date: string }>
  >({});
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [filter, setFilter] = useState<"all" | "due" | "paused">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    try {
      const raw =
        window.localStorage.getItem(DRIFT_STORAGE_KEY) ??
        window.localStorage.getItem(LEGACY_DRIFT_STORAGE_KEY);
      setContacts(raw ? parseDriftData(raw) : []);
      setNotificationsEnabled(
        window.localStorage.getItem(DRIFT_NOTIFICATIONS_KEY) === "true"
      );
      setStorageState("ready");
      setStorageMessage("");
    } catch (error: unknown) {
      setStorageState("error");
      setStorageMessage(
        error instanceof SyntaxError
          ? "Your saved Drift data couldn't be read. It hasn't been overwritten."
          : error instanceof Error
            ? error.message
            : "Drift data couldn't be read from this browser."
      );
    }
  }, []);

  useEffect(() => {
    if (storageState !== "ready") return;
    try {
      window.localStorage.setItem(
        DRIFT_STORAGE_KEY,
        serializeDriftData(contacts)
      );
      window.localStorage.removeItem(LEGACY_DRIFT_STORAGE_KEY);
    } catch (error: unknown) {
      setStorageState("error");
      setStorageMessage(localSaveError(error));
    }
  }, [contacts, storageState]);

  const today = localDateString();
  const due = useMemo(() => dueContacts(contacts, today), [contacts, today]);
  const upcoming = useMemo(
    () => upcomingContacts(contacts, today).slice(0, 5),
    [contacts, today]
  );
  const activeContacts = useMemo(
    () => contacts.filter(contact => !contact.paused),
    [contacts]
  );
  const visibleContacts = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return contacts.filter(contact => {
      if (filter === "due" && !due.some(item => item.id === contact.id))
        return false;
      if (filter === "paused" && !contact.paused) return false;
      return !query || contact.name.toLocaleLowerCase().includes(query);
    });
  }, [contacts, due, filter, searchQuery]);

  useEffect(() => {
    if (
      !notificationsEnabled ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    )
      return;

    for (const contact of due) {
      const notificationKey = `drift.notified.${contact.id}.${contact.reminderOn}`;
      try {
        if (window.localStorage.getItem(notificationKey)) continue;
        new Notification("A check-in reminder", {
          body: `You planned a check-in with ${contact.name} for ${displayDate(contact.reminderOn)}.`,
          tag: notificationKey,
        });
        window.localStorage.setItem(notificationKey, "shown");
      } catch (error: unknown) {
        setNotificationMessage(
          error instanceof Error
            ? `Browser notification failed: ${error.message}`
            : "Browser notification couldn't be shown."
        );
        break;
      }
    }
  }, [due, notificationsEnabled]);

  function openNewContact() {
    setDraft(emptyDraft());
    setFormError("");
    setFormOpen(true);
    setNotice("");
  }

  function openEditContact(contact: DriftContact) {
    setDraft({
      id: contact.id,
      name: contact.name,
      cadenceDays: contact.cadenceDays,
      lastConnectedOn: contact.lastConnectedOn,
      reminderOn: contact.reminderOn ?? "",
      repeatReminder: contact.repeatReminder,
      notes: contact.notes,
    });
    setFormError("");
    setFormOpen(true);
    setNotice("");
  }

  function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      setFormError("Add a name so you can recognize this person.");
      return;
    }
    if (name.length > 80) {
      setFormError("Keep the name to 80 characters or fewer.");
      return;
    }

    if (draft.id) {
      setContacts(current =>
        current.map(contact =>
          contact.id === draft.id
            ? {
                ...contact,
                name,
                cadenceDays: draft.cadenceDays,
                lastConnectedOn: draft.lastConnectedOn,
                reminderOn: draft.reminderOn || null,
                repeatReminder: draft.repeatReminder,
                notes: draft.notes.trim(),
              }
            : contact
        )
      );
      setNotice(`${name}'s details are updated.`);
    } else {
      const contact: DriftContact = {
        id: crypto.randomUUID(),
        name,
        cadenceDays: draft.cadenceDays,
        lastConnectedOn: draft.lastConnectedOn,
        reminderOn: draft.reminderOn || null,
        repeatReminder: draft.repeatReminder,
        paused: false,
        notes: draft.notes.trim(),
        checkIns: [],
        plans: [],
        tasks: [],
      };
      setContacts(current => [contact, ...current]);
      setNotice(`${name} is on your list.`);
    }
    setFormOpen(false);
  }

  function recordCheckIn(contact: DriftContact) {
    const connectedOn = localDateString();
    setContacts(current =>
      current.map(item =>
        item.id === contact.id
          ? {
              ...item,
              lastConnectedOn: connectedOn,
              reminderOn: reminderAfterCheckIn(item),
              checkIns: [
                { id: crypto.randomUUID(), connectedOn },
                ...item.checkIns,
              ].slice(0, 50),
            }
          : item
      )
    );
    setNotice(
      contact.repeatReminder
        ? `Check-in with ${contact.name} recorded. Your next reminder is ${displayDate(reminderAfterCheckIn(contact))}.`
        : `Check-in with ${contact.name} recorded. No next reminder is set.`
    );
  }

  function snoozeReminder(contact: DriftContact) {
    setContacts(current =>
      current.map(item =>
        item.id === contact.id
          ? { ...item, reminderOn: reminderAfterSnooze(item) }
          : item
      )
    );
    setNotice(
      `${contact.name}'s reminder moved to ${displayDate(reminderAfterSnooze(contact))}.`
    );
  }

  function updateContact(
    id: string,
    update: (contact: DriftContact) => DriftContact
  ) {
    setContacts(current =>
      current.map(contact => (contact.id === id ? update(contact) : contact))
    );
  }

  function addTask(contact: DriftContact) {
    const taskDraft = taskDrafts[contact.id] ?? { title: "", date: "" };
    const title = taskDraft.title.trim();
    if (!title) return;
    if (title.length > 120) {
      setNotice("Keep task names to 120 characters or fewer.");
      return;
    }
    updateContact(contact.id, current => ({
      ...current,
      tasks: [
        ...current.tasks,
        {
          id: crypto.randomUUID(),
          title,
          dueOn: taskDraft.date || null,
          done: false,
        },
      ],
    }));
    setTaskDrafts(current => ({
      ...current,
      [contact.id]: { title: "", date: "" },
    }));
    setNotice(`Task added for ${contact.name}.`);
  }

  function addPlan(contact: DriftContact) {
    const draftPlan = planDrafts[contact.id] ?? { title: "", date: "" };
    const title = draftPlan.title.trim();
    if (!title) return;
    if (title.length > 120) {
      setNotice("Keep plan names to 120 characters or fewer.");
      return;
    }
    updateContact(contact.id, current => ({
      ...current,
      plans: [
        ...current.plans,
        {
          id: crypto.randomUUID(),
          title,
          plannedOn: draftPlan.date || null,
          done: false,
        },
      ],
    }));
    setPlanDrafts(current => ({
      ...current,
      [contact.id]: { title: "", date: "" },
    }));
    setNotice(`Plan added for ${contact.name}.`);
  }

  function togglePlan(contact: DriftContact, plan: DriftPlan) {
    updateContact(contact.id, current => ({
      ...current,
      plans: current.plans.map(item =>
        item.id === plan.id ? { ...item, done: !item.done } : item
      ),
    }));
  }

  function toggleTask(contact: DriftContact, task: DriftTask) {
    updateContact(contact.id, current => ({
      ...current,
      tasks: current.tasks.map(item =>
        item.id === task.id ? { ...item, done: !item.done } : item
      ),
    }));
  }

  function removeTask(contact: DriftContact, taskId: string) {
    updateContact(contact.id, current => ({
      ...current,
      tasks: current.tasks.filter(task => task.id !== taskId),
    }));
  }

  function removePlan(contact: DriftContact, planId: string) {
    updateContact(contact.id, current => ({
      ...current,
      plans: current.plans.filter(plan => plan.id !== planId),
    }));
  }

  async function enableNotifications() {
    if (typeof Notification === "undefined") {
      setNotificationMessage(
        "This browser doesn't support notifications. You can still download calendar reminders."
      );
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotificationMessage(
          permission === "denied"
            ? "Notifications are blocked in browser settings. Calendar reminders are still available."
            : "Notifications were not enabled. You can change this anytime."
        );
        return;
      }
      window.localStorage.setItem(DRIFT_NOTIFICATIONS_KEY, "true");
      setNotificationsEnabled(true);
      setNotificationMessage("Browser reminders are on while Drift is open.");
    } catch (error: unknown) {
      setNotificationMessage(
        error instanceof Error
          ? `Notifications couldn't be enabled: ${error.message}`
          : "Notifications couldn't be enabled."
      );
    }
  }

  function disableNotifications() {
    try {
      window.localStorage.setItem(DRIFT_NOTIFICATIONS_KEY, "false");
      setNotificationsEnabled(false);
      setNotificationMessage("Browser reminders are off.");
    } catch (error: unknown) {
      setNotificationMessage(localSaveError(error));
    }
  }

  async function importContacts(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_000_000) {
      setNotice("That file is over 1 MB. Choose a smaller CSV.");
      return;
    }
    try {
      const raw = await file.text();
      const imported = file.name.toLowerCase().endsWith(".json")
        ? parseDriftData(raw)
        : parseContactsCsv(raw);
      const existingNames = new Set(
        contacts.map(contact => contact.name.trim().toLocaleLowerCase())
      );
      const fresh = imported.flatMap((contact): DriftContact[] => {
        const normalizedName = contact.name.trim().toLocaleLowerCase();
        if (existingNames.has(normalizedName)) return [];
        existingNames.add(normalizedName);
        if (isDriftContact(contact)) {
          return [
            { ...contact, id: crypto.randomUUID(), name: contact.name.trim() },
          ];
        }
        return [
          {
            ...contact,
            id: crypto.randomUUID(),
            name: contact.name.trim(),
            checkIns: [],
            plans: [],
            tasks: [],
          },
        ];
      });
      setContacts(current => [...fresh, ...current]);
      setNotice(
        fresh.length === 0
          ? "No new people imported; matching names were already on your list."
          : `${fresh.length} ${fresh.length === 1 ? "person" : "people"} imported. The selected file was read in this browser only.`
      );
    } catch (error: unknown) {
      setNotice(
        error instanceof Error ? error.message : "CSV couldn't be imported."
      );
    }
  }

  function togglePaused(contact: DriftContact) {
    setContacts(current =>
      current.map(item =>
        item.id === contact.id ? { ...item, paused: !item.paused } : item
      )
    );
    setNotice(
      contact.paused
        ? `${contact.name} is back on your active list.`
        : `${contact.name} is paused. Their reminder won't appear until you resume them.`
    );
  }

  function removeContact(contact: DriftContact) {
    setContacts(current => current.filter(item => item.id !== contact.id));
    setConfirmRemoveId(null);
    setNotice(`${contact.name} and their local check-in history were removed.`);
  }

  function exportData() {
    downloadFile(
      "drift-check-ins.json",
      serializeDriftData(contacts),
      "application/json"
    );
    setNotice("Your Drift data was exported to this device.");
  }

  function downloadCalendar(contact: DriftContact) {
    try {
      downloadFile(
        `drift-${safeFilename(contact.name)}.ics`,
        calendarEvent(contact),
        "text/calendar;charset=utf-8"
      );
      setNotice(
        "Calendar reminder downloaded. Add it to the calendar you use."
      );
    } catch (error: unknown) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Calendar reminder couldn't be created."
      );
    }
  }

  function clearAllData() {
    try {
      window.localStorage.removeItem(DRIFT_STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_DRIFT_STORAGE_KEY);
      window.localStorage.removeItem(DRIFT_NOTIFICATIONS_KEY);
      setContacts([]);
      setStorageState("ready");
      setStorageMessage("");
      setNotificationsEnabled(false);
      setConfirmClear(false);
      setFormOpen(false);
      setNotice("All Drift data saved in this browser was deleted.");
    } catch (error: unknown) {
      setStorageState("error");
      setStorageMessage(localSaveError(error));
    }
  }

  const dueLabel =
    due.length === 0
      ? "Nothing is waiting today."
      : due.length === 1
        ? "One person is on the list you made."
        : `${due.length} people are on the list you made.`;

  return (
    <div className="mx-auto max-w-[1180px] space-y-7 pb-10">
      <header className="flex flex-col justify-between gap-5 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-cyan-800">
            <Heart className="size-4" aria-hidden="true" />
            <span>Drift</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">
            Make room for the people you care about.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
            A gentle list for check-ins you choose. No scores, no message
            access, and no reminder unless you set one.
          </p>
        </div>
        {storageState !== "loading" && (
          <Button onClick={openNewContact} className="shrink-0">
            <Plus className="size-4" aria-hidden="true" />
            Add someone
          </Button>
        )}
      </header>

      <div
        className="flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50/75 px-4 py-3 text-sm text-cyan-950"
        role="note"
      >
        <ShieldCheck
          className="mt-0.5 size-4 shrink-0 text-cyan-800"
          aria-hidden="true"
        />
        <p className="leading-5">
          Names, notes, plans, tasks, and dates are saved in this browser
          profile, not synced or encrypted. Drift doesn&apos;t read your address
          book or messages.
        </p>
      </div>

      {storageState === "ready" ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_30px_rgba(15,23,42,0.035)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="flex items-center gap-2 text-slate-700">
              <ListTodo className="size-4 text-cyan-800" aria-hidden="true" />
              {contacts.reduce(
                (total, contact) =>
                  total + contact.tasks.filter(task => !task.done).length,
                0
              )}{" "}
              open tasks
            </span>
            <span className="flex items-center gap-2 text-slate-700">
              <CalendarDays
                className="size-4 text-cyan-800"
                aria-hidden="true"
              />
              {contacts.reduce(
                (total, contact) =>
                  total + contact.plans.filter(plan => !plan.done).length,
                0
              )}{" "}
              plans
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {notificationsEnabled ? (
              <Button
                variant="outline"
                className="bg-white"
                onClick={disableNotifications}
              >
                <Bell className="size-4" aria-hidden="true" />
                Browser reminders on
              </Button>
            ) : (
              <Button
                variant="outline"
                className="bg-white"
                onClick={enableNotifications}
              >
                <Bell className="size-4" aria-hidden="true" />
                Enable browser reminders
              </Button>
            )}
            <Button
              variant="outline"
              className="bg-white"
              onClick={() =>
                downloadFile(
                  "drift-people-template.csv",
                  contactsCsvTemplate(),
                  "text/csv;charset=utf-8"
                )
              }
            >
              <Download className="size-4" aria-hidden="true" />
              CSV template
            </Button>
            <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring">
              <FileUp className="size-4" aria-hidden="true" />
              Import CSV or JSON
              <input
                className="sr-only"
                type="file"
                accept=".csv,.json,text/csv,application/json"
                aria-label="Import people from CSV or JSON"
                onChange={event => {
                  void importContacts(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          {notificationMessage ? (
            <p
              className="basis-full text-xs leading-5 text-slate-600"
              role="status"
            >
              {notificationMessage}
            </p>
          ) : null}
          <p className="basis-full text-xs leading-5 text-slate-600">
            Browser reminders are checked only while Drift is open. Use a
            calendar event if you need a reminder while it&apos;s closed.
          </p>
        </section>
      ) : null}

      {storageState === "loading" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
          Opening your local Drift list…
        </div>
      ) : null}

      {storageState === "error" ? (
        <div
          className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950"
          role="alert"
        >
          <p className="font-semibold">Your Drift list may not be saved.</p>
          <p className="mt-1 leading-5">{storageMessage}</p>
          <p className="mt-2 leading-5">
            If this is unreadable saved data, clear it only if you&apos;re
            comfortable starting over. Otherwise, export any entries currently
            visible first.
          </p>
          {contacts.length > 0 ? (
            <Button
              variant="outline"
              className="mt-3 bg-white"
              onClick={exportData}
            >
              <Download className="size-4" aria-hidden="true" />
              Export visible data
            </Button>
          ) : null}
          <div className="mt-3">
            {confirmClear ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1">Clear the local Drift save?</span>
                <Button variant="destructive" size="sm" onClick={clearAllData}>
                  Clear local save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmClear(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="bg-white"
                onClick={() => setConfirmClear(true)}
              >
                Clear unreadable local save
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {storageState === "ready" && contacts.length === 0 && !formOpen ? (
        <section className="grid gap-8 rounded-[26px] border border-slate-200 bg-white px-6 py-8 shadow-[0_12px_38px_rgba(15,23,42,.055)] md:grid-cols-[minmax(0,1fr)_260px] md:items-center md:px-9 md:py-10">
          <div>
            <p className="max-w-2xl text-2xl font-medium leading-snug tracking-[-0.035em] text-slate-950 sm:text-3xl">
              Start with one person you&apos;d like to make time for.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
              Add only what helps you remember: a name, your usual rhythm, and
              optionally a date you choose. You can change or remove it anytime.
            </p>
            <Button className="mt-6" onClick={openNewContact}>
              <Plus className="size-4" aria-hidden="true" />
              Add the first person
            </Button>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-[#eff9f8] p-5 md:block md:p-6">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-cyan-800 shadow-sm">
              <CalendarDays className="size-5" aria-hidden="true" />
            </div>
            <p className="mt-0 text-sm leading-5 text-slate-700 md:mt-4">
              No account or inbox connection needed. Add someone here or import
              a CSV you chose.
            </p>
          </div>
        </section>
      ) : null}

      {storageState === "ready" && contacts.length > 0 ? (
        <>
          <section className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,.85fr)]">
            <div className="rounded-[24px] bg-[#102c31] p-6 text-white shadow-[0_16px_42px_rgba(16,44,49,.14)] sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.03em]">
                    Check in when it feels right.
                  </h2>
                  <p className="mt-1.5 text-sm text-teal-100/80">{dueLabel}</p>
                </div>
                <span className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs text-teal-50">
                  <Clock3 className="size-3.5" aria-hidden="true" />
                  Your pace
                </span>
              </div>
              {due.length > 0 ? (
                <ul className="mt-5 divide-y divide-white/10">
                  {due.map(contact => (
                    <li
                      key={contact.id}
                      className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-lg font-medium">
                          {contact.name}
                        </p>
                        <p className="mt-1 text-sm text-white">
                          You planned a check-in for{" "}
                          {displayDate(contact.reminderOn)}.
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="bg-white text-slate-950 hover:bg-slate-100"
                          onClick={() => recordCheckIn(contact)}
                        >
                          <Check className="size-4" aria-hidden="true" />I
                          checked in
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                          onClick={() => snoozeReminder(contact)}
                        >
                          In {contact.cadenceDays} days
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-6 max-w-lg border-t border-white/15 pt-5">
                  <p className="text-sm leading-6 text-teal-50/85">
                    {activeContacts.length > 0
                      ? "When you've chosen a date, your check-ins will show up here. Nothing to catch up on until then."
                      : "Your active list is paused. Resume someone whenever you'd like."}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    onClick={openNewContact}
                  >
                    <CalendarDays className="size-4" aria-hidden="true" />
                    Plan a check-in
                  </Button>
                </div>
              )}
            </div>

            <Card className="border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg tracking-[-0.025em] text-slate-950">
                      Coming up
                    </CardTitle>
                    <p className="mt-1 text-sm text-slate-500">
                      Dates you picked. No automatic schedule.
                    </p>
                  </div>
                  <CalendarDays
                    className="size-5 text-cyan-800"
                    aria-hidden="true"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {upcoming.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {upcoming.map(contact => (
                      <li
                        key={contact.id}
                        className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {contact.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {cadenceLabel(contact.cadenceDays)}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-medium text-cyan-900">
                          {displayDate(contact.reminderOn)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-xl bg-slate-50 px-4 py-4 text-sm leading-5 text-slate-600">
                    Nothing scheduled ahead. Set a date only when it would help.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="people-heading">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2
                  id="people-heading"
                  className="text-xl font-semibold tracking-[-0.03em] text-slate-950"
                >
                  Your people
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {visibleContacts.length} of {contacts.length}{" "}
                  {contacts.length === 1 ? "person" : "people"} you chose to
                  keep here.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="sr-only" htmlFor="drift-search">
                  Search people
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
                    aria-hidden="true"
                  />
                  <input
                    id="drift-search"
                    type="search"
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                    placeholder="Find a person"
                    className="h-9 w-40 rounded-md border border-input bg-white pl-9 pr-3 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-48"
                  />
                </div>
                <label className="sr-only" htmlFor="drift-filter">
                  Filter people
                </label>
                <select
                  id="drift-filter"
                  value={filter}
                  onChange={event =>
                    setFilter(event.target.value as "all" | "due" | "paused")
                  }
                  className="h-9 rounded-md border border-input bg-white px-3 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="all">All people</option>
                  <option value="due">Due reminders</option>
                  <option value="paused">Paused</option>
                </select>
                <Button
                  variant="outline"
                  className="bg-white"
                  onClick={exportData}
                >
                  <Download className="size-4" aria-hidden="true" />
                  Export
                </Button>
              </div>
            </div>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <ul className="divide-y divide-slate-100">
                {visibleContacts.length === 0 ? (
                  <li className="p-5 text-sm text-slate-600">
                    {contacts.length === 0
                      ? "No people yet."
                      : searchQuery || filter !== "all"
                        ? "No people match this search and filter."
                        : "Your list is empty."}
                  </li>
                ) : null}
                {visibleContacts.map(contact => (
                  <li key={contact.id} className="px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold text-slate-950">
                            {contact.name}
                          </h3>
                          {contact.paused ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                              Paused
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {cadenceLabel(contact.cadenceDays)} · Last check-in{" "}
                          {lastConnectedLabel(contact.lastConnectedOn, today)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {contact.reminderOn
                            ? `Reminder you chose: ${displayDate(contact.reminderOn)}`
                            : "No reminder planned"}
                        </p>
                      </div>
                      {confirmRemoveId === contact.id ? (
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="mr-1 text-slate-600">
                            Remove {contact.name} and their local history?
                          </span>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeContact(contact)}
                          >
                            Remove
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmRemoveId(null)}
                          >
                            Keep
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 md:justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white"
                            onClick={() => recordCheckIn(contact)}
                            disabled={contact.paused}
                          >
                            <Check className="size-3.5" aria-hidden="true" />
                            Checked in
                          </Button>
                          {contact.reminderOn ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white"
                              onClick={() => downloadCalendar(contact)}
                              disabled={contact.reminderOn < today}
                            >
                              <CalendarPlus
                                className="size-3.5"
                                aria-hidden="true"
                              />
                              Calendar
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Edit ${contact.name}`}
                            onClick={() => openEditContact(contact)}
                          >
                            <Pencil className="size-3.5" aria-hidden="true" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`${contact.paused ? "Resume" : "Pause"} ${contact.name}`}
                            onClick={() => togglePaused(contact)}
                          >
                            {contact.paused ? (
                              <Play className="size-3.5" aria-hidden="true" />
                            ) : (
                              <Pause className="size-3.5" aria-hidden="true" />
                            )}
                            {contact.paused ? "Resume" : "Pause"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${contact.name}`}
                            onClick={() => setConfirmRemoveId(contact.id)}
                          >
                            <Trash2
                              className="size-4 text-slate-500"
                              aria-hidden="true"
                            />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-white"
                            onClick={() =>
                              setExpandedContactId(current =>
                                current === contact.id ? null : contact.id
                              )
                            }
                            aria-expanded={expandedContactId === contact.id}
                          >
                            <NotebookPen
                              className="size-3.5"
                              aria-hidden="true"
                            />
                            {expandedContactId === contact.id
                              ? "Close planner"
                              : "Planner"}
                          </Button>
                        </div>
                      )}
                    </div>
                    {expandedContactId === contact.id &&
                    confirmRemoveId !== contact.id ? (
                      <div className="mt-5 grid gap-5 border-t border-slate-100 pt-5 lg:grid-cols-2">
                        <div className="space-y-3">
                          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <NotebookPen
                              className="size-4 text-cyan-800"
                              aria-hidden="true"
                            />
                            Private notes
                          </h4>
                          <label
                            className="sr-only"
                            htmlFor={`notes-${contact.id}`}
                          >
                            Notes for {contact.name}
                          </label>
                          <textarea
                            id={`notes-${contact.id}`}
                            maxLength={2000}
                            value={contact.notes}
                            onChange={event =>
                              updateContact(contact.id, current => ({
                                ...current,
                                notes: event.target.value,
                              }))
                            }
                            placeholder="A detail you want to remember, or what you'd like to talk about."
                            className="min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-5 text-slate-900 outline-none focus:border-cyan-800 focus:ring-2 focus:ring-cyan-800/20"
                          />
                          <p className="text-xs text-slate-500">
                            Saved on this device as you type. Keep notes brief
                            and useful to you.
                          </p>
                        </div>
                        <div className="space-y-5">
                          <div>
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                              <ListTodo
                                className="size-4 text-cyan-800"
                                aria-hidden="true"
                              />
                              Small next steps
                            </h4>
                            <form
                              className="mt-2 flex gap-2"
                              onSubmit={event => {
                                event.preventDefault();
                                addTask(contact);
                              }}
                            >
                              <label
                                className="sr-only"
                                htmlFor={`task-${contact.id}`}
                              >
                                Add a task for {contact.name}
                              </label>
                              <input
                                id={`task-${contact.id}`}
                                maxLength={120}
                                value={taskDrafts[contact.id]?.title ?? ""}
                                onChange={event =>
                                  setTaskDrafts(current => ({
                                    ...current,
                                    [contact.id]: {
                                      title: event.target.value,
                                      date: current[contact.id]?.date ?? "",
                                    },
                                  }))
                                }
                                placeholder="e.g. Find a date for lunch"
                                className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-800 focus:ring-2 focus:ring-cyan-800/20"
                              />
                              <label
                                className="sr-only"
                                htmlFor={`task-date-${contact.id}`}
                              >
                                Optional due date for task with {contact.name}
                              </label>
                              <input
                                id={`task-date-${contact.id}`}
                                type="date"
                                min={today}
                                value={taskDrafts[contact.id]?.date ?? ""}
                                onChange={event =>
                                  setTaskDrafts(current => ({
                                    ...current,
                                    [contact.id]: {
                                      title: current[contact.id]?.title ?? "",
                                      date: event.target.value,
                                    },
                                  }))
                                }
                                className="h-10 w-36 rounded-lg border border-slate-300 px-2 text-sm outline-none focus:border-cyan-800 focus:ring-2 focus:ring-cyan-800/20"
                              />
                              <Button
                                type="submit"
                                size="sm"
                                variant="outline"
                                className="bg-white"
                              >
                                <Plus className="size-4" aria-hidden="true" />{" "}
                                Add
                              </Button>
                            </form>
                            {contact.tasks.length > 0 ? (
                              <ul className="mt-2 space-y-1">
                                {contact.tasks.map(task => (
                                  <li
                                    key={task.id}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={task.done}
                                      onChange={() => toggleTask(contact, task)}
                                      aria-label={`${task.done ? "Reopen" : "Complete"} task: ${task.title}`}
                                    />
                                    <span
                                      className={`min-w-0 flex-1 ${task.done ? "text-slate-500 line-through" : "text-slate-800"}`}
                                    >
                                      {task.title}
                                      {task.dueOn
                                        ? ` · ${displayDate(task.dueOn)}`
                                        : ""}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      aria-label={`Remove task: ${task.title}`}
                                      onClick={() =>
                                        removeTask(contact, task.id)
                                      }
                                    >
                                      <X
                                        className="size-3.5"
                                        aria-hidden="true"
                                      />
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                          <div>
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                              <Heart
                                className="size-4 text-cyan-800"
                                aria-hidden="true"
                              />
                              Things to do together
                            </h4>
                            <form
                              className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]"
                              onSubmit={event => {
                                event.preventDefault();
                                addPlan(contact);
                              }}
                            >
                              <label
                                className="sr-only"
                                htmlFor={`plan-${contact.id}`}
                              >
                                Add a shared plan with {contact.name}
                              </label>
                              <input
                                id={`plan-${contact.id}`}
                                maxLength={120}
                                value={planDrafts[contact.id]?.title ?? ""}
                                onChange={event =>
                                  setPlanDrafts(current => ({
                                    ...current,
                                    [contact.id]: {
                                      title: event.target.value,
                                      date: current[contact.id]?.date ?? "",
                                    },
                                  }))
                                }
                                placeholder="e.g. Visit the weekend market"
                                className="h-10 min-w-0 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-cyan-800 focus:ring-2 focus:ring-cyan-800/20"
                              />
                              <label
                                className="sr-only"
                                htmlFor={`plan-date-${contact.id}`}
                              >
                                Optional date for plan with {contact.name}
                              </label>
                              <input
                                id={`plan-date-${contact.id}`}
                                type="date"
                                min={today}
                                value={planDrafts[contact.id]?.date ?? ""}
                                onChange={event =>
                                  setPlanDrafts(current => ({
                                    ...current,
                                    [contact.id]: {
                                      title: current[contact.id]?.title ?? "",
                                      date: event.target.value,
                                    },
                                  }))
                                }
                                className="h-10 min-w-0 rounded-lg border border-slate-300 px-2 text-sm outline-none focus:border-cyan-800 focus:ring-2 focus:ring-cyan-800/20"
                              />
                              <Button
                                type="submit"
                                size="sm"
                                variant="outline"
                                className="bg-white"
                              >
                                <Plus className="size-4" aria-hidden="true" />{" "}
                                Add plan
                              </Button>
                            </form>
                            {contact.plans.length > 0 ? (
                              <ul className="mt-2 space-y-1">
                                {contact.plans.map(plan => (
                                  <li
                                    key={plan.id}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={plan.done}
                                      onChange={() => togglePlan(contact, plan)}
                                      aria-label={`${plan.done ? "Reopen" : "Complete"} plan: ${plan.title}`}
                                    />
                                    <span
                                      className={`min-w-0 flex-1 ${plan.done ? "text-slate-500 line-through" : "text-slate-800"}`}
                                    >
                                      {plan.title}
                                      {plan.plannedOn
                                        ? ` · ${displayDate(plan.plannedOn)}`
                                        : ""}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      aria-label={`Remove plan: ${plan.title}`}
                                      onClick={() =>
                                        removePlan(contact, plan.id)
                                      }
                                    >
                                      <X
                                        className="size-3.5"
                                        aria-hidden="true"
                                      />
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        </>
      ) : null}

      {formOpen ? (
        <section
          aria-labelledby="contact-form-heading"
          className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_38px_rgba(15,23,42,.07)] sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="contact-form-heading"
                className="text-xl font-semibold tracking-[-0.03em] text-slate-950"
              >
                {draft.id
                  ? "Edit your check-in plan"
                  : "Add someone to your list"}
              </h2>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                Only add details that help you. A reminder date is optional.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close form"
              onClick={() => {
                setFormOpen(false);
                setFormError("");
              }}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <form className="mt-6 space-y-5" onSubmit={submitContact}>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-800">
                <span>Name</span>
                <input
                  autoFocus
                  required
                  maxLength={80}
                  value={draft.name}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="A name you'll recognize"
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-800 focus:ring-2 focus:ring-cyan-800/20"
                />
              </label>
              <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-800 md:col-span-2">
                <input
                  type="checkbox"
                  checked={draft.repeatReminder}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      repeatReminder: event.target.checked,
                    }))
                  }
                  className="mt-0.5 size-4 rounded border-slate-300 accent-cyan-800"
                />
                <span>
                  <span className="block font-medium">
                    Suggest this reminder again after I check in
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-600">
                    Uses the rhythm you selected. You can change or turn this
                    off anytime.
                  </span>
                </span>
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-800 md:col-span-2">
                <span>
                  Note to yourself{" "}
                  <span className="font-normal text-slate-500">
                    (optional, stays on this device)
                  </span>
                </span>
                <textarea
                  maxLength={2000}
                  value={draft.notes}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="A small detail or idea for what you'd like to do together."
                  className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-5 text-slate-950 outline-none transition focus:border-cyan-800 focus:ring-2 focus:ring-cyan-800/20"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-800">
                <span>How often would you like to check in?</span>
                <select
                  value={draft.cadenceDays}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      cadenceDays: parseCadence(event.target.value),
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-800 focus:ring-2 focus:ring-cyan-800/20"
                >
                  {CADENCE_OPTIONS.map(option => (
                    <option key={option.days} value={option.days}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-800">
                <span>When did you last connect?</span>
                <input
                  required
                  type="date"
                  value={draft.lastConnectedOn}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      lastConnectedOn: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-800 focus:ring-2 focus:ring-cyan-800/20"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-800">
                <span>
                  Remind me on{" "}
                  <span className="font-normal text-slate-500">(optional)</span>
                </span>
                <input
                  type="date"
                  min={today}
                  value={draft.reminderOn}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      reminderOn: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-cyan-800 focus:ring-2 focus:ring-cyan-800/20"
                />
              </label>
            </div>
            {formError ? (
              <p className="text-sm font-medium text-rose-700" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <Button type="submit">
                <Check className="size-4" aria-hidden="true" />
                {draft.id ? "Save changes" : "Add to my list"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="bg-white"
                onClick={() => {
                  setFormOpen(false);
                  setFormError("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {storageState === "ready" && contacts.length > 0 ? (
        <section className="flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Your data stays yours.
            </p>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">
              Saved only on this device and browser. Export a copy or remove the
              local list whenever you like. Calendar files are created only when
              you request one.
            </p>
          </div>
          {confirmClear ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-600">
                Delete all local Drift data?
              </span>
              <Button variant="destructive" size="sm" onClick={clearAllData}>
                Delete all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmClear(false)}
              >
                Keep it
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="shrink-0 bg-white text-slate-700"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete local data
            </Button>
          )}
        </section>
      ) : null}

      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm text-white shadow-[0_12px_32px_rgba(15,23,42,.22)]"
        >
          <Check
            className="size-4 shrink-0 text-emerald-300"
            aria-hidden="true"
          />
          <span>{notice}</span>
          <button
            className="ml-2 rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Dismiss message"
            onClick={() => setNotice("")}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
