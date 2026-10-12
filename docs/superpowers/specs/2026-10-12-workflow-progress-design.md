# Workflow and subagent progress in the panel (0.20.0)

## Goal

The Claude Code VS Code extension does not show a running workflow's phases or agents. Claude desktop and the CLI's `/workflows` do. Agent Pet shows the same information under the chat row that owns the work.

## Decisions

- Detail lives under the chat row and expands with a chevron. Clicking the rest of the row still opens the chat.
- Each agent shows its status, model, token count and duration.
- Workflows are grouped by phase. Plain subagents (foreground or background `Agent`/`Task`) appear as a flat list.
- The extension (Node) reads every file. The native helper only draws, and it still accepts no file paths.

## Data (`src/claude-activity.cjs`)

1. **TaskStop.** Store `taskId` and `agentId` from `async_launched` results. When a `TaskStop` result succeeds and its `task_id` names a stored task, remove that task. Claude sends no task notification for stopped work. Without this, the chat could stay running forever.
2. **Lifecycle.**
   - A finished agent stays in the list, marked `done`, until the parent turn ends. This is what makes `2/6` possible.
   - A foreground agent finishes with its tool result. A background agent finishes with its task notification.
   - Only `backgroundTasks` decides whether the chat keeps running.
3. **Locating transcripts.** Agent Pet computes every path itself under `<projectDir>/<sessionId>/subagents/`. It never uses `transcriptDir` or `outputFile`.
   - Agents use `agent-<agentId>.jsonl`. The `agentId` comes from the result, or from the `toolUseId` in `agent-*.meta.json` while a foreground agent is still running. That scan runs at most every 5 s and only for running chats.
   - Workflows use `workflows/<runId>/journal.jsonl`, plus `agent-<agentId>.jsonl` for each journal agent.
   - Ids are validated: `agentId` is `a` followed by 16 hex digits; `runId` is `wf_` followed by `[A-Za-z0-9-]`.
4. **Journal.**
   - Only `started` (`key`, `phase`, `label`, `agentId`) and `result` (`key`) are read.
   - When a key starts again, the latest start wins.
   - Result text is never kept. Overlong `result` lines are matched by their leading `type`/`key`.
5. **Agent stats.**
   - Model and token count come from the last assistant record. The token count is the last record's context plus output, which matches Claude's own figure.
   - `startedAt` is when the agent's `meta.json` was created. `lastAt` is when the transcript was last modified.
   - Files are tailed: the last 256 KB when first attached, then only appended bytes. No message text is kept.
6. **Bounds.**
   - Only running, tracked chats are read.
   - At most 32 agent files are followed per chat.
   - The snapshot shows at most 8 phases, at most 12 agents per phase, and at most 32 entries.
   - Labels are cleaned and limited to 60 characters.
7. **Snapshot.** All fields are optional. Old helpers ignore them, and new helpers decode old snapshots.
   - Agent entry: `{ kind: 'agent', label, done, model, tokens, startedAt, lastAt }`.
   - Workflow entry: `{ kind: 'workflow', label, done, completed, total, phases: [{ name, completed, total, agents: [...] }] }`.

## Panel (`src/native/DesktopPet.swift`)

- **Subtitle.**
  - Single workflow: `Phase · running label (+N) · 9/10 agents`.
  - Several agents: `2/6 agents · newest running label`.
  - Otherwise, the 0.19.4 text.
- **Right column.** One small square per agent under the duration, filled when done. Above 10 agents it shows `9/10` instead. A pending reply takes this slot.
- **Expanded view.** A chevron toggles extra list entries of normal row height, with columns phase (on the first agent only), ✓/◌ label, model, tokens and duration.
  - The model column is hidden in the narrow compact list.
  - `+N more` lines cover agents beyond the caps.
  - Clicking a detail line opens the chat.
  - Expansion state is kept in memory only.
- **Formats.** `claude-opus-5-5` is shown as `Opus 5.5`. Token counts look like `314k` or `1.2M`. Durations use the existing elapsed format.
- **Strings.** English and Turkish.

## Known limits

- A workflow's planned agent count is unknown, so `total` can grow while it runs.
- Stopping a plain agent through `TaskStop` by `agentId` has not been seen in real data yet.
- Work cut off by closing VS Code sends no notification. This is out of scope.

## Tests

- **JS.**
  - TaskStop, including the launch → stop → resume sequence.
  - Journal parsing: restarted keys, overlong lines, phases and counts.
  - Agent statistics.
  - Matching a foreground agent through its meta file.
  - Keeping `done` entries until the turn ends.
  - Privacy: prompt, result, script and summary text never appear.
  - Rejecting ids that would escape the directory.
  - Falling back when a file is missing.
- **Native self-test.**
  - Subtitles and dots.
  - Expand and collapse without opening the chat; a row click still opens it.
  - Detail lines in grouped and compact lists, with scrolling.
  - Formats and Turkish strings.
  - Decoding a snapshot with and without the new fields.
- **Manual.**
  - Compare against a finished workflow's own `workflowProgress` summary.
  - Watch a live workflow in the panel.
