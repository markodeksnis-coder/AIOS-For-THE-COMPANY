// Core domain logic for the 180-day service delivery programme — the
// Delivery section (Today / Clients / Journey / Assign system). Every
// milestone date is computed from a client's startDate at call time; no
// milestone date is ever stored, so moving startDate moves the whole
// programme. Ported 1:1 from the "Service Delivery" Claude Design mock —
// see the design's own SPINE/WEEKLY/SYSTEMS constants — with the mock's
// hand-rolled string-style objects replaced by plain data the components
// render with Tailwind classes instead.

const DAY_MS = 86_400_000;

/** Programme defaults — 120 calls delivered across a 180-day engagement,
 *  a gate is only "blocked" inside a 24h lead window. Every function below
 *  takes these as parameters (never hardcodes them) so a future per-client
 *  override doesn't mean rewriting the model. */
export const PROGRAM_DAYS = 180;
export const CALL_TARGET = 120;
export const GATE_LEAD_HOURS = 24;

export type SystemName = "Divine Supercharge" | "Cold Email" | "Cold DMs";
export type Platform = "Instagram" | "LinkedIn";
export type MilestoneKind = "checkpoint" | "call" | "marker";
export type DoneState = "all" | "partial";

export const SYSTEMS: Record<SystemName, { budget: string; warmupDays: number | null; best: string }> = {
  "Divine Supercharge": { budget: "$400-1000/mo", warmupDays: null, best: "Maximum automation, high budget" },
  "Cold Email": { budget: "$300-400/mo", warmupDays: 14, best: "Manual follow-up, moderate budget" },
  "Cold DMs": { budget: "Minimal", warmupDays: 4, best: "Low or no tool budget" },
};

/** Launch day depends on warm-up, and this is the fork people get wrong:
 *  Instagram is live at Day 7, email and LinkedIn not until Day 17. */
export function launchDay(system: SystemName, platform: Platform | null): number | null {
  if (system === "Cold DMs") return platform === "Instagram" ? 7 : 17;
  if (system === "Cold Email") return 17;
  return null; // Divine Supercharge gates on AP2 registration, which has no fixed SLA
}

export interface MilestoneDef {
  day: number;
  title: string;
  kind: MilestoneKind;
  duration: string | null;
  blurb: string;
  checklist?: string[];
  gate?: { label: string; items: string[] } | null;
  agenda?: [string, string][] | null;
  deliverables?: string[];
  homework?: string[];
}

// Phase 1 is the milestone spine; Phase 2 is the weekly optimisation cadence
// generated from day 28 on. Phases 3 and 4 exist as markers only — their
// SOPs aren't written yet, so inventing their content here would be fiction.
export const SPINE: MilestoneDef[] = [
  {
    day: 0, title: "Payment → Welcome", kind: "checkpoint", duration: null,
    blurb: "Everything fires the moment payment hits. Not end of day — immediately.",
    checklist: ["Payment confirmed", "Contract signed (DocuSign)", "Welcome email sent immediately", "Onboarding funnel link sent in same email", "Added to Slack support channel", "Onboarding form link sent", "New client gift ordered ($50-100)", "Onboarding call scheduled"],
    gate: null, deliverables: [],
  },
  {
    day: 1, title: "Onboarding Call", kind: "call", duration: "35-45 min",
    blurb: "Expectations set for the second of three times. You walk the 30-day roadmap, assign the system, and book the Foundation Call live on the call.",
    gate: { label: "Onboarding form completed", items: ["Onboarding form submitted (all 6 sections)"] },
    agenda: [["Opening", "2-3 min"], ["Expectation setting", "5-10 min"], ["Roadmap walkthrough", "5 min"], ["Form review", "5-10 min"], ["System assignment", "5 min"], ["Homework assignment", "3-5 min"], ["Support channel confirmation", "2 min"], ["Book 30-day check-in", "2 min"], ["Close", "2 min"]],
    deliverables: ["Review submitted onboarding form", "Decide system assignment (3-question SOP)"],
    homework: ["Watch foundation modules (3 videos)", "Fill out the offer sheet", "Watch system-specific modules", "Answer in Slack: how does your system work and what is your daily workflow?"],
  },
  {
    day: 3, title: "Foundation Call", kind: "call", duration: "35-40 min",
    blurb: "Offer presented and finalised live. System confirmed with rationale. Warm-up starts today — Day 3, not Day 7.",
    gate: { label: "Day 1 homework submitted", items: ["Foundation modules watched", "Offer sheet submitted", "System explanation posted in Slack"] },
    agenda: [["Opening", "2 min"], ["Offer presentation", "10-15 min"], ["System confirmation", "5 min"], ["Infrastructure overview", "10 min"], ["Homework assignment", "5 min"], ["Book Day 7 call", "2 min"], ["Close", "2 min"]],
    deliverables: ["Build client offer from offer sheet", "Write system recommendation rationale", "Prepare infrastructure homework", "Have scripts ready to assign"],
    homework: ["Watch infrastructure videos", "Configure accounts per video guides", "Start warm-up immediately", "Submit infrastructure checklist in Slack"],
  },
  {
    day: 7, title: "Infrastructure Review Call", kind: "call", duration: "30-45 min",
    blurb: "Accounts, warm-up and domains verified, then every script walked through — read out loud by the client on the call.",
    gate: { label: "Infrastructure checklist submitted", items: ["Accounts created & configured", "Warm-up running", "System-specific setup done (AP2 / domains / GHL)", "Checklist posted in Slack"] },
    agenda: [["Opening", "2 min"], ["Infrastructure review", "10-15 min"], ["Scripts walkthrough", "15-20 min"], ["Book next call", "2 min"], ["Close", "2 min"]],
    deliverables: ["Write all scripts for assigned system", "Review submitted infrastructure checklist", "Prepare call agenda"],
    homework: ["Read all scripts until they feel natural", "Set up and test Calendly link", "Build and test follow-up sequences", "Load scripts into the system and test end to end"],
  },
  {
    day: 14, title: "Outreach Launch Call", kind: "call", duration: "30-45 min",
    blurb: "A green light, not a fixing session. Metrics explained, system double-checked, then 4-6 roleplays.",
    gate: { label: "Everything loaded and tested", items: ["Scripts loaded into system", "Follow-up sequences tested", "Calendly tested", "Full flow tested end to end"] },
    agenda: [["Opening", "2 min"], ["Metrics explanation", "5-10 min"], ["System double-check", "5-10 min"], ["Role plays", "15 min"], ["Daily workflow & instructions", "3-5 min"], ["Book Day 21 call", "2 min"], ["Close", "2 min"]],
    deliverables: ["Prepare 4-6 roleplay scenarios", "Confirm warm-up complete for the channel"],
    homework: ["Block 3-6 hours daily for outreach", "Never book appointments more than 4 days out", "Follow up every lead until they book or opt out"],
  },
  {
    day: 21, title: "First Optimization Call", kind: "call", duration: "30-45 min",
    blurb: "You review the metric sheet before the call — the client submits nothing. Pulse check, then the four-part reporting framework.",
    gate: null,
    agenda: [["Opening pulse check", "3-5 min"], ["Metrics review", "10 min"], ["Conversations & calls review", "10-15 min"], ["Optimize & improve", "5-10 min"], ["Next actions", "2-3 min"], ["Close", "2 min"]],
    deliverables: ["Review metric sheet", "Read their conversations and booked calls", "Prepare the four-part report"],
    homework: [],
  },
];

export const WEEKLY: MilestoneDef = {
  day: 0, title: "Weekly Optimization Call", kind: "call", duration: "30 min",
  blurb: "Same structure every week, no exceptions. Diagnose against the rule: low volume is addressed directly, low reply rate means fix the script on the call, low book rate means fix the conversation flow.",
  gate: null,
  agenda: [["Opening pulse check", "2-3 min"], ["Metrics review", "8-10 min"], ["Conversations & calls review", "8-10 min"], ["Optimize & improve", "5-8 min"], ["Closing & next actions", "2-3 min"]],
  deliverables: ["Review metric sheet", "Prepare weekly Slack report"],
  homework: [],
};

export const NON_NEGOTIABLES: string[] = [
  "Complete all homework before calls — no submission means the call is rescheduled",
  "Call every lead within 15 minutes of generation",
  "Minimum contact points per lead in the first 7 days",
  "Never schedule appointments more than 4 days out",
  "Block 3-6 hours per day exclusively for outreach",
  "Reach out immediately if targets are not being hit",
  "Go all in — no passive participation",
];

export interface DeliveryClientData {
  id: string;
  name: string;
  business: string;
  startDate: string; // ISO date, Day 0
  system: SystemName | null;
  platform: Platform | null;
  delivered: number;
  done: Record<number, DoneState>;
  homeworkDone: Record<number, DoneState>;
  ticks: Record<string, boolean>; // "<day>:<index>" -> override
}

export interface ComputedMilestone extends MilestoneDef {
  date: string;
  status: "done" | "current" | "upcoming";
  gateMet: boolean;
  blocked: boolean;
  partial: boolean;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  return new Date(Date.parse(iso + "T00:00:00Z") + n * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / DAY_MS);
}

export function prettyDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export function relativeDate(iso: string, today: string): string {
  const n = daysBetween(today, iso);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  return n > 0 ? `In ${n} days` : `${n * -1} days ago`;
}

export function tickKey(day: number, index: number): string {
  return `${day}:${index}`;
}

export function isTicked(client: DeliveryClientData, day: number, index: number, fallback: boolean): boolean {
  const k = tickKey(day, index);
  return k in client.ticks ? client.ticks[k] : fallback;
}

/** The client's full milestone list, with every date computed from Day 0. */
export function milestonesFor(client: DeliveryClientData, today: string, gateLeadHours = GATE_LEAD_HOURS): ComputedMilestone[] {
  const dayNow = daysBetween(client.startDate, today);
  const list: MilestoneDef[] = SPINE.map((m) => ({ ...m }));

  // Phase 2: weekly optimisation from day 28 to the end of week 8.
  for (let d = 28; d <= 56; d += 7) {
    list.push({ ...WEEKLY, day: d, title: `${WEEKLY.title} · wk ${Math.round(d / 7)}` });
  }
  list.push({ day: 57, title: "Phase 3 — First Hire begins", kind: "marker", duration: null, blurb: "Hire and train 1-2 setters, founder steps back. SOP not written yet.", gate: null, deliverables: [], agenda: null });
  list.push({ day: 113, title: "Phase 4 — Scale begins", kind: "marker", duration: null, blurb: "More setters, setter manager, autonomous team. SOP not written yet.", gate: null, deliverables: [], agenda: null });

  return list
    .map((m): ComputedMilestone => {
      const date = addDays(client.startDate, m.day);
      const doneState = client.done[m.day];
      let status: ComputedMilestone["status"];
      if (doneState === "all") status = "done";
      else if (m.day > dayNow) status = "upcoming";
      else status = "current";

      // The gate is checked against the PREVIOUS milestone's homework: a call
      // is blocked when the homework assigned last time isn't in.
      const prev = [...list].filter((p) => p.day < m.day && p.homework && p.homework.length).pop();
      const prevState = prev ? client.homeworkDone[prev.day] : null;
      const gateMet = !m.gate ? true : prevState === "all";
      const hoursOut = (Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 3_600_000;
      const blocked = !!m.gate && !gateMet && status !== "done" && hoursOut <= gateLeadHours;

      return { ...m, date, status, gateMet, blocked, partial: client.homeworkDone[m.day] === "partial" };
    })
    .sort((a, b) => a.day - b.day);
}

export function nextMilestone(client: DeliveryClientData, today: string): ComputedMilestone | null {
  const dayNow = daysBetween(client.startDate, today);
  return milestonesFor(client, today).filter((m) => m.status !== "done" && m.kind !== "marker" && m.day >= dayNow)[0] ?? null;
}

export function phaseOf(day: number): { label: string; colorVar: string } {
  if (day <= 14) return { label: "Phase 1 · Foundation", colorVar: "var(--accent-strong)" };
  if (day <= 56) return { label: "Phase 2 · Proof of Concept", colorVar: "var(--graph-people)" };
  if (day <= 112) return { label: "Phase 3 · First Hire", colorVar: "var(--warn)" };
  return { label: "Phase 4 · Scale", colorVar: "var(--graph-work)" };
}

/** On-pace is measured against the committed call count scaled by elapsed
 *  time — the only honest read when the cadence is front-loaded in Phase 1
 *  and weekly thereafter. */
export function pace(client: DeliveryClientData, today: string, programDays: number = PROGRAM_DAYS, callTarget: number = CALL_TARGET): { expected: number; delta: number } {
  const dayNow = Math.max(1, daysBetween(client.startDate, today));
  const expected = Math.round((dayNow / programDays) * callTarget);
  return { expected, delta: client.delivered - expected };
}

export interface BlockedItem {
  clientId: string;
  clientName: string;
  day: number;
  clientDay: number;
  system: SystemName;
  headline: string;
  missing: string[];
  action: string;
  callLabel: string;
  countdown: string;
}

export function blockedList(clients: DeliveryClientData[], today: string): BlockedItem[] {
  const out: BlockedItem[] = [];
  for (const c of clients) {
    if (!c.system) continue;
    for (const m of milestonesFor(c, today)) {
      if (!m.blocked) continue;
      const prev = SPINE.filter((p) => p.day < m.day && p.homework && p.homework.length).pop();
      const missing = prev ? (prev.homework ?? []).slice(0, 3) : ["Homework not submitted"];
      out.push({
        clientId: c.id, clientName: c.name, day: m.day, clientDay: daysBetween(c.startDate, today), system: c.system,
        headline: `${m.title} is gated on Day ${prev ? prev.day : 0} homework that has not landed.`,
        missing,
        action: "Chase in Slack now. One hour window, then reschedule — the SOP has no exception for this.",
        callLabel: m.title, countdown: relativeDate(m.date, today),
      });
    }
  }
  return out;
}

export interface UpcomingItem {
  clientId: string;
  when: string;
  date: string;
  call: string;
  clientName: string;
  clientDay: number;
  duration: string | null;
  gate: "Not met" | "Met" | "Pending" | "None";
  gateTone: "crit" | "good" | "warn" | "faint";
  prep: string;
  prepTone: "faint" | "good" | "warn";
  day: number;
  sort: number;
}

export function upcomingList(clients: DeliveryClientData[], today: string): UpcomingItem[] {
  const out: UpcomingItem[] = [];
  for (const c of clients) {
    if (!c.system) continue;
    for (const m of milestonesFor(c, today)) {
      const inDays = daysBetween(today, m.date);
      if (m.kind !== "call" || inDays < 0 || inDays > 7 || m.status === "done") continue;
      const deliverables = m.deliverables ?? [];
      const prepDone = deliverables.filter((_, i) => isTicked(c, m.day, 100 + i, false)).length;
      out.push({
        clientId: c.id, sort: inDays, when: relativeDate(m.date, today), date: prettyDate(m.date), call: m.title,
        clientName: c.name, clientDay: daysBetween(c.startDate, today), duration: m.duration, day: m.day,
        gate: m.gate ? (m.blocked ? "Not met" : m.gateMet ? "Met" : "Pending") : "None",
        gateTone: m.gate ? (m.blocked ? "crit" : m.gateMet ? "good" : "warn") : "faint",
        prep: deliverables.length === 0 ? "Nothing" : `${prepDone} of ${deliverables.length} done`,
        prepTone: deliverables.length === 0 ? "faint" : prepDone === deliverables.length ? "good" : "warn",
      });
    }
  }
  return out.sort((a, b) => a.sort - b.sort);
}

export interface PrepItem {
  clientId: string;
  clientName: string;
  day: number;
  index: number;
  label: string;
  ticked: boolean;
  due: string;
  sort: number;
}

export function prepQueueList(clients: DeliveryClientData[], today: string): PrepItem[] {
  const out: PrepItem[] = [];
  for (const c of clients) {
    if (!c.system) continue;
    const next = nextMilestone(c, today);
    if (!next || !next.deliverables?.length) continue;
    next.deliverables.forEach((d, i) => {
      const ticked = isTicked(c, next.day, 100 + i, false);
      const due = daysBetween(today, next.date);
      out.push({
        clientId: c.id, clientName: c.name, day: next.day, index: 100 + i, label: d, ticked,
        due: due <= 0 ? "due now" : `in ${due}d`, sort: due,
      });
    });
  }
  return out.sort((a, b) => a.sort - b.sort);
}

export interface WizardAnswers {
  budget: "yes" | "no" | null;
  automation: "max" | "manual" | null;
  platform: "b2c" | "b2b" | "unclear" | null;
}

export interface AssignVerdict {
  system: SystemName;
  platform: Platform | null;
  why: string;
  facts: { label: string; value: string }[];
}

/** The three-question assignment SOP's verdict — ported from the mock's
 *  assignVals(). Each answer can end it early; that ordering is the point:
 *  budget gates everything, then automation, then platform (which only
 *  matters once budget and automation have already ruled the tool-heavy
 *  systems out). */
export function computeAssignVerdict(w: WizardAnswers): AssignVerdict | null {
  if (w.budget === "no") {
    return {
      system: "Cold DMs",
      platform: null,
      why: "Budget is under $400/month, so the tool-heavy systems are off the table before platform even matters. Cold DMs need almost nothing beyond the accounts themselves.",
      facts: [
        { label: "Budget required", value: SYSTEMS["Cold DMs"].budget },
        { label: "Launch day", value: "Depends on platform" },
        { label: "Warm-up starts", value: "Day 3" },
      ],
    };
  }
  if (w.budget === "yes" && w.automation === "max") {
    return {
      system: "Divine Supercharge",
      platform: null,
      why: "Budget clears $400/month and they want maximum automation — cold email, SMS and calling together. Note that launch is gated on AP2 registration, which has no fixed SLA, so do not promise a Day 14 launch.",
      facts: [
        { label: "Budget required", value: SYSTEMS["Divine Supercharge"].budget },
        { label: "Launch day", value: "AP2 gated" },
        { label: "Warm-up starts", value: "Day 3" },
      ],
    };
  }
  if (w.budget === "yes" && w.automation === "manual" && w.platform && w.platform !== "unclear") {
    const platform: Platform = w.platform === "b2c" ? "Instagram" : "LinkedIn";
    return {
      system: "Cold DMs",
      platform,
      why: `Manual is fine for them and their ideal client is on ${w.platform === "b2c" ? "Instagram and Facebook" : "LinkedIn"}. ${
        w.platform === "b2c"
          ? "Instagram warm-up finishes at Day 7, so this client launches a full ten days earlier than an email build."
          : "LinkedIn warm-up runs to Day 17 — set that expectation on the Foundation Call, not at launch."
      }`,
      facts: [
        { label: "Budget required", value: SYSTEMS["Cold DMs"].budget },
        { label: "Launch day", value: w.platform === "b2b" ? "Day 17" : "Day 7" },
        { label: "Warm-up starts", value: "Day 3" },
      ],
    };
  }
  return null;
}

export interface DetailCheckItem {
  label: string;
  ticked: boolean;
  day: number;
  index: number;
  fallback: boolean;
}

export interface MilestoneDetail {
  eyebrow: string;
  title: string;
  sub: string;
  flag: string | null;
  showAgenda: boolean;
  agenda: { section: string; time: string }[];
  agendaTotal: string;
  showChecklist: boolean;
  checklistTitle: string;
  checklist: DetailCheckItem[];
  checklistNote: string;
  showDeliverables: boolean;
  deliverables: DetailCheckItem[];
  showMetricSlot: boolean;
  metricSlots: { label: string; tells: string }[];
  showNonNegotiables: boolean;
  nonNegotiables: string[];
  footLabel: string;
  foot: string;
}

/** The milestone detail rail's full content for one client + day — ported
 *  from the mock's detailVals(). checklist/deliverables items carry enough
 *  (day/index/fallback) for the caller to call toggleDeliveryTick directly;
 *  actual ticked state (local overrides) lives in client.ticks. */
export function computeMilestoneDetail(client: DeliveryClientData, day: number, today: string, gateLeadHours = GATE_LEAD_HOURS): MilestoneDetail | null {
  const m = milestonesFor(client, today, gateLeadHours).find((x) => x.day === day);
  if (!m) return null;

  const prev = SPINE.filter((p) => p.day < m.day && p.homework && p.homework.length).pop();
  const gateItems = m.gate?.items ?? [];
  const hwDone = prev ? client.homeworkDone[prev.day] : null;
  const satisfied = m.status === "done" || hwDone === "all";

  const out: MilestoneDetail = {
    eyebrow: `Day ${m.day} · ${m.kind === "call" ? "Call" : m.kind === "marker" ? "Phase marker" : "Checkpoint"}`,
    title: m.title,
    sub: `${client.name} · ${prettyDate(m.date)} · ${relativeDate(m.date, today)}${m.duration ? ` · ${m.duration}` : ""}`,
    flag: m.blocked ? `Gate not met with ${relativeDate(m.date, today).toLowerCase()} to go. Chase in Slack, give one hour, then reschedule.` : null,
    showAgenda: !!m.agenda,
    agenda: (m.agenda ?? []).map(([section, time]) => ({ section, time })),
    agendaTotal: m.duration ?? "",
    showChecklist: false,
    checklistTitle: "",
    checklist: [],
    checklistNote: "",
    showDeliverables: false,
    deliverables: [],
    showMetricSlot: false,
    metricSlots: [],
    showNonNegotiables: false,
    nonNegotiables: [],
    footLabel: "",
    foot: "",
  };

  if (m.checklist) {
    out.showChecklist = true;
    out.checklistTitle = "Day 0 checklist";
    out.checklist = m.checklist.map((item, i) => ({ label: item, ticked: isTicked(client, m.day, i, satisfied), day: m.day, index: i, fallback: satisfied }));
    out.checklistNote = "The welcome email and funnel link go out immediately — not end of day.";
  } else if (m.gate) {
    out.showChecklist = true;
    out.checklistTitle = `Gate · ${m.gate.label}`;
    out.checklist = gateItems.map((item, i) => ({ label: item, ticked: isTicked(client, m.day, i, satisfied), day: m.day, index: i, fallback: satisfied }));
    out.checklistNote = `Not submitted ${gateLeadHours}h before the call means the call is rescheduled. No exceptions.`;
  }

  if (m.deliverables && m.deliverables.length) {
    out.showDeliverables = true;
    out.deliverables = m.deliverables.map((item, i) => ({
      label: item, ticked: isTicked(client, m.day, 100 + i, m.status === "done"), day: m.day, index: 100 + i, fallback: m.status === "done",
    }));
  }

  if (m.day >= 14 && m.kind === "call") {
    out.showMetricSlot = true;
    out.metricSlots = [
      { label: "Outreach volume", tells: "Is the engine running?" },
      { label: "Positive reply rate", tells: "Script & targeting working?" },
      { label: "Book rate", tells: "Replies → appointments?" },
    ];
  }

  if (m.day === 1) {
    out.showNonNegotiables = true;
    out.nonNegotiables = NON_NEGOTIABLES;
  }

  if (m.homework && m.homework.length) {
    out.footLabel = "Homework assigned after this call";
    out.foot = m.homework.join(" · ");
  } else if (m.kind === "marker") {
    out.footLabel = "Not built yet";
    out.foot = "This phase has a start date but no SOP. Your own notes list it as outstanding, so the app shows the marker rather than inventing the content.";
  } else {
    out.footLabel = "Reporting framework";
    out.foot = "What have we done? What results have we achieved? What problems have been fixed? How will we improve going forward?";
  }

  return out;
}

export function parseJsonRecord<T>(raw: string): Record<string, T> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Adapts a raw DB row (JSON string columns) into the shape every function
 *  above works with (parsed records, numeric done/homeworkDone day keys). */
export function toDeliveryClientData(row: {
  id: string; name: string; business: string; startDate: string;
  system: string | null; platform: string | null; delivered: number;
  done: string; homeworkDone: string; ticks: string;
}): DeliveryClientData {
  const doneRaw = parseJsonRecord<DoneState>(row.done);
  const hwRaw = parseJsonRecord<DoneState>(row.homeworkDone);
  const done: Record<number, DoneState> = {};
  for (const k of Object.keys(doneRaw)) done[Number(k)] = doneRaw[k];
  const homeworkDone: Record<number, DoneState> = {};
  for (const k of Object.keys(hwRaw)) homeworkDone[Number(k)] = hwRaw[k];

  return {
    id: row.id, name: row.name, business: row.business, startDate: row.startDate,
    system: (row.system as SystemName | null) ?? null, platform: (row.platform as Platform | null) ?? null,
    delivered: row.delivered, done, homeworkDone, ticks: parseJsonRecord<boolean>(row.ticks),
  };
}
