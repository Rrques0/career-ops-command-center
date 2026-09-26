# Student productivity and Obsidian/Jarvis benchmark

Reviewed: 2026-09-26. Scope: current public GitHub repositories whose first-party README or documentation describes student planning, local-first productivity, personal knowledge management, or private AI/Obsidian workflows. This is a pattern benchmark, not an endorsement or a claim that any repository is production-ready for Career Ops.

## Verified primary sources

| Project | Verified capability from its repository | Useful concept for Archis's Career Ops + WGU workflow |
| --- | --- | --- |
| [StudyCoach](https://github.com/Professional-X/StudyCoach) | Privacy-first study companion with AI planning, active recall, spaced-repetition flashcards, focus sessions, PDF/image resources, subject/topic structure, weak-area recommendations, and a study activity heatmap. | Add a learning cockpit for WGU, OSCP, CCNA, RHCA, and SSCP with course/topic progress, a next-study recommendation, focus-session logging, and an evidence-based review queue. Keep credentials and exam claims user-confirmed. |
| [Life OS](https://github.com/J0hnWIcks/life-os) | Local personal command center with a single capture Inbox, daily planner, calendar, projects, knowledge base, weekly review, focus timer, profiles, command palette, and backup/import. Its README documents plain JSON storage and profile isolation. | Give Career Ops one capture point for a job, WGU task, study note, or follow-up, then classify it later. Add a weekly review and export/import backup rather than scattering actions across pages. |
| [FocusNook](https://github.com/ProAnima/FocusNook) | Small local-first desktop planner designed to stay visible: always-on-top window, global shortcut, autostart, tray lifecycle, Today list, reminders, notes, and local-first sync. | Add a compact “Today” surface and a desktop shortcut that shows only the next career or study actions. Closing it should hide the window, not lose reminders or state. |
| [Agaric](https://github.com/jfolcini/agaric) | Local-first block/page knowledge base with daily journal, agenda filters, spaces, tags, page/block links, backlinks, and an MCP integration. It explicitly warns that its SQLite vault is not encrypted at rest. | Use an explicit Career / Study vault scope, wikilink-aware references, backlinks from job reports to case studies, and a clear local-encryption warning. Do not silently index the whole vault. |
| [tudo](https://github.com/jolleyDesign/tudo) | Keyboard-first local tasks and Markdown notebooks, multiple lists/projects, priority/story points/due dates/tags/subtasks, cross-list tag filters, search, archive instead of delete, wiki links/backlinks, and atomic human-readable storage. | Add keyboard-friendly quick capture, cross-lane tags, archive/recover semantics, and human-readable Markdown/JSON exports. This is particularly useful for low-friction WGU study and application triage. |
| [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) | Vault-wide task queries with due dates, recurring tasks, done dates, filtering, and status changes written back to the source Markdown. | Read task metadata from the vault and map only relevant tasks into Career Ops. A future write should be a reviewable patch or new inbox note, never an opaque bulk edit. |
| [obsidian-mcp](https://github.com/lstpsche/obsidian-mcp) | Filesystem-direct MCP server with Markdown/frontmatter/wiki-link awareness, BM25 and optional semantic search, graph/backlink queries, periodic notes, patch operations, filesystem watching, stdio or HTTP modes, and a single binary. | Prefer a local read/index adapter for Jarvis-style context. Use vault search and graph references to ground career answers, but keep write operations disabled until explicitly approved and scope paths/tags first. |
| [Obsidian Agent](https://github.com/mrbell/obsidian-agent) | Scheduled local jobs over a vault. Its documented safety model is read-only jobs plus a `promote` action that creates new files under `BotInbox/`; existing notes are not modified or deleted. | Adopt the same safe promotion boundary: agents can draft a job brief, study plan, or weekly review into a dedicated inbox; Archis approves before anything is moved into the canonical vault. |
| [Obsidian AI Assistant](https://github.com/SuperSonnix71/Obsidian-AI-Assistant) | Local/private assistant plugin that connects to Ollama, vLLM, llama.cpp, or another OpenAI-compatible endpoint; supports per-note/vault chat, streaming, note creation, and optional SearXNG grounding. | Make the model provider configurable and local-first. Surface whether an answer used vault context, Career Ops data, or web grounding; never imply that a generated insight is verified career evidence. |

## Converging design patterns

1. **One capture point, delayed classification.** Life OS and the small local-first tools make capture nearly frictionless. Career Ops should accept a pasted job URL, WGU task, study idea, or follow-up in one Inbox and classify it into `opportunity`, `learning`, `contact`, `note`, or `next_action` only after capture.
2. **Today is a projection, not another database.** FocusNook's small “Today” surface and Life OS's daily planner suggest a read-only projection over existing records. The Career Ops Today view should combine due follow-ups, the next WGU action, one study block, and one high-value application action without duplicating canonical state.
3. **Grounded context with provenance.** Obsidian MCP and Obsidian AI Assistant show the value of local vault search, but Career Ops must label every answer with its source note/report and timestamp. Unmatched claims should be marked “needs review,” not converted into profile facts.
4. **Reviewable writes.** Obsidian Agent's `BotInbox` boundary is a strong safety pattern. Generated drafts should land in a dedicated local inbox with a diff/approve action; never rewrite existing resume, profile, or vault notes automatically.
5. **Progress has multiple signals.** StudyCoach combines goals, focus time, active recall, weak areas, and heatmaps. Career Ops should distinguish `planned`, `started`, `evidence captured`, `reviewed`, and `completed` instead of treating a checkbox or a certificate name as proof of competence.
6. **Keyboard and command-first navigation.** `tudo`, Life OS, and the Obsidian ecosystem show that quick capture and global search reduce friction. Add `Ctrl/Cmd+K`, keyboard shortcuts for Inbox, Today, Applications, Learning, and Vault, and focus-return tests.
7. **Local-first is not automatically secure.** Agaric documents an unencrypted SQLite vault, while several other projects recommend local storage. Career Ops must state where the vault index, cached snippets, and generated drafts live; do not persist external credentials or full private notes by default. Rely on BitLocker/OS encryption only as an explicit deployment assumption.

## Proposed integration for this machine

The local machine includes a `Fresh JArvis` Electron project at
`C:\\Users\\archi\\OneDrive\\Documents\\ChatGPT\\Fresh JArvis`. Its first-party code persists a
small Super War Room state file under Electron user data and exposes an Obsidian-style vault output.
Career Ops now reads only that state projection when it is present; the bridge is read-only and does
not crawl the vault. A future user-selected vault adapter should still remain opt-in:

```text
Obsidian vault (user-selected root)
        |
        | read-only index: Markdown, frontmatter, tags, links, task lines
        v
Career Ops local bridge
        |
        +--> context cards: relevant notes + source paths + modified time
        +--> learning cockpit: WGU / OSCP / CCNA / RHCA / SSCP next actions
        +--> job evidence: approved case studies and resume facts only
        +--> review inbox: generated drafts awaiting explicit approval
```

Recommended defaults:

- Ask the user to choose the vault root and allowed folders/tags in Setup; do not scan `C:\Users\...` broadly.
- Start read-only. Index filenames, headings, frontmatter, task lines, tags, and links; avoid copying entire note bodies into the Career Ops store.
- Support either a direct filesystem adapter or a localhost MCP adapter. Bind localhost only, require an explicit auth token for any HTTP mode, and keep credentials out of browser storage.
- Use a dedicated `Career Ops/Inbox/` or equivalent review folder for generated drafts. The app should show a diff and source citations before any write.
- Add a clear “vault unavailable / last indexed” state and let the career app continue working offline.
- Treat the vault as a source of personal notes, not proof by itself. Verified resume facts still come from the user's profile/CV and approved case studies.

## High-value product increments

1. **Vault Setup card:** choose root, allowed folders/tags, read-only status, last index time, and a “test connection” action.
2. **Unified Inbox:** paste a job URL or type a study task; auto-classify into Applications, Learning, Contacts, or Notes with a review step.
3. **Learning cockpit:** show the next WGU class action, certification study block, weak topic, and last focus session. Add spaced-review reminders only when the user opts in.
4. **Grounded Jarvis panel:** ask questions across approved vault scope and Career Ops records, with source note links and an uncertainty label.
5. **Promotion queue:** create reviewable Markdown drafts for application packs, interview stories, weekly reviews, or study plans under the dedicated inbox.
6. **Weekly review:** summarize applications, follow-ups, WGU progress, study time, and unresolved tasks; let the user approve only the resulting next actions.
7. **Backup/export:** export Career Ops records and generated inbox drafts separately from the vault. Never bundle the full vault into a public GitHub repository.

## Boundaries and limitations

- No third-party repository was installed or executed. The local Fresh JArvis source and its persisted
  state shape were inspected read-only; no private note bodies were imported or modified.
- Capabilities above are documentation-verified from primary GitHub repository pages/readmes, not independently runtime-certified.
- “Current” means the repositories were read on 2026-09-26; feature sets, stars, licenses, and compatibility can change.
- Borrow interaction patterns, not code. Any implementation requires license review and a trust-boundary review before adding dependencies or external model providers.
- Do not add automatic vault mutation, email sending, application submission, or credential harvesting as part of this integration.

## Sources

- [StudyCoach README](https://github.com/Professional-X/StudyCoach)
- [Life OS README](https://github.com/J0hnWIcks/life-os)
- [FocusNook README](https://github.com/ProAnima/FocusNook)
- [Agaric README](https://github.com/jfolcini/agaric)
- [tudo README](https://github.com/jolleyDesign/tudo)
- [Obsidian Tasks README](https://github.com/obsidian-tasks-group/obsidian-tasks)
- [obsidian-mcp README](https://github.com/lstpsche/obsidian-mcp)
- [Obsidian Agent README](https://github.com/mrbell/obsidian-agent)
- [Obsidian AI Assistant README](https://github.com/SuperSonnix71/Obsidian-AI-Assistant)
