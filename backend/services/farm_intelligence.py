"""
AquaSense — Farm Intelligence Engine
=====================================
Pure computation layer: derives health score, risk level, trend analysis,
and smart insights from real scan session data.

No ML. No I/O. No mock data.
All functions are pure and stateless — call with real results/sessions.

Schema reference:
  results  = [ { disease, confidence, severity, id }, ... ]   ← from /bulk-predict or /predict
  sessions = [ { timestamp, results, summary }, ... ]          ← chronological session snapshots
"""

from __future__ import annotations

from collections import Counter
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
# DISEASE CATEGORY HELPERS
# ─────────────────────────────────────────────────────────────────────────────

_FUNGAL_DISEASES  = {"fungal (saprolegniasis)", "fungal", "saprolegniasis"}
_VIRAL_DISEASES   = {"viral (white tail disease)", "viral", "white tail disease"}
_BACTERIAL        = {"aeromoniasis", "red disease", "gill disease", "gill"}
_PARASITIC        = {"parasitic"}
_HEALTHY_LABELS   = {"healthy", "uncertain"}


def _is_healthy(disease: str) -> bool:
    return disease.strip().lower() in _HEALTHY_LABELS


def _disease_category(disease: str) -> str:
    """Return broad category for a disease label."""
    d = disease.strip().lower()
    if d in _FUNGAL_DISEASES:  return "Fungal"
    if d in _VIRAL_DISEASES:   return "Viral"
    if d in _BACTERIAL:        return "Bacterial"
    if d in _PARASITIC:        return "Parasitic"
    if d in _HEALTHY_LABELS:   return "Healthy"
    return "Unknown"


# ─────────────────────────────────────────────────────────────────────────────
# 1. FARM HEALTH SCORE  (0–100)
# ─────────────────────────────────────────────────────────────────────────────

def compute_health_score(results: list[dict]) -> dict:
    """
    Compute a 0–100 health score from a list of fish scan results.

    Deductions:
      - infected_ratio  × 50   (biggest driver)
      - high_severity   × 10 per fish
      - multiple disease types × 5 per extra type (max 15)
    Clamp to [0, 100].

    Returns: { score: int, label: "Good"|"Moderate"|"Critical" }
    """
    if not results:
        return {"score": 100, "label": "Good"}

    total       = len(results)
    infected    = [r for r in results if not _is_healthy(r.get("disease", ""))]
    infected_ct = len(infected)
    high_sev_ct = sum(1 for r in infected if r.get("severity", "").lower() == "high")

    # Disease type diversity penalty
    disease_types = {_disease_category(r.get("disease", "")) for r in infected}
    disease_types.discard("Healthy")
    disease_types.discard("Unknown")
    extra_types = max(0, len(disease_types) - 1)

    score = 100
    score -= round((infected_ct / total) * 50)     # infection ratio penalty
    score -= high_sev_ct * 10                        # high severity penalty
    score -= min(extra_types * 5, 15)                # diversity penalty (cap 15)

    score = max(0, min(100, score))

    if score >= 70:
        label = "Good"
    elif score >= 40:
        label = "Moderate"
    else:
        label = "Critical"

    return {"score": score, "label": label}


# ─────────────────────────────────────────────────────────────────────────────
# 2. RISK LEVEL  (low / medium / high)
# ─────────────────────────────────────────────────────────────────────────────

def compute_risk_level(results: list[dict]) -> dict:
    """
    Compute farm risk level from current scan results.

    Rules:
      high   → any fish has high severity  OR  infection_rate > 60%
      medium → any moderate severity       OR  infection_rate > 25%
      low    → otherwise

    Returns: { level: str, explanation: str }
    """
    if not results:
        return {"level": "low", "explanation": "No scan data available yet."}

    total         = len(results)
    infected      = [r for r in results if not _is_healthy(r.get("disease", ""))]
    infected_ct   = len(infected)
    infection_pct = (infected_ct / total) * 100

    severities    = [r.get("severity", "low").lower() for r in infected]
    has_high      = "high" in severities
    has_moderate  = "moderate" in severities

    if has_high or infection_pct > 60:
        return {
            "level": "high",
            "explanation": (
                f"{infected_ct} of {total} fish infected"
                + (" with high-severity disease" if has_high else "")
                + ". Immediate intervention required."
            ),
        }
    if has_moderate or infection_pct > 25:
        return {
            "level": "medium",
            "explanation": (
                f"{infected_ct} of {total} fish show signs of disease. "
                "Monitor closely and begin treatment."
            ),
        }
    return {
        "level": "low",
        "explanation": (
            f"{infected_ct} of {total} fish affected. "
            "Farm is mostly healthy — keep monitoring."
        ) if infected_ct > 0 else "All scanned fish appear healthy.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. TREND ANALYSIS  (increasing / stable / decreasing)
# ─────────────────────────────────────────────────────────────────────────────

def compute_trend(sessions: list[dict]) -> dict:
    """
    Compare the last 2–3 sessions to compute infection trend.

    Each session: { timestamp, results: [...], summary: {...} }

    Returns:
      {
        trend: "increasing" | "stable" | "decreasing",
        infection_rates: [float, ...],   ← per-session rates (newest last)
        avg_confidence_trend: float,     ← delta in avg confidence
        most_common_disease_over_time: str,
      }
    """
    if len(sessions) < 2:
        return {
            "trend": "stable",
            "infection_rates": [],
            "avg_confidence_trend": 0.0,
            "most_common_disease_over_time": None,
        }

    # Use last 3 sessions at most (chronological order: oldest → newest)
    recent = sessions[-3:]

    rates   = []
    conf_avgs = []
    all_diseases: list[str] = []

    for sess in recent:
        res = sess.get("results", [])
        if not res:
            continue
        total      = len(res)
        infected   = sum(1 for r in res if not _is_healthy(r.get("disease", "")))
        rate       = round(infected / total, 3) if total else 0.0
        avg_conf   = sum(r.get("confidence", 0) for r in res) / total if total else 0.0
        rates.append(rate)
        conf_avgs.append(avg_conf)
        all_diseases += [r.get("disease", "") for r in res if not _is_healthy(r.get("disease", ""))]

    # Determine trend from last two rate points
    trend = "stable"
    if len(rates) >= 2:
        delta = rates[-1] - rates[-2]
        if delta > 0.08:    trend = "increasing"
        elif delta < -0.08: trend = "decreasing"
        # else stable

    # Avg confidence delta (last vs second-to-last session)
    conf_delta = 0.0
    if len(conf_avgs) >= 2:
        conf_delta = round(conf_avgs[-1] - conf_avgs[-2], 3)

    # Most common disease across all sessions
    disease_counts = Counter(d for d in all_diseases if d)
    top_disease = disease_counts.most_common(1)[0][0] if disease_counts else None

    return {
        "trend": trend,
        "infection_rates": rates,
        "avg_confidence_trend": conf_delta,
        "most_common_disease_over_time": top_disease,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. SMART INSIGHTS  (max 3, actionable)
# ─────────────────────────────────────────────────────────────────────────────

def generate_insights(
    sessions: list[dict],
    current_results: Optional[list[dict]] = None,
) -> list[str]:
    """
    Generate 2–3 short, actionable insight strings from session history
    and the most recent scan results.

    Rules: no redundancy, most critical first, max 3.
    """
    insights: list[str] = []
    current = current_results or []

    # ── Trend-based ──────────────────────────────────────────────────────────
    if len(sessions) >= 2:
        trend_data = compute_trend(sessions)
        trend      = trend_data["trend"]
        top_dis    = trend_data.get("most_common_disease_over_time")
        rates      = trend_data.get("infection_rates", [])

        if trend == "increasing":
            msg = "⚠️ Infection rate is increasing across recent scans"
            if top_dis:
                msg += f" — {top_dis} is the dominant condition"
            insights.append(msg + ".")
        elif trend == "decreasing":
            insights.append("✅ Healthy ratio improving — treatment appears to be working.")
        # stable → no insight (not actionable)

        if trend_data.get("avg_confidence_trend", 0) < -0.10:
            insights.append("📉 Model confidence dropping — consider rescanning in better lighting.")

    # ── Current scan severity ─────────────────────────────────────────────────
    if current:
        high_sev = [r for r in current if r.get("severity", "").lower() == "high"]
        if high_sev:
            insights.append(
                f"🚨 High severity detected in {len(high_sev)} fish — immediate action required."
            )

        # Multiple disease types
        disease_types = {
            _disease_category(r.get("disease", ""))
            for r in current
            if not _is_healthy(r.get("disease", ""))
        }
        disease_types.discard("Unknown")
        if len(disease_types) > 1:
            insights.append(
                f"🔬 Multiple disease types detected ({', '.join(sorted(disease_types))}) "
                "— isolate ponds to prevent cross-contamination."
            )

        # All healthy
        all_healthy = all(_is_healthy(r.get("disease", "")) for r in current)
        if all_healthy and len(current) >= 3:
            insights.append("✅ All scanned fish appear healthy — farm conditions look good.")

    # ── Fallback if nothing generated ─────────────────────────────────────────
    if not insights and sessions:
        insights.append("🐟 Scan more fish batches to unlock trend analysis and deeper insights.")

    # Deduplicate and cap at 3
    seen: set[str] = set()
    final: list[str] = []
    for ins in insights:
        if ins not in seen:
            seen.add(ins)
            final.append(ins)
        if len(final) == 3:
            break

    return final


# ─────────────────────────────────────────────────────────────────────────────
# 5. PREVENTION RECOMMENDATIONS
# ─────────────────────────────────────────────────────────────────────────────

_PREVENTION_KB: dict[str, dict] = {
    "Aeromoniasis": {
        "water_quality":  [
            "Maintain pH between 7.0–8.0",
            "Keep dissolved oxygen above 5 mg/L",
            "Change 25–30% water every 3 days during outbreak",
        ],
        "feeding":        [
            "Reduce feed by 50% during treatment period",
            "Add Vitamin C (100 mg/kg feed) daily to boost immunity",
            "Remove uneaten feed within 15 minutes",
        ],
        "hygiene":        [
            "Disinfect all nets and tools with 10% chlorine solution",
            "Quarantine new fish for 2 weeks before introducing to ponds",
            "Dispose of dead fish by deep burial — never into rivers",
        ],
    },
    "Gill Disease": {
        "water_quality":  [
            "Test ammonia and nitrite daily — keep near zero",
            "Increase aeration — add extra aerators if possible",
            "Reduce stocking density to lower stress",
        ],
        "feeding":        [
            "Feed only high-quality, pathogen-free pellets",
            "Avoid overfeeding — reduces organic load in water",
        ],
        "hygiene":        [
            "Clean pond bottoms to remove decomposing organic matter",
            "Avoid sharing equipment between ponds",
        ],
    },
    "Red Disease": {
        "water_quality":  [
            "Keep water temperature stable — avoid sudden drops",
            "Reduce stocking density to lower injury risk",
        ],
        "feeding":        [
            "Supplement feed with Vitamin E (100 mg/kg) for immunity",
            "Cut feeding rate in half during active outbreak",
        ],
        "hygiene":        [
            "Disinfect pond tools between uses",
            "Remove dead and dying fish immediately",
        ],
    },
    "Fungal": {
        "water_quality":  [
            "Keep water clean and well-oxygenated",
            "Reduce organic debris — fungus thrives in dirty water",
            "Use salt bath (1–3 g/L NaCl) as a mild antifungal preventive",
        ],
        "feeding":        [
            "Avoid overfeeding — excess feed promotes fungal growth",
            "Ensure feed is dry and mould-free before use",
        ],
        "hygiene":        [
            "Remove injured or dead fish immediately — fungus spreads from wounds",
            "Disinfect nets and tanks after handling infected fish",
        ],
    },
    "Parasitic": {
        "water_quality":  [
            "Maintain clean water — parasites thrive in poor conditions",
            "Formalin bath (25–50 ppm for 30 min) can reduce ectoparasites",
        ],
        "feeding":        [
            "Ensure balanced nutrition to maintain fish immune defence",
        ],
        "hygiene":        [
            "Quarantine new fish strictly — parasites often enter via new stock",
            "Do not share nets between ponds during active infestation",
        ],
    },
    "Viral": {
        "water_quality":  [
            "No medication works — focus entirely on water quality and biosecurity",
            "Maximise aeration and reduce stocking density",
        ],
        "feeding":        [
            "Add Vitamin C and probiotics to feed to support immunity",
            "Reduce feeding — sick fish will not eat effectively",
        ],
        "hygiene":        [
            "Strictly quarantine affected ponds — stop all water flow in/out",
            "Disinfect all equipment with UV or 5% chlorine before use",
            "Never move fish from infected ponds to healthy ones",
        ],
    },
    "Healthy": {
        "water_quality":  [
            "Test pH (7.0–8.5), ammonia, and dissolved oxygen weekly",
            "Perform 20% water change every week as routine maintenance",
        ],
        "feeding":        [
            "Feed 2–3% of bodyweight daily at consistent times",
            "Mix probiotics into feed monthly for gut health",
        ],
        "hygiene":        [
            "Keep pond banks clean and free of vegetation",
            "Record a daily health log — note any unusual behaviour",
        ],
    },
}

_DISEASE_NORM: dict[str, str] = {
    "aeromoniasis":               "Aeromoniasis",
    "gill disease":               "Gill Disease",
    "gill":                       "Gill Disease",
    "red disease":                "Red Disease",
    "fungal (saprolegniasis)":   "Fungal",
    "fungal":                     "Fungal",
    "saprolegniasis":             "Fungal",
    "parasitic":                  "Parasitic",
    "viral (white tail disease)": "Viral",
    "viral":                      "Viral",
    "white tail disease":         "Viral",
    "healthy":                    "Healthy",
    "uncertain":                  "Healthy",
}


def get_prevention_recs(dominant_disease: Optional[str]) -> dict:
    """
    Return structured prevention recommendations for the dominant disease.

    Returns:
      {
        "disease":       str,
        "water_quality": [str, ...],
        "feeding":       [str, ...],
        "hygiene":       [str, ...],
      }
    """
    if not dominant_disease:
        dominant_disease = "Healthy"

    key = _DISEASE_NORM.get(dominant_disease.strip().lower(), "Healthy")
    recs = _PREVENTION_KB.get(key, _PREVENTION_KB["Healthy"])

    return {
        "disease":       key,
        "water_quality": recs.get("water_quality", []),
        "feeding":       recs.get("feeding", []),
        "hygiene":       recs.get("hygiene", []),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 6. AGGREGATE ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

def compute_farm_insights(
    current_results: list[dict],
    sessions: list[dict],
) -> dict:
    """
    Master function: compute all intelligence from real scan data.

    Args:
        current_results: most recent scan batch results
        sessions:        list of past session snapshots (oldest first)

    Returns:
        {
          health_score:   { score, label },
          risk_level:     { level, explanation },
          trend:          { trend, infection_rates, avg_confidence_trend,
                            most_common_disease_over_time },
          insights:       [str, ...],
          dominant_disease: str | None,
          prevention_recs:  { disease, water_quality, feeding, hygiene },
        }
    """
    health  = compute_health_score(current_results)
    risk    = compute_risk_level(current_results)
    trend   = compute_trend(sessions)
    insights = generate_insights(sessions, current_results)

    # Dominant disease from current scan
    disease_counts = Counter(
        r.get("disease", "")
        for r in current_results
        if not _is_healthy(r.get("disease", ""))
    )
    dominant = (
        disease_counts.most_common(1)[0][0]
        if disease_counts
        else trend.get("most_common_disease_over_time")
    )

    prevention = get_prevention_recs(dominant)

    return {
        "health_score":     health,
        "risk_level":       risk,
        "trend":            trend,
        "insights":         insights,
        "dominant_disease": dominant,
        "prevention_recs":  prevention,
    }
