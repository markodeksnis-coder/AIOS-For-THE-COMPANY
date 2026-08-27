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
  repliesReceived: number;
  positiveReplies: number;
  membersJoined: number;
  appointmentsBooked: number;
  shows: number;
  noShows: number;
  cashCollected: number;
  replyRate: number; // repliesReceived / dmsSent, %
  positiveRate: number; // positiveReplies / dmsSent, %
  showRate: number; // shows / (shows + noShows), %
};

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

export function sumOutreach(rows: OutreachLog[]): OutreachTotals {
  const totals = rows.reduce(
    (acc, r) => ({
      dmsSent: acc.dmsSent + r.dmsSent,
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
    replyRate: pct(totals.repliesReceived, totals.dmsSent),
    positiveRate: pct(totals.positiveReplies, totals.dmsSent),
    showRate: pct(totals.shows, totals.shows + totals.noShows),
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
