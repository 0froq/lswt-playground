---
description: Log a heartbeat to soul memory
---

# Soul Heartbeat

Log a heartbeat to `.opencode/soul/heartbeat.jsonl`.

## What this does

1. Read current soul.md for context
2. Append heartbeat entry to heartbeat.jsonl with:
   - timestamp (ISO 8601)
   - type: "heartbeat"
   - status: "ok" | "warning" | "error"
   - optional detail message
3. Report success

## Output format

```
✅ Heartbeat logged: 2026-03-12T12:00:00Z
```

Use this for scheduled heartbeats or manual check-ins.
