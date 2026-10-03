"""Deterministic profile-evidence coverage for attention ordering.

This module never estimates hiring odds or compares Archis with other people.
It only maps recognizable role language to the source-annotated evidence catalog
in ``data/professional-evidence.yml`` and returns an explainable coverage signal.
"""
from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_PATH = ROOT / 'data' / 'professional-evidence.yml'

ROLE_GROUPS = (
    ('security/compliance', ('security', 'cyber', 'cmmc', 'nist', 'grc', 'compliance', 'governance', 'risk', 'vulnerability', 'soc', 'siem'), ('Cybersecurity / GRC / CMMC',)),
    ('systems/identity/network', ('systems', 'infrastructure', 'administrator', 'iam', 'identity', 'network', 'networking', 'vpn', 'firewall', 'microsoft 365', 'active directory', 'support'), ('Systems / Infrastructure / IAM',)),
    ('manufacturing/ot', ('manufacturing', 'industrial', 'plant', 'production', 'operational technology', 'it/ot', 'cnc', 'erp', 'mes', 'metrology'), ('Manufacturing IT/OT',)),
    ('applications/automation', ('python', 'fastapi', 'graphql', 'api', 'automation', 'application', 'integration', 'developer', 'software', 'power automate'), ('Systems / Infrastructure / IAM', 'Manufacturing IT/OT')),
    ('cloud/platform', ('cloud', 'aws', 'azure', 'gcp', 'kubernetes', 'terraform'), ()),
)


def _matches(text: str, keyword: str) -> bool:
    normalized = re.sub(r'[^a-z0-9]+', ' ', text.lower()).strip()
    needle = re.sub(r'[^a-z0-9]+', ' ', keyword.lower()).strip()
    return bool(needle) and re.search(rf'(?<![a-z0-9]){re.escape(needle)}(?![a-z0-9])', normalized) is not None


@lru_cache(maxsize=1)
def evidence_catalog() -> dict[str, Any]:
    try:
        value = yaml.safe_load(EVIDENCE_PATH.read_text(encoding='utf-8')) or {}
    except (OSError, yaml.YAMLError):
        value = {}
    return value if isinstance(value, dict) else {}


def professional_fit(role: str, lane: str = '') -> dict[str, Any]:
    text = f'{role} {lane}'.strip()
    groups = [(name, keywords, lanes) for name, keywords, lanes in ROLE_GROUPS
              if any(_matches(text, keyword) for keyword in keywords)]
    evidence = evidence_catalog().get('evidence', [])
    evidence = [item for item in evidence if isinstance(item, dict)]
    covered: list[tuple[str, str]] = []
    missing: list[str] = []
    for name, _keywords, lanes in groups:
        candidates = [item for item in evidence if lanes and any(lane_name in lanes for lane_name in item.get('lanes', []))]
        if candidates:
            covered.extend((str(item.get('label', item.get('id', ''))), str(item.get('id', ''))) for item in candidates[:2])
        else:
            missing.append(name)

    if not groups:
        score, band = 0, 'unmapped'
        rationale = 'No recognized portfolio signal; review the posting manually before spending application effort.'
    else:
        score = round((len(groups) - len(missing)) / len(groups) * 100)
        band = 'direct' if score >= 75 else 'adjacent' if score >= 40 else 'gap'
        labels = list(dict.fromkeys(label for label, _ in covered))[:3]
        rationale = (
            f"{band.title()} portfolio evidence coverage: {', '.join(labels) or 'no matching evidence'}"
            + (f"; clarify {', '.join(missing)}." if missing else '.')
            + ' This is a workflow signal, not a hiring-probability estimate.'
        )
    catalog = evidence_catalog()
    weights = catalog.get('calculus', {}).get('weights', {}) if isinstance(catalog.get('calculus'), dict) else {}
    triage_weight = float(weights.get('triage', 0.6) or 0.6)
    evidence_weight = float(weights.get('portfolio_evidence', 0.4) or 0.4)
    total = triage_weight + evidence_weight or 1
    return {
        'score': score,
        'band': band,
        'rationale': rationale,
        'proofPoints': list(dict.fromkeys(proof_id for _, proof_id in covered))[:4],
        'triageWeight': round(triage_weight / total, 2),
        'evidenceWeight': round(evidence_weight / total, 2),
    }


def clear_cache() -> None:
    """Testing hook for a changed local evidence catalog."""
    evidence_catalog.cache_clear()
