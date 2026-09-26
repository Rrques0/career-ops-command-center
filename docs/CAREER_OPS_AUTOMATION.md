# Career Ops automation specification

## Outcome

Reduce the daily job-search routine to one safe decision. The command center selects the highest-priority report ready for review; otherwise it selects the highest-priority discovered role to evaluate; otherwise it runs the existing queue. Evaluation keeps that role's workspace open while the local task prepares its report, so the user does not have to rediscover the result through Activity.

## Interface and acceptance criteria

- A user can start **Run my queue** from the command page. A separate scan-only action remains available when the user wants a free refresh without evaluation.
- A stable **Do next safe action** control is available from Command and Applications. Its deterministic priority is: a running or latest-failed workflow → an active offer, interview, or applied role → a report-ready evaluated role → the highest-priority discovered role → a fresh queue. A running task routes to its progress instead of starting a duplicate, and a failure routes to its log instead of silently retrying.
- Starting a role evaluation opens and retains that role's drawer. The task may prepare analysis and drafts, but the user still reviews the pack and submits any application personally.
- The workflow invokes the existing allowlisted `scan.mjs --since 14 --quiet` command and then the existing bounded evaluation workflow for the highest-priority discovered roles. It does not generate a submission, send a message, or submit a form.
- When the workflow starts, the UI opens Applications with the full queue available for review; reports and risk signals are prepared by the background task as they complete.
- A failed scan is visible in Activity and does not erase existing records.
- Full evaluation remains explicit. The existing Find + evaluate action can use configured AI account usage but must never submit or contact anyone.

## Architecture and seams

`Tasks.run(...)` remains the sole workflow seam. It reuses the scan command already owned by Career Ops. The frontend only requests a named allowlisted task and selects an existing view/filter; it does not run shell commands or duplicate ranking rules. The pure `nextSafeAction(snapshot)` module is a shallow presentation seam: it ranks existing Bridge-projected records to choose one reversible UI action and performs no mutation. `Bridge.snapshot()` remains the read seam for parser-derived jobs and priorities.

## Failure behavior

If scanning fails, the persisted task is marked failed and its log is visible in Activity. The last successful snapshot remains available. The workflow does not mutate application stages or canonical tracker records.

## Performance contract

The command center treats the snapshot as a read model, not a live stream. Refreshes are single-flight so a slow local parser cannot create a request pile-up; background refresh runs every 15 seconds only while the page is visible and a visibility change triggers an immediate read. JSON responses are gzip-compressed when the browser advertises support. The client keeps the last successful snapshot visible during a transient engine failure.

## Verification

- Backend test: unsupported task kinds are rejected; organize is accepted and uses the scanner command.
- Browser test: clicking Refresh my queue routes to Applications with the Discovered stage selected.
- Browser tests cover a discovered fixture (one evaluate task, retained drawer, no application/contact/stage write), an evaluated fixture (opens its pack with no task), an empty fixture (one queue task), workflow attention states (running/failed → Activity without a POST), and an active application (opens the follow-up workspace rather than scanning).
- Existing backend and browser suites verify tracker writes, offline behavior, navigation, and application state persistence.
- The backend health endpoint verifies gzip negotiation; the production bundle remains below the 200 KB compressed budget.

## Non-goals

No scheduling, no auto-submission, no automated outreach, no modification to the native Career Ops engine, and no external credentials or integrations.
