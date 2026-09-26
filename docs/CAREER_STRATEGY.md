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

## Next seam: minimum viable application pack

The existing evaluation report, Prefill Vault, cover/PDF workflows, and application drawer are the
adapters for a future one-click pack. That pack should assemble, for a selected role:

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
