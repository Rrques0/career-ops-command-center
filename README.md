# Career Ops Command Center

A local-first career operations interface by **Archis Khanal**: React + TypeScript, an original WebGL ice scene, and a Python bridge to the open-source Career Ops engine.

[LinkedIn](https://www.linkedin.com/in/archis-khanal-a79199170/) · [GitHub](https://github.com/Rrques0)

## What it does

- Searchable application list and lifecycle board backed by the same records.
- Ctrl/Cmd+K navigation, persistent display filters, stage shortcuts and focus mode.
- Python rule-based opportunity triage with explicit scoring explanations.
- Source-health and scan telemetry read from engine output, not demo counters.
- SQLite stage history, contact notes, durable tracker-sync retries and workflow logs.
- Draft-only employer research and LinkedIn project-sharing tools. Nothing is automatically sent or submitted.

This is a personal engineering project, not an enterprise-certified product. Priority scores are heuristics, not applicant-pool percentiles. AI workflows require separately configured CLI access and available usage.

## Architecture

Browser / Shadow DOM → loopback Python HTTP server → SQLite + Career Ops parsers and allowlisted CLI workflows.

The original engine is [Career Ops](https://github.com/santifer/career-ops), by Santiago Fernández de Valderrama and contributors, under MIT. This repository contains the custom UI, bridge, and native integration overlays; it does **not** claim authorship of the upstream engine. See engine-native/LICENSE for the upstream notice. The visual design is inspired by igloo.inc; no affiliation or copied brand/model assets.

## Local setup (Windows)

Requires Git, Node.js, Python with Tkinter, and PowerShell. From a fresh checkout:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup-engine.ps1
npm ci
python -m pip install -r backend/requirements.txt
npm run build
python -m backend.server --port 4317
```

Open http://127.0.0.1:4317/. Configure your own local resume and profile using the upstream Career Ops setup instructions. Empty/unconfigured records are not replaced with invented applicants. This UI still includes some Archis-specific labels; personalization is a known next step.

For AI workflows, separately install/authenticate the CLI expected by the native integration. Scan commands need the upstream dependencies installed by setup-engine.ps1. The server is single-user, binds only to loopback, and must not be exposed publicly.

## Verification

```powershell
npm run build
python -m unittest backend.test_bridge -v
npx playwright install chromium
npm run test:e2e
```

The current integration/browser tests were validated against the author's private local configuration. Several tests intentionally require populated career records and will not pass against a blank fresh clone. The public CI checks the frontend build and Python syntax only; it does not fake private test data or claim to validate live AI services.

## Privacy

No resume PDFs, contact details, private profile YAML, application records, reports, logs, credentials or database files are included. The engine checkout and runtime data are ignored. Browser storage holds display preferences only. Review all files before publishing any future updates.

See ARCHITECTURE.md and RESEARCH-UX.md for implementation details and cited design references.
