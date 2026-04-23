"""
AquaSense — Treatment & Prevention Engine
==========================================
Converts /predict and /bulk-predict results → actionable treatment plans.

Architecture:
  - Pure transformation layer (no ML, no I/O)
  - Reads treatment knowledge from treatment-mapping.json at startup (cached)
  - Adapts actions by severity (low/moderate/high) per severity-logic.md
  - Generates both per-fish plans AND farm-level aggregate plan
"""

from __future__ import annotations

import json
import logging
import os
from collections import Counter
from typing import Optional

log = logging.getLogger("aquasense.treatment")

# ─────────────────────────────────────────────────────────────────────────────
# LOAD KNOWLEDGE BASE (once at import time)
# ─────────────────────────────────────────────────────────────────────────────

_KB_PATH = os.path.join(
    os.path.dirname(__file__),        # backend/services/
    "..", "..", "ai",                  # → project root / ai /
    "treatment-mapping.json",
)
_KB_PATH = os.path.normpath(_KB_PATH)

def _load_kb() -> dict:
    try:
        with open(_KB_PATH, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        log.error("treatment-mapping.json not found at %s", _KB_PATH)
        return {}

_KB: dict = _load_kb()

# ─────────────────────────────────────────────────────────────────────────────
# DISEASE KEY NORMALISATION
# Maps frontend display names → JSON keys in treatment-mapping.json
# ─────────────────────────────────────────────────────────────────────────────

_DISEASE_KEY_MAP: dict[str, str] = {
    "aeromoniasis"               : "Aeromoniasis",
    "gill disease"               : "Gill disease",
    "gill"                       : "Gill disease",
    "red disease"                : "Red disease",
    "fungal (saprolegniasis)"    : "Fungal",
    "fungal"                     : "Fungal",
    "saprolegniasis"             : "Fungal",
    "parasitic"                  : "Parasitic",
    "viral (white tail disease)" : "Viral",
    "viral"                      : "Viral",
    "white tail disease"         : "Viral",
    "healthy"                    : "Healthy",
    "uncertain"                  : "Healthy",   # uncertain → safe/healthy plan
}

def _kb_key(disease: str) -> str:
    """Return the treatment-mapping.json key for a display disease name."""
    return _DISEASE_KEY_MAP.get(disease.lower().strip(), "Healthy")


# ─────────────────────────────────────────────────────────────────────────────
# SEVERITY MAPPING  (matches severity-logic.md)
# ─────────────────────────────────────────────────────────────────────────────

# "severity" field from bulk/predict endpoints → kb severity_actions key
_SEV_KEY: dict[str, str] = {
    "low"     : "mild",
    "moderate": "moderate",
    "high"    : "severe",
}


# ─────────────────────────────────────────────────────────────────────────────
# MEDICATION STRUCTURING
# ─────────────────────────────────────────────────────────────────────────────

def _structure_meds(steps: list[str]) -> list[dict]:
    """
    Convert raw medication bullet strings → structured {name, usage, notes}.
    Parses the first key term as 'name', the rest as 'usage'.
    """
    structured = []
    for step in steps:
        if not step.strip():
            continue
        # Try to extract a chemical name (text before first dash/colon/bracket)
        parts = step.split("—") if "—" in step else step.split(" — ")
        if len(parts) >= 2:
            name  = parts[0].strip()
            usage = " — ".join(parts[1:]).strip()
        else:
            # First meaningful phrase becomes the name
            words = step.split()
            name  = " ".join(words[:3]) if len(words) >= 3 else step
            usage = step
        structured.append({
            "name" : name,
            "usage": usage,
            "notes": "",   # reserved for future vet/lab notes
        })
    return structured


# ─────────────────────────────────────────────────────────────────────────────
# PER-FISH PLAN BUILDER
# ─────────────────────────────────────────────────────────────────────────────

def _build_per_fish_plan(fish: dict) -> dict:
    """
    Build an action plan for a single fish result dict.

    Input fish dict expected keys:
        id, disease, confidence (float 0-1), severity (low/moderate/high)
    """
    fish_id    = fish.get("id", "Fish ?")
    disease    = fish.get("disease", "Uncertain")
    confidence = float(fish.get("confidence", 0.0))
    severity   = fish.get("severity", "low")

    key     = _kb_key(disease)
    kb_data = _KB.get(key, _KB.get("Healthy", {}))
    sev_key = _SEV_KEY.get(severity, "mild")

    # ── Immediate actions ─────────────────────────────────────────────────────
    base_immediate: list[str] = kb_data.get("immediate_action", [])[:4]

    # Uncertainty warning if confidence < 0.60
    if confidence < 0.60 and disease not in ("Healthy",):
        base_immediate = [
            "⚠️ Confidence is low — verify visually before starting treatment",
        ] + base_immediate[:3]

    # ── Treatment (severity-adapted) ──────────────────────────────────────────
    sev_action_raw: str = (
        kb_data.get("severity_actions", {}).get(sev_key, "")
    )
    # Severity-specific action becomes first bullet; add medication steps
    treatment_bullets: list[str] = []
    if sev_action_raw:
        treatment_bullets.append(sev_action_raw)
    treatment_bullets += kb_data.get("medication_steps", [])[:3]

    # Special case: Viral — no medication exists
    if key == "Viral":
        treatment_bullets = [
            "❌ No antiviral medication exists — antibiotics will not help",
            "Add Vitamin C (100 mg/kg feed) to boost fish immunity",
            "Use probiotics in water to support gut health",
            "Focus 100% on stopping spread to other ponds",
        ]

    # Special case: Healthy — prevention only
    if key == "Healthy":
        treatment_bullets = []

    # ── Structured medications ────────────────────────────────────────────────
    medication_steps  = kb_data.get("medication_steps", [])
    structured_meds   = _structure_meds(medication_steps) if key not in ("Viral", "Healthy") else []

    # ── Care tips ─────────────────────────────────────────────────────────────
    care_tips: list[str] = []
    feeding = kb_data.get("feeding_advice", "")
    water   = kb_data.get("water_management", "")
    if feeding: care_tips.append(feeding)
    if water:   care_tips.append(water)
    care_tips += kb_data.get("farm_improvement", [])[:2]

    # ── Follow-up ─────────────────────────────────────────────────────────────
    follow_up: list[str] = kb_data.get("followup", [])[:3]

    return {
        "id"          : fish_id,
        "disease"     : disease,
        "severity"    : severity,
        "spread_risk" : kb_data.get("spread_risk", "low"),
        "spread_note" : kb_data.get("spread_explanation", ""),
        "action_plan" : {
            "immediate"  : base_immediate[:4],
            "treatment"  : treatment_bullets[:4],
            "medications": structured_meds,
            "care_tips"  : care_tips[:4],
            "follow_up"  : follow_up,
        },
        # Low-confidence flag for UI to surface a re-scan nudge
        "verify_first": confidence < 0.60 and disease not in ("Healthy",),
    }


# ─────────────────────────────────────────────────────────────────────────────
# FARM-LEVEL PLAN BUILDER
# ─────────────────────────────────────────────────────────────────────────────

_SPREAD_PRIORITY = {"high": 3, "medium": 2, "low": 1}


def _farm_risk_level(results: list[dict]) -> str:
    """
    high   → any fish has high severity
    medium → any moderate severity OR multiple diseases
    low    → all healthy/low
    """
    severities = [r.get("severity", "low") for r in results]
    if "high" in severities:
        return "high"
    diseases = {r.get("disease") for r in results if r.get("disease") != "Healthy"}
    if "moderate" in severities or len(diseases) > 1:
        return "medium"
    return "low"


def _build_farm_plan(results: list[dict]) -> dict:
    """
    Aggregate all fish results into a farm-level management plan.
    """
    total          = len(results)
    healthy_ct     = sum(1 for r in results if r.get("disease") == "Healthy")
    infected_ct    = total - healthy_ct
    uncertain_ct   = sum(1 for r in results if r.get("disease") == "Uncertain")

    disease_counts = Counter(
        r["disease"] for r in results
        if r.get("disease") not in ("Healthy", "Uncertain")
    )
    dominant       = disease_counts.most_common(1)[0][0] if disease_counts else None
    severities     = [r.get("severity", "low") for r in results]
    max_severity   = (
        "high"     if "high"     in severities else
        "moderate" if "moderate" in severities else
        "low"
    )

    risk_level = _farm_risk_level(results)

    # ── Summary sentence ──────────────────────────────────────────────────────
    if infected_ct == 0:
        summary = (
            "Your farm looks healthy. No disease detected. "
            "Keep up your current routine."
        )
    elif infected_ct == total:
        summary = (
            f"All {total} scanned fish show signs of disease. "
            f"Dominant condition: {dominant}. Immediate farm-wide action required."
        )
    else:
        summary = (
            f"{infected_ct} of {total} fish show disease signs "
            f"({dominant or 'various conditions'}). "
            f"Isolate affected fish and treat promptly."
        )

    # ── Immediate farm actions ────────────────────────────────────────────────
    immediate: list[str] = []
    if infected_ct > 0:
        immediate.append(f"Separate all {infected_ct} visibly sick fish from healthy stock now")
    if "high" in severities:
        immediate.append("Quarantine the affected pond — stop all water flow in/out")
    if len(disease_counts) > 1:
        immediate.append(
            "Multiple diseases detected — do NOT move nets or tools between ponds"
        )
    if dominant:
        dom_kb = _KB.get(_kb_key(dominant), {})
        for a in dom_kb.get("immediate_action", [])[:2]:
            if a not in immediate:
                immediate.append(a)
    if healthy_ct > 0:
        immediate.append(f"Keep the {healthy_ct} healthy fish in a separate clean pond during treatment")
    immediate = immediate[:5]

    # ── Water management ──────────────────────────────────────────────────────
    water_mgmt: list[str] = []
    if dominant:
        dom_kb   = _KB.get(_kb_key(dominant), {})
        wm_str   = dom_kb.get("water_management", "")
        if wm_str:
            water_mgmt.append(wm_str)
    water_mgmt += [
        "Test pH, ammonia, dissolved oxygen every 48 hours",
        "Do a 25-30% water change every 3 days during outbreak",
        "Maintain dissolved oxygen above 5 mg/L at all times",
    ]
    water_mgmt = water_mgmt[:4]

    # ── Medication strategy ───────────────────────────────────────────────────
    med_strategy: list[str] = []
    for disease in disease_counts:
        kb = _KB.get(_kb_key(disease), {})
        for step in kb.get("medication_steps", [])[:2]:
            if step not in med_strategy:
                med_strategy.append(step)
    if not med_strategy and infected_ct > 0:
        med_strategy.append("Consult a local vet for species-specific medication advice")
    # Add viral warning if present
    if any(_kb_key(r.get("disease","")) == "Viral" for r in results):
        med_strategy.insert(0, "❌ Viral infection detected — antibiotics will NOT help. Focus on biosecurity.")
    med_strategy = med_strategy[:4]

    # ── Biosecurity ───────────────────────────────────────────────────────────
    biosecurity: list[str] = [
        "Disinfect all nets, buckets, and tools with 10% chlorine before moving between ponds",
        "Wear clean boots when entering each pond area — wash between ponds",
        "Do not add new fish without a 2-week isolation period in a separate tank",
        "Dispose of dead fish by deep burial or incineration — never into rivers",
    ]

    # ── Feeding adjustments ───────────────────────────────────────────────────
    feeding: list[str] = []
    if dominant:
        dom_kb = _KB.get(_kb_key(dominant), {})
        fa     = dom_kb.get("feeding_advice", "")
        if fa:
            feeding.append(fa)
    if not feeding:
        feeding.append("Reduce feeding by half during active disease outbreak")
    feeding += [
        "Mix Vitamin C (100 mg/kg feed) into daily feed to boost immunity",
        "Remove uneaten feed within 15 minutes to prevent water quality decline",
    ]
    feeding = feeding[:3]

    # ── Monitoring plan ───────────────────────────────────────────────────────
    monitoring: list[str] = [
        "Re-scan all affected fish after 48 hours of treatment",
        "Check fish behaviour twice daily — look for surface gasping or lethargy",
        "Keep a health log: record daily mortality count, treatment given, and water readings",
    ]
    if dominant:
        dom_kb = _KB.get(_kb_key(dominant), {})
        for fu in dom_kb.get("followup", [])[:2]:
            if fu not in monitoring:
                monitoring.append(fu)
    monitoring = monitoring[:4]

    # ── Spread risk for farm ──────────────────────────────────────────────────
    # Worst spread risk across all diseases present
    spread_risks = [
        _KB.get(_kb_key(r.get("disease", "")), {}).get("spread_risk", "low")
        for r in results
    ]
    farm_spread  = max(spread_risks, key=lambda s: _SPREAD_PRIORITY.get(s, 0))

    return {
        "risk_level"          : risk_level,
        "summary"             : summary,
        "total_scanned"       : total,
        "infected_count"      : infected_ct,
        "healthy_count"       : healthy_ct,
        "uncertain_count"     : uncertain_ct,
        "dominant_disease"    : dominant,
        "disease_distribution": dict(disease_counts),
        "max_severity_present": max_severity,
        "spread_risk"         : farm_spread,
        "immediate_actions"   : immediate,
        "water_management"    : water_mgmt,
        "medication_strategy" : med_strategy,
        "biosecurity"         : biosecurity,
        "feeding_adjustments" : feeding,
        "monitoring_plan"     : monitoring,
    }


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

def generate_treatment_plan(results: list[dict]) -> dict:
    """
    Main entry point.

    Args:
        results: list of fish result dicts from /predict or /bulk-predict.
                 Each must have: id, disease, confidence, severity.

    Returns:
        {
            "per_fish" : [ per_fish_plan, ... ],
            "farm_plan": { farm_level_plan },
        }
    """
    if not results:
        return {
            "per_fish" : [],
            "farm_plan": {
                "risk_level" : "low",
                "summary"    : "No fish results provided.",
                "immediate_actions": [],
                "water_management" : [],
                "medication_strategy": [],
                "biosecurity"      : [],
                "feeding_adjustments": [],
                "monitoring_plan"  : [],
            },
        }

    per_fish  = [_build_per_fish_plan(r) for r in results]
    farm_plan = _build_farm_plan(results)

    return {
        "per_fish" : per_fish,
        "farm_plan": farm_plan,
    }
