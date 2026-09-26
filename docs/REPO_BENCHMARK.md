# Career Ops repository benchmark

Reviewed: 2026-09-26. Scope: public, relevant job-search automation, application tracking, and relationship-management projects. This is a selected benchmark of prominent repositories, not an exhaustive or definitive ranking. Rounded star counts below were displayed on the primary GitHub repository pages on the review date; popularity does not prove quality or security.

## Verified sources

| Project | Popularity snapshot | Verified capability | Useful concept for this app |
| --- | --- | --- | --- |
| [Career Ops](https://github.com/career-ops-hq/career-ops) | 72.8k stars | Local career evaluation, tailored documents, contact research, and draft-only outreach; explicitly leaves sending/submission to the user. | Keep the existing engine and surface its actual outputs next to the opportunity. Show evidence and uncertainty, not decorative fit claims. |
| [Twenty](https://github.com/twentyhq/twenty) | 57.5k stars | Its [layout documentation](https://github.com/twentyhq/twenty/blob/main/packages/twenty-docs/getting-started/core-concepts/layout.mdx) describes keyboard search, Ctrl/Cmd+K commands, favorites, record side panels, and table/kanban/calendar views with saved filters and sorting. | Consistent global navigation, saved working views, and detail drawers that preserve list context. It is an adjacent CRM, not a career-specific engine. |
| [Reactive Resume](https://github.com/reactive-resume/reactive-resume) | 43.4k stars | [Version 5.2.1 release notes](https://github.com/reactive-resume/reactive-resume/releases/tag/v5.2.1) document application board/table/insights views, filtering, archiving, contacts, documents, follow-ups, and recruiter drafts from an application detail panel. | One application workspace with alternate presentations of the same records and contextual document actions. |
| [Monica](https://github.com/monicahq/monica) | 25.4k stars | README lists contacts, notes, reminders, relationship context, tasks, activities, favorites, and labels. The main branch is labeled beta and directs stable users to 4.x. | Record how a contact was found/met, the last real interaction, and the next explicitly scheduled action. Do not manufacture contacts or pretend a draft was sent. |
| [JobSpy](https://github.com/speedyapply/JobSpy) | Not recorded | README documents multi-board queries, location and age filters, result limits, structured output, provider-specific filter limitations, and additional requests for full LinkedIn descriptions. | Bounded discovery presets, visible source provenance, and explicit scan-cost/failure feedback. This is a research reference, not an installed or verified live integration. |

The old `santifer/career-ops` and `amruthpillai/reactive-resume` URLs now redirect to the organizations linked above. This benchmark does not upgrade the local engine or imply its installed version has every upstream feature.

## Recommended next increment

These are design recommendations inferred from the sources, not claims of already implemented behavior.

1. **Global jump/search.** A visible navigation button and Ctrl/Cmd+K find sections and actual opportunity records. Escape closes; focus returns to the trigger; shortcuts do not intercept text entry.
2. **Saved working views.** Save validated stage, priority, search, and sort settings under a short name. Keep display preferences separate from credentials and canonical application records. Offer a reset when a filter hides everything.
3. **List and board, one source of truth.** Compact rows support comparison; the board supports lifecycle review. Both open the same job ID, notes, documents, and status actions. Switching views must not reset search unexpectedly.
4. **A truthful next-action queue.** Separate unevaluated opportunities, evaluated roles awaiting a human decision, saved outreach drafts, and genuinely scheduled follow-ups. Suggested follow-ups are not overdue reminders unless a real date exists.
5. **Relationship continuity.** Present the latest logged contact event and its evidence link beside the opportunity. A future reminder needs explicit date/status semantics and persistence tests before UI claims it is scheduled.
6. **Bounded scans.** Explain scope, current source, completed/failed counts, last successful scan, and whether results are partial. Reuse the existing scanner rather than adding JobSpy or another dependency merely because it is popular.

## Architecture and safety boundaries

- Preserve the existing Career Ops engine, tracker, SQLite persistence, and plugin model. This is not Study OS implementation.
- Do not install researched stacks or add external credentials, paid services, or automatic submission/email behavior as part of a navigation improvement.
- Never equate a deterministic priority number with a candidate percentile or probability of hire.
- Borrow concepts; do not copy code without license review. No third-party code was copied for this document.
- Keep scraping/provider restrictions visible. Repository documentation is not a guarantee that a source works today or permits a proposed access pattern.

## Verification and limits

Evidence gathered with read-only browser opens of the linked GitHub README, repository, documentation, and release pages. No repositories were installed, no authenticated accounts accessed, and no live scraper or upstream application was executed. Product capability statements are therefore documentation-verified, not runtime-certified.

For any approved implementation, test keyboard navigation/focus return, saved-view reloads, list/board record consistency, empty-filter recovery, narrow screens, and offline behavior. Persistence changes additionally require isolated-store tests. The next safe action is to select the smallest interaction increment against the current implementation, then specify and test it without replacing the career engine.
