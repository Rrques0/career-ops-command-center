# Decisions

## 2026-09-20 — Treat Study OS as a future bounded product

The inspected workspace is currently a TouchDesigner Blackline project plus a Career Ops command center, not a Study OS. Foundation documents describe the proposed product without modifying either existing system. This prevents accidental migration or context contamination.

## 2026-09-20 — Use native Codex project mechanisms first

Current official OpenAI documentation supports root/scoped `AGENTS.md`, custom `.codex/agents/*.toml`, built-in multi-agent workflows, skills, plugins, and MCP servers. The project will use the first three lightly and add skills or MCP only for a demonstrated need. A large external orchestration layer would duplicate native delegation and increase instruction conflicts.

## 2026-09-20 — Do not install recommendations yet

Superpowers, oh-my-codex, Hallmark, and broad subagent packs are deferred. They are not required to create the foundation, and the repository has no Study OS implementation to govern. Revisit after the product boundary and UI direction are approved.

## 2026-09-20 — No MCP integration in foundation

No external service is required to inspect or document this repository. MCP connections would introduce credentials and operational surface without a current product use case. Reconsider only for an approved external workflow such as calendar sync, issue tracking, or documentation lookup.

## 2026-09-20 — Automate Career Ops preparation, not irreversible actions

The command center may scan public sources and deterministically organize its local queue in one action. It does not submit applications, send messages, or change canonical application stages without the user. This keeps automation within the existing Career Ops local-first, human-in-the-loop boundary and keeps the native tracker authoritative.

## 2026-09-20 — Optimize the snapshot seam before adding dependencies

The Career Ops bridge currently builds a rich local snapshot from the native parser. To improve responsiveness without changing the engine or introducing a cache-coherency problem, performance work stays at the existing seam: single-flight/visibility-aware client reads and negotiated gzip on loopback JSON responses. This preserves fresh reads after explicit actions, reduces idle parser work, and keeps the dependency surface unchanged.

## 2026-09-26 — Borrow proven interaction patterns, not automation risk

The repository benchmark found recurring patterns across self-hosted career tools: saved views and global search, list/board duality, a truthful next-action queue, relationship context, and bounded source filters. Career Ops already implements the first three through Quick Navigate, saved pipeline views, the application drawer, and Today actions; future additions should deepen those seams before adding browser automation or third-party credentials. External job content remains data, and user review remains required for irreversible actions.

## 2026-09-26 — Negotiate unchanged snapshots and keep Jarvis read-only

The command center now fingerprints local source files and SQLite state at the existing snapshot
seam. Conditional requests return `304 Not Modified` when nothing changed, while writes change the
SQLite fingerprint and force a fresh projection. The local Fresh JArvis / Super War Room bridge is
read-only and imports only a small task/evidence/blocker projection; it never crawls or mutates an
Obsidian vault. This improves idle refresh cost without adding a new persistence system or trust
surface.

## 2026-09-26 — Prefer one safe next action over navigation

Career Ops now uses a small, pure `nextSafeAction` presentation module to make one deterministic
choice from the existing local snapshot: surface a running or latest-failed workflow, attend to an
offer/interview/applied role, review the best report, evaluate the best discovered role, or run the
queue. Starting an evaluation keeps that role's drawer open rather than routing the user to Activity
and requiring a second search for the result. The module owns no persistence or ranking rules, and
it cannot apply, send outreach, or change an application stage; those boundaries remain with the user
and the native Career Ops tracker.
