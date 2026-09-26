# Career strategy layer

## Implemented

- `Bridge.snapshot()` assigns each opportunity to one of three lanes: Manufacturing IT/OT,
  Systems / Infrastructure / IAM, or Cybersecurity / GRC / CMMC.
- Every opportunity receives a deterministic bridge label: Direct target, Strong bridge, Stretch,
  or Review. The label is a triage aid, not a claim about applicant percentile.
- The command view shows recruiter-readable positioning and proof-first case studies sourced from
  `data/case-studies.yml`.
- Case studies use the reviewable structure Situation -> Risk -> Action -> Result -> What I learned.
  They contain only confirmed responsibilities and avoid invented metrics.
- The application drawer includes a minimum viable Application Pack review block. It assembles the
  selected role's lane, bridge label, report-backed fit, gaps, and next action into a copyable
  review artifact; it never submits, sends, or advances an application.

## Next seam: deeper generated outputs

The current pack is intentionally a small, evidence-first review block. The existing evaluation
report, Prefill Vault, cover/PDF workflows, and application drawer remain the adapters for deeper
generated outputs. The next increment can add, for a selected role:

1. lane-specific resume emphasis;
2. three grounded fit bullets and three objections;
3. a short draft cover letter;
4. salary and work-mode questions;
5. recommended case studies and prefill macros.

The pack must open in a review screen and never submit, send, or advance the application on the
user's behalf.

## Verification boundary

Lane and bridge labels are deterministic and testable from the snapshot. Case-study language is a
local user-owned data source. AI may draft application materials, but source claims still come from
the Career Ops user layer and require user review.
