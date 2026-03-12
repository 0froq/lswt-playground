---
description: Show soul memory status and recent activity
---

# Soul Status

Show current soul memory and recent heartbeat activity.

## What this does

1. Read and display `.opencode/soul.md` (the persistent memory)
2. Read last 10 entries from `.opencode/soul/heartbeat.jsonl`
3. Show:
   - Last heartbeat timestamp
   - Session count (if detectable)
   - Current goals and preferences summary

## Output format

```
=== Soul Memory ===
[Content of soul.md]

=== Recent Heartbeats ===
[Last 10 heartbeat entries, most recent first]
```

Use this to review what Soul Mode remembers about this workspace.
