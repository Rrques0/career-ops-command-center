"""Explainable, local-only intelligence for the Career Ops GUI.

The module's interface is intentionally small: assess one job, or build one
complete hub snapshot. File-format and ranking details stay behind that seam.
"""

from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence


@dataclass(frozen=True)
class JobAssessment:
    priority: int
    tier: str
    reason: str


@dataclass(frozen=True)
class RankedJob:
    index: int
    assessment: JobAssessment


@dataclass(frozen=True)
class SourceHealth:
    healthy: int = 0
    empty: int = 0
    failing: int = 0
    total: int = 0
    checked_at: str = ""
    issues: tuple[str, ...] = ()


@dataclass(frozen=True)
class ScanSummary:
    checked: int = 0
    added: int = 0
    filtered: int = 0
    duplicates: int = 0
    status: str = "No scan yet"
    timestamp: str = ""


@dataclass(frozen=True)
class NextAction:
    title: str
    detail: str
    kind: str
    reference: int | None = None


@dataclass(frozen=True)
class CareerSnapshot:
    ranked_jobs: tuple[RankedJob, ...]
    source_health: SourceHealth
    latest_scan: ScanSummary
    actions: tuple[NextAction, ...]
    best_application_index: int | None = None


def _text(item: object, name: str) -> str:
    if isinstance(item, dict):
        return str(item.get(name, "") or "")
    return str(getattr(item, name, "") or "")


def _score(value: str) -> float:
    match = re.search(r"(\d+(?:\.\d+)?)", value)
    return float(match.group(1)) if match else -1.0


def _contains(text: str, marker: str) -> bool:
    """Match a real word/phrase, not accidental substrings such as nist in administrator."""
    pattern = rf"(?<![a-z0-9]){re.escape(marker.lower())}(?![a-z0-9])"
    return re.search(pattern, text) is not None


def assess_job(job: object) -> JobAssessment:
    """Return explainable pre-evaluation triage; never an applicant percentile."""
    role = _text(job, "role").lower()
    location = _text(job, "location").lower()
    priority = 0
    reasons: list[str] = []

    early_markers = (
        "junior", "associate", "analyst", "specialist", "engineer i",
        "administrator", "application support", "early career", "new grad",
    )
    target_groups = (
        ("cyber/security", ("security", "cyber", "cybersecurity")),
        ("GRC/compliance", ("grc", "compliance", "cmmc", "nist")),
        ("systems/infrastructure", ("systems", "infrastructure", "administrator")),
        ("IT/OT/manufacturing", ("it/ot", "operational technology", "manufacturing", "automation")),
    )
    senior_markers = ("senior", "staff", "principal", "director", "manager", "lead")

    if any(_contains(role, marker) for marker in early_markers):
        priority += 5
        reasons.append("early-career title")
    matched_groups = [label for label, markers in target_groups if any(_contains(role, marker) for marker in markers)]
    priority += min(3, len(matched_groups))
    reasons.extend(matched_groups[:2])
    if any(_contains(role, marker) for marker in senior_markers):
        priority -= 5
        reasons.append("senior scope")
    if any(_contains(location, marker) for marker in ("syracuse", "central new york")):
        priority += 4
        reasons.append("preferred location")
    elif any(_contains(location, marker) for marker in ("remote", "united states", "usa only", "new york")):
        priority += 1
        reasons.append("U.S./remote")

    if priority >= 6:
        tier = "HIGH"
    elif priority >= 3:
        tier = "GOOD"
    elif priority >= 0:
        tier = "REVIEW"
    else:
        tier = "STRETCH"
    reason = " · ".join(dict.fromkeys(reasons)) or "manual review needed"
    return JobAssessment(priority=priority, tier=tier, reason=reason)


def _read_tsv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    try:
        with path.open("r", encoding="utf-8-sig", errors="replace", newline="") as handle:
            return list(csv.DictReader(handle, delimiter="\t"))
    except (OSError, csv.Error):
        return []


def _source_health(root: Path) -> SourceHealth:
    rows = [row for row in _read_tsv(root / "data" / "portal-health.tsv") if row.get("timestamp")]
    if not rows:
        return SourceHealth()
    latest = max(row["timestamp"] for row in rows)
    batch = [row for row in rows if row["timestamp"] == latest]
    healthy = sum(row.get("status") == "reachable" for row in batch)
    empty = sum(row.get("status") == "empty" for row in batch)
    problems = [row for row in batch if row.get("status") not in {"reachable", "empty"}]
    issues = tuple(
        f"{row.get('company', 'Unknown')}: {row.get('status', 'unknown').replace('_', ' ')}"
        for row in problems[:8]
    )
    return SourceHealth(
        healthy=healthy, empty=empty, failing=len(problems), total=len(batch),
        checked_at=latest, issues=issues,
    )


def _scan_summary(root: Path) -> ScanSummary:
    rows = [row for row in _read_tsv(root / "data" / "scan-runs.tsv") if row.get("timestamp")]
    if not rows:
        return ScanSummary()
    row = max(rows, key=lambda item: item.get("timestamp", ""))

    def number(name: str) -> int:
        try:
            return int(row.get(name, "0") or 0)
        except ValueError:
            return 0

    filtered = sum(number(name) for name in (
        "filtered_title", "filtered_tier", "filtered_location", "filtered_posting_age",
        "filtered_salary", "filtered_content", "filtered_cooldown", "filtered_blacklist",
        "filtered_visa", "filtered_posted_date", "filtered_country_eligibility",
    ))
    return ScanSummary(
        checked=number("found"), added=number("new_added"), filtered=filtered,
        duplicates=number("dupes"), status=row.get("status", "unknown"),
        timestamp=row.get("timestamp", ""),
    )


def build_snapshot(root: Path, jobs: Sequence[object], applications: Sequence[object]) -> CareerSnapshot:
    """Build the complete read-only command-center state through one interface."""
    ranked = tuple(sorted(
        (RankedJob(index=index, assessment=assess_job(job)) for index, job in enumerate(jobs)),
        key=lambda item: (item.assessment.priority, item.index),
        reverse=True,
    ))

    best_application_index: int | None = None
    best_application_score = -1.0
    for index, app in enumerate(applications):
        value = _score(_text(app, "score"))
        status = _text(app, "status").lower()
        if status not in {"rejected", "discarded", "hired"} and value > best_application_score:
            best_application_score = value
            best_application_index = index

    actions: list[NextAction] = []
    if ranked:
        top = jobs[ranked[0].index]
        actions.append(NextAction(
            title="Evaluate today's strongest matches",
            detail=f"Start with {_text(top, 'company')} — {_text(top, 'role')}; Career Ops will verify and fully evaluate the best three.",
            kind="autopilot", reference=ranked[0].index,
        ))
    else:
        actions.append(NextAction(
            title="Find fresh roles", detail="Run the bounded public-source scan and build a ranked shortlist.",
            kind="autopilot",
        ))

    if best_application_index is not None:
        app = applications[best_application_index]
        actions.append(NextAction(
            title="Move the strongest evaluation forward",
            detail=f"{_text(app, 'company')} — {_text(app, 'role')} is currently {_text(app, 'score') or 'not scored'}; review the report and application pack.",
            kind="application", reference=best_application_index,
        ))
    else:
        actions.append(NextAction(
            title="Create the first application pack", detail="Evaluate one promising role to create a report, tailored résumé, and tracker entry.",
            kind="application",
        ))

    strategies = sorted((root / "documents" / "employer-strategies").glob("*.md"))
    strategies = [path for path in strategies if path.name.lower() != "readme.md"]
    actions.append(NextAction(
        title="Review employer outreach before sending",
        detail=(f"{len(strategies)} private strategy draft{'s' if len(strategies) != 1 else ''} ready; verify every contact and claim."
                if strategies else "Build a sourced, draft-only strategy for a strong evaluation."),
        kind="strategy",
    ))

    return CareerSnapshot(
        ranked_jobs=ranked,
        source_health=_source_health(root),
        latest_scan=_scan_summary(root),
        actions=tuple(actions),
        best_application_index=best_application_index,
    )
