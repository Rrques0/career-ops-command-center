# Career Ops automation specification

## Outcome

Reduce the daily job-search routine to one safe action: refresh the queue. The command center runs the existing zero-token scan, lets the existing Career Ops parser/ranker organize the discovered records, and returns the user to the actionable application list.

## Interface and acceptance criteria

- A user can start **Refresh my queue** from the command page or Applications.
- The workflow invokes only the existing allowlisted `scan.mjs --since 14 --quiet` command. It does not invoke an AI CLI, generate an application, send a message, or submit a form.
- When the scan completes, the UI opens Applications filtered to Discovered roles, ordered by the existing deterministic ranker.
- A failed scan is visible in Activity and does not erase existing records.
- Full evaluation remains explicit. The existing Find + evaluate action can use configured AI account usage but must never submit or contact anyone.

## Architecture and seams

`Tasks.run(kind='organize')` is the sole workflow seam. It reuses the scan command already owned by Career Ops. The frontend only requests the named task and selects an existing view/filter; it does not run shell commands or duplicate ranking rules. `Bridge.snapshot()` remains the read seam for parser-derived jobs and priorities.

## Failure behavior

If scanning fails, the persisted task is marked failed and its log is visible in Activity. The last successful snapshot remains available. The workflow does not mutate application stages or canonical tracker records.

## Verification

- Backend test: unsupported task kinds are rejected; organize is accepted and uses the scanner command.
- Browser test: clicking Refresh my queue routes to Applications with the Discovered stage selected.
- Existing backend and browser suites verify tracker writes, offline behavior, navigation, and application state persistence.

## Non-goals

No scheduling, no auto-submission, no automated outreach, no modification to the native Career Ops engine, and no external credentials or integrations.
