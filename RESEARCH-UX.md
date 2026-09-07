# Career Hub usability research

Reviewed 2026-09-07. This is a focused selection of popular, relevant public projects, not an exhaustive GitHub ranking. Popularity is the rounded star count displayed by GitHub at review time; it is not evidence of security, correctness, or suitability. These recommendations borrow interaction patterns, not source code or paid integrations.

## Primary-source findings

| Project | Observed popularity | Verified pattern and relevance |
| --- | --- | --- |
| [Career Ops](https://github.com/career-ops-hq/career-ops) | 70.4k stars | Existing engine: evaluations, tracker, follow-up cadence/reminders, company research, and draft-only outreach. Keep this as the authoritative workflow engine instead of introducing another tracker. The former santifer URL redirects here. |
| [Twenty](https://github.com/twentyhq/twenty) | 56.4k stars | Adjacent CRM rather than a career tool. Its [first-party layout documentation](https://github.com/twentyhq/twenty/blob/main/packages/twenty-docs/getting-started/core-concepts/layout.mdx) describes Ctrl/Cmd+K navigation, global search, record side panels, and table/kanban views with separately saved filters and sorting. |
| [Reactive Resume](https://github.com/amruthpillai/reactive-resume) | 42.3k stars | Its [v5.2.1 release notes](https://github.com/amruthpillai/reactive-resume/releases/tag/v5.2.1) document application board/table/insights views, search/filter/sort, application contacts and follow-ups, and context-specific resume/letter/recruiter draft actions in the detail panel. |

## Four recommended improvements

1. **Saved working views.** Preserve search, stage, priority, and sort under short user-chosen names; offer useful built-in filters. Keep preferences separate from career records and credentials. Twenty is the source pattern; which presets help Archis is a product judgment, not a repository claim.
2. **One navigation/search command.** A visible search button plus Ctrl/Cmd+K should find both sections and actual opportunities. Escape closes it, focus returns to the opener, and shortcuts must not hijack typing. This adapts Twenty's command menu to the local app rather than installing its CRM stack.
3. **List and board over the same records.** Use a compact, searchable list for discovery and comparison; retain the lifecycle board for process overview. Both open the existing action drawer and use the same stable job IDs. This follows Reactive Resume's application views, avoiding duplicate stores or independent status fields.
4. **Next-action queue, not another dashboard.** Surface records requiring review, evaluated roles ready for a human application decision, and genuinely recorded follow-ups. Route each item directly to its existing job drawer or task. This combines Career Ops' workflow capabilities with Reactive Resume's context-specific actions. Do not fabricate deadlines, contacts, submissions, or successful evaluations. A generic follow-up suggestion must be labeled a suggestion, not an overdue reminder.

## Implementation guardrails

- Keep all actual job/contact/report data in the existing Python/SQLite/native-engine federation. Browser preferences may store layout and saved filters only; never tokens.
- Do not automatically apply, email, buy credits, install repos, or upload the resume to researched projects.
- Preserve a truthful offline state and distinguish priority rules from competitive candidate percentiles.
- Avoid a heavy command-palette/grid framework; retain the existing bundle budget.
- Validate keyboard opening/closing, saved-filter reloads, list/board consistency, empty search recovery, and narrow-screen navigation in browser tests.

## Scope not selected

[SimplifyJobs/Summer2027-Internships](https://github.com/SimplifyJobs/Summer2027-Internships) displayed 47.2k stars and describes a daily-updated internship list. It is a useful source-discovery reference, but primarily software/data/AI/quant/product/hardware internships, not evidence that its opportunities fit Archis's IT/OT and cyber targets. This UX change should not silently ingest or promise coverage from that dataset.
