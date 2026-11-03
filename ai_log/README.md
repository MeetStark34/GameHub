# AI-use log

The course requires a log of how AI tools were used to build this project.
This folder holds that log. **It must contain real material only.** Do not
write down conversations that did not happen.

## What goes here

```text
ai_log/
  README.md                 this file
  TEMPLATE.md               copy once per work session
  sessions/
    2026-11-03-claude-code-mcp.md   one file per session (your notes, from TEMPLATE.md)
  exports/
    ...                     raw exports of the AI conversations (see below)
```

## How to export Claude Code conversations

- In Claude Code, run `/export`. It writes the current conversation to a text
  file, or copies it to the clipboard. Save the result in `ai_log/exports/`
  as `YYYY-MM-DD-<topic>.txt`.
- Claude Code also stores transcripts on your machine as JSONL files under
  `~/.claude/projects/<project-folder>/` (on Windows:
  `C:\Users\<you>\.claude\projects\...`). You can copy the relevant file into
  `exports/`.
- Before committing, remove anything secret from the export: database URLs,
  passwords, session tokens, and the contents of `.env.local`.

## Session notes

For each work session, copy `TEMPLATE.md` to `sessions/<date>-<topic>.md` and
fill it in **in your own words**. The most important parts for the course are
"what I changed manually" and "why".
