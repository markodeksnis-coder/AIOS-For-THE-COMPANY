# How to run this — no developer experience needed

## The app is live

It's deployed on Vercel with a real, always-on link — open it from your
phone, laptop, anywhere. Check your Vercel project dashboard for the
exact URL if you don't have it saved. You do **not** need to run
anything locally just to use the app day-to-day; the steps below are
only for when you (or Claude) need to make changes to the code.

## The app now exists (Phase 2)

There's a real web app you can run on your own computer. It reads
everything from `/brain` — you never edit the app to change what it
shows, you edit the files in `/brain`.

### Running it

You'll need [Node.js](https://nodejs.org) installed (any recent version),
and a `.env` file with database credentials — copy `.env.example` to
`.env` and fill in the Turso values (ask Claude if you don't have them
handy). Then, from a terminal in this folder:

```
npm install       # one-time, downloads what the app needs
npm run dev       # starts the app
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
Leave the terminal window open while you use it — closing it stops the
app. `npm run dev` also re-reads `/brain` automatically before starting,
so any edits you made to the files show up.

If you change a `/brain` file while the app is already running, run
`npm run sync-brain` in a second terminal (or just stop and restart
`npm run dev`) to pick up the change.

### What "SAMPLE" and "DRAFT" mean when you see them

- **SAMPLE** — this isn't real. It's there so pages aren't empty and you
  can see the shape of what a real entry looks like. Replace it.
- **DRAFT** — this is a genuine first attempt (usually written by
  Claude) that needs your real words, numbers, or corrections.
- Sidebar items with a **PHASE N** tag next to them aren't built yet —
  clicking them does nothing on purpose, not a bug.

### Editing a file

Open anything under `/brain` in any text editor. Keep the block at the
top between the `---` lines (that's the frontmatter — title, status,
etc.) — change the values inside it, but don't remove the `---` lines
themselves. Refresh the app (see above) to see your change.

### What's in the app right now

- **Docs** — every file in `/brain`, searchable, with backlinks
- **Teams & Members**, **Agents**, **Training**, and one page per
  **Department** — all read live from `/brain`
- **Inbox, Issues, Projects** (Phase 3) — real work tracking. Create,
  edit, comment on, and delete issues and projects; everyone using the
  link sees the same live data.
- **Scorecards** (Phase 4) — real numbers against every department's
  KPIs, logged over time.
- **Systems, Graph** are later phases — see `CHANGELOG.md` for the
  roadmap.

### Making a Issue or Project

Go to **Issues** or **Projects** in the sidebar and click **+ New
issue** / **+ New project**. Fill in what you know — most fields are
optional except the title/name. You can change status and priority
right from the list, or open an issue to edit everything, add
comments, or delete it.

### Logging a scorecard number

Go to **Scorecards** in the sidebar (or click "View scorecard" on any
department page). Each KPI has its own card — click **+ Log entry**,
pick the date it's for, type the number, and save. The card updates to
show that as the latest value, with a trend arrow against whatever you
logged last time. To fix a mistake, delete the entry (the **×** next
to it) and log it again — there's no separate edit step.

The KPI's name and target still live in `/brain` (in each
department's `department.yaml`) — edit those files directly if a
target changes, the same as any other `/brain` content.

## Deployment

Live on Vercel, backed by a Turso (hosted SQLite) database — see the
"Live on the internet" entry in `CHANGELOG.md` for why. The database is
still just a rebuildable index of `/brain`; if it were ever wiped,
`npm run sync-brain` rebuilds the `/brain`-backed pages from the files
alone (Issues/Projects data itself lives only in the database, since
there's no file source for live work data).

If you ever need to redeploy or change environment variables, that's
done from the Vercel project dashboard — ask Claude if you need a
walkthrough.
