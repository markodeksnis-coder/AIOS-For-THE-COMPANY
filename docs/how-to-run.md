# How to run this — no developer experience needed

## The app now exists (Phase 2)

There's a real web app you can run on your own computer. It reads
everything from `/brain` — you never edit the app to change what it
shows, you edit the files in `/brain`.

### Running it

You'll need [Node.js](https://nodejs.org) installed (any recent version).
Then, from a terminal in this folder:

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
- Everything else in the sidebar (Inbox, Issues, Projects, Scorecards,
  Systems, Graph) is a later phase — see `CHANGELOG.md` for the roadmap

## Deploying it somewhere everyone can reach

Not set up yet. When you're ready for a real shared link (not just your
own computer), tell Claude and it'll help you pick and set up hosting —
that's a real decision involving cost and where your data lives, so it
needs your input first.
