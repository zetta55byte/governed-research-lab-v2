"""
grl_v2.core.membranes
======================
Membrane evaluation engine.

Aggregation rule:
  - Any BLOCK → BLOCK
  - Any DEFER → DEFER
  - All ALLOW → ALLOW
"""

import httpx
from typing import Optional
from .types import Delta, MembraneVerdict

GOVERNANCE_URL = "https://constitutional-os-production.up.railway.app"


def m1_safety(delta: Delta, constitution: dict) -> tuple[MembraneVerdict, str]:
    """M1: Safety check."""
    text = str(delta.metadata) + delta.description
    unsafe = any(k in text.lower() for k in
                 ["harm", "weapon", "exploit", "malware", "attack"])
    if unsafe:
        return MembraneVerdict.BLOCK, "Unsafe content detected"
    return MembraneVerdict.ALLOW, "Safety check passed"


def m2_reversibility(delta: Delta, constitution: dict) -> tuple[MembraneVerdict, str]:
    """M2: Reversibility check."""
    if not delta.reversible:
        weight = constitution.get("membranes", {}).get("M2_reversibility", {}).get("weight", 0.3)
        if weight > 0.4:
            return MembraneVerdict.DEFER, "Irreversible delta requires human review"
    if not delta.inverse:
        return MembraneVerdict.DEFER, "No inverse operations defined — reversibility unverified"
    return MembraneVerdict.ALLOW, "Delta is reversible"


def m3_pluralism(delta: Delta, constitution: dict) -> tuple[MembraneVerdict, str]:
    """M3: Pluralism check — prevents monoculture reasoning."""
    text = delta.description.lower()
    monoculture_signals = [
        "only valid", "only correct", "definitively", "absolutely certain",
        "no alternative", "single answer"
    ]
    if any(s in text for s in monoculture_signals):
        return MembraneVerdict.DEFER, "Potential monoculture reasoning — surface alternatives"
    return MembraneVerdict.ALLOW, "Pluralism respected"


def m4_human_primacy(delta: Delta, constitution: dict) -> tuple[MembraneVerdict, str]:
    """M4: Human primacy — escalate high-stakes irreversible decisions."""
    m4_config = constitution.get("membranes", {}).get("M4_human_primacy", {})
    if not m4_config.get("enabled", True):
        return MembraneVerdict.ALLOW, "M4 disabled"
    if not delta.reversible and delta.stage == "delta":
        return MembraneVerdict.DEFER, "Irreversible state change — escalating to human"
    return MembraneVerdict.ALLOW, "Autonomous action permitted"


def evaluate_membranes(
    delta: Delta,
    constitution: dict,
    governance_url: str = GOVERNANCE_URL,
) -> tuple[MembraneVerdict, dict[str, tuple[MembraneVerdict, str]]]:
    """
    Run all four membranes. Return aggregate verdict + per-membrane results.

    Tries the live Constitutional OS API first.
    Falls back to local evaluation.
    """
    # Try live API
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.post(
                f"{governance_url}/v1/check",
                json={
                    "agent_id": delta.agent_id,
                    "stage": delta.stage,
                    "payload": delta.to_dict(),
                    "session_id": delta.session_id,
                },
            )
            if resp.status_code == 200:
                return _parse_api_response(resp.json())
    except Exception:
        pass

    # Local evaluation
    return _local_evaluate(delta, constitution)


def _local_evaluate(
    delta: Delta,
    constitution: dict,
) -> tuple[MembraneVerdict, dict[str, tuple[MembraneVerdict, str]]]:
    results = {
        "M1_SAFETY": m1_safety(delta, constitution),
        "M2_REVERSIBILITY": m2_reversibility(delta, constitution),
        "M3_PLURALISM": m3_pluralism(delta, constitution),
        "M4_HUMAN_PRIMACY": m4_human_primacy(delta, constitution),
    }

    verdicts = [v for v, _ in results.values()]
    if MembraneVerdict.BLOCK in verdicts:
        aggregate = MembraneVerdict.BLOCK
    elif MembraneVerdict.DEFER in verdicts:
        aggregate = MembraneVerdict.DEFER
    else:
        aggregate = MembraneVerdict.ALLOW

    return aggregate, results


def _parse_api_response(
    data: dict,
) -> tuple[MembraneVerdict, dict[str, tuple[MembraneVerdict, str]]]:
    mapping = {
        "m1": "M1_SAFETY",
        "m2": "M2_REVERSIBILITY",
        "m3": "M3_PLURALISM",
        "m4": "M4_HUMAN_PRIMACY",
    }
    results = {}
    for api_key, membrane_key in mapping.items():
        md = data.get(api_key, {})
        passed = md.get("passed", True)
        escalate = md.get("requires_escalation", False)
        reason = md.get("reason", "API check")
        if not passed:
            verdict = MembraneVerdict.BLOCK
        elif escalate:
            verdict = MembraneVerdict.DEFER
        else:
            verdict = MembraneVerdict.ALLOW
        results[membrane_key] = (verdict, reason)

    verdicts = [v for v, _ in results.values()]
    if MembraneVerdict.BLOCK in verdicts:
        aggregate = MembraneVerdict.BLOCK
    elif MembraneVerdict.DEFER in verdicts:
        aggregate = MembraneVerdict.DEFER
    else:
        aggregate = MembraneVerdict.ALLOW

    return aggregate, results
