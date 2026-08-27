// Shared vocabulary and aggregation for the hand-logged Cold Outbound /
// Appointment Reporting dashboard (src/app/dashboard/outbound,
// src/app/dashboard/appointments) — both read OutreachLog rows and just
// slice them differently (by setter, by source, by day), so the totals
// math lives here once instead of being reimplemented per page.

import type { OutreachLog } from "@prisma/client";

export const SETTERS = ["Marko", "DMdroid"] as const;
export type Setter = (typeof SETTERS)[number];

export const SOURCES = ["Skool", "LinkedIn", "Instagram"] as const;
export type Source = (typeof SOURCES)[number];

export type OutreachTotals = {
  dmsSent: number;
  messagesSeen: number;
  repliesReceived: number;
  positiveReplies: number;
  membersJoined: number;
  appointmentsBooked: number;
  shows: number;
  noShows: number;
  cashCollected: number;
  seenRate: number; // messagesSeen / dmsSent, %
  replyRate: number; // repliesReceived / dmsSent, %
  positiveRate: number; // positiveReplies / dmsSent, %
  showRate: number; // shows / (shows + noShows), %
  joinRate: number; // membersJoined / positiveReplies, %
};

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

export function sumOutreach(rows: OutreachLog[]): OutreachTotals {
  const totals = rows.reduce(
    (acc, r) => ({
      dmsSent: acc.dmsSent + r.dmsSent,
      messagesSeen: acc.messagesSeen + r.messagesSeen,
      repliesReceived: acc.repliesReceived + r.repliesReceived,
      positiveReplies: acc.positiveReplies + r.positiveReplies,
      membersJoined: acc.membersJoined + r.membersJoined,
      appointmentsBooked: acc.appointmentsBooked + r.appointmentsBooked,
      shows: acc.shows + r.shows,
      noShows: acc.noShows + r.noShows,
      cashCollected: acc.cashCollected + r.cashCollected,
    }),
    {
      dmsSent: 0,
      messagesSeen: 0,
      repliesReceived: 0,
      positiveReplies: 0,
      membersJoined: 0,
      appointmentsBooked: 0,
      shows: 0,
      noShows: 0,
      cashCollected: 0,
    }
  );

  return {
    ...totals,
    seenRate: pct(totals.messagesSeen, totals.dmsSent),
    replyRate: pct(totals.repliesReceived, totals.dmsSent),
    positiveRate: pct(totals.positiveReplies, totals.dmsSent),
    showRate: pct(totals.shows, totals.shows + totals.noShows),
    joinRate: pct(totals.membersJoined, totals.positiveReplies),
  };
}

/** Groups rows by a key, preserving first-seen key order — used to build
 *  the by-setter/by-source/by-day breakdown tables. */
export function groupByKey<T>(rows: T[], keyFn: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyFn(row);
    const bucket = map.get(key);
    if (bucket) bucket.push(row);
    else map.set(key, [row]);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Grouping used by the dashboard's "By setter / By source / By day / All rows"
// switch. One vocabulary here so the tables, the drill-down rail, and the
// chart all agree on what a group is and how it's keyed.
// ---------------------------------------------------------------------------

export const GROUP_BYS = ["setter", "source", "day", "rows"] as const;
export type GroupBy = (typeof GROUP_BYS)[number];

/** The OutreachLog field a group key comes from — `rows` has no grouping
 *  field since it lists the raw logged rows. */
export const GROUP_FIELD: Record<Exclude<GroupBy, "rows">, "setter" | "source" | "date"> = {
  setter: "setter",
  source: "source",
  day: "date",
};

export type GroupTotals = OutreachTotals & { key: string; rowCount: number };

/** Aggregates rows into one entry per group key. Day groups come back
 *  newest-first (that's how they're read); setter/source groups come back
 *  ranked by volume so the biggest contributor is the first row. */
export function groupTotals(rows: OutreachLog[], group: Exclude<GroupBy, "rows">): GroupTotals[] {
  const field = GROUP_FIELD[group];
  const entries = [...groupByKey(rows, (r) => r[field]).entries()].map(([key, group_]) => ({
    key,
    rowCount: group_.length,
    ...sumOutreach(group_),
  }));

  return group === "day"
    ? entries.sort((a, b) => (a.key < b.key ? 1 : -1))
    : entries.sort((a, b) => b.dmsSent - a.dmsSent);
}

export type OutreachSeriesPoint = { date: string; primary: number; secondary: number };

/** One point per logged day, oldest-first — the shape OutreachChart wants.
 *  `primary`/`secondary` are whichever two totals that page is plotting, so
 *  the chart component never needs to know which metric it's drawing. */
export function dailySeries(
  rows: OutreachLog[],
  primary: keyof OutreachTotals,
  secondary: keyof OutreachTotals
): OutreachSeriesPoint[] {
  return [...groupByKey(rows, (r) => r.date).entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, dayRows]) => {
      const totals = sumOutreach(dayRows);
      return { date, primary: Number(totals[primary]), secondary: Number(totals[secondary]) };
    });
}
