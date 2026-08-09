# How to run this — no developer experience needed

## Where things are right now (Phase 1)

There's no app to run yet. Everything the company knows lives in the
`/brain` folder as plain text files. You can open and read every one of
them without installing anything.

### Reading the brain on your computer

1. Download this repository (or open it in whatever tool you're already
   using, like GitHub Desktop or Claude Code).
2. Open the `brain` folder.
3. Every file is either `.md` (markdown — reads like a document) or
   `.yaml` (structured data — still plain text, just organized). Open
   any of them in any text editor, or even Notepad/TextEdit — they're
   not locked into any special program.
4. Start with `brain/README.md` — it explains the rules this folder
   follows. Then `brain/company.yaml` for the company basics.

### What "SAMPLE" and "DRAFT" mean when you see them

- **SAMPLE** — this isn't real. It's there so the folder isn't empty and
  you can see the shape of what a real entry looks like. Replace it.
- **DRAFT** — this is a genuine first attempt (usually written by
  Claude) that needs your real words, numbers, or corrections.

### Editing a file

Just open it and edit the text. Keep the block at the top between the
`---` lines (that's the frontmatter — title, status, etc.) — change the
values inside it, but don't remove the `---` lines themselves.

## What's coming next

Phase 2 adds an actual web app: a clean, searchable way to browse
everything in `/brain` from a browser instead of digging through folders.
Once that exists, this doc will be rewritten to explain how to open and
use it — running a local web app, or visiting a hosted link, depending
on what we decide.
