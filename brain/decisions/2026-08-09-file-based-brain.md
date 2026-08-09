---
title: "Decision: build the company OS as a file-based brain"
type: decision
department:
owner: Marko
status: active
updated: 2026-08-09
tags: [architecture]
links: ["[[company]]"]
---

# Decision: build the company OS as a file-based brain

**Date:** 2026-08-09

## The decision

The company's knowledge lives as plain markdown/YAML files in `/brain`.
The web app (Next.js, to be built in later phases) is only a reader and
live-data layer on top of it — never the only place something exists.

## Why

- The files are readable by Marko, by any future hire, and by AI agents
  without needing the app running.
- If the app breaks or gets rebuilt, the company's actual knowledge
  survives untouched.
- A database-only design locks knowledge behind whatever tool holds the
  database.

## What this replaced

An earlier direction (this repo's first commit) built a standalone
FastAPI backend with its own SQLite-only document store. That direction
is closed (see PR #1, closed without merging) in favor of this one,
since it put the source of truth inside a service instead of in files
Marko can read directly.
