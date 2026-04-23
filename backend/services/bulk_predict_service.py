"""
AquaSense — Bulk Prediction Service
=====================================
Handles batch fish image classification with:
  - Filename-based disease hint extraction
  - Hybrid decision (hint vs model confidence)
  - Structured per-image result + batch summary

All model access is delegated to aquasense_service to avoid
reloading the Keras model — it must already be loaded at startup.
"""

from __future__ import annotations

import logging
import re
import unicodedata
from collections import Counter
from typing import Optional

import numpy as np

log = logging.getLogger("aquasense.bulk")

# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────

MAX_BATCH_SIZE = 30
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MODEL_CONFIDENCE_THRESHOLD = 0.70   # below this → filename_hint wins (if present)

# ── Keyword → canonical folder name mapping ──────────────────────────────────
# Each entry: (keyword_pattern, canonical_class_name)
# Listed most-specific first so regex alternation matches correctly.
_KEYWORD_MAP: list[tuple[str, str]] = [
    (r"aeromoniasis|aeromonas",             "Bacterial diseases - Aeromoniasis"),
    (r"gill",                               "Bacterial gill disease"),
    (r"red\s*dis",                          "Bacterial Red disease"),
    (r"saprolegni|fungal",                  "Fungal diseases Saprolegniasis"),
    (r"parasit",                            "Parasitic diseases"),
    (r"white\s*tail|whitetail|viral",       "Viral diseases White tail disease"),
    (r"healthy",                            "Healthy Fish"),
]

# Canonical folder name → clean display name (mirrors aquasense_service.py)
_DISPLAY_NAMES: dict[str, str] = {
    "Bacterial diseases - Aeromoniasis" : "Aeromoniasis",
    "Bacterial gill disease"            : "Gill Disease",
    "Bacterial Red disease"             : "Red Disease",
    "Fungal diseases Saprolegniasis"    : "Fungal (Saprolegniasis)",
    "Healthy Fish"                      : "Healthy",
    "Parasitic diseases"                : "Parasitic",
    "Viral diseases White tail disease" : "Viral (White Tail Disease)",
}

# Diseases that count as "infected" (not healthy, not uncertain)
_DISEASE_CLASSES = {
    "Aeromoniasis", "Gill Disease", "Red Disease",
    "Fungal (Saprolegniasis)", "Parasitic", "Viral (White Tail Disease)",
}


# ─────────────────────────────────────────────────────────────────────────────
# FILENAME INTELLIGENCE
# ─────────────────────────────────────────────────────────────────────────────

def _normalise_filename(name: str) -> str:
    """
    Strip extension, lowercase, remove accents, replace non-alpha with spaces.
    'Bacterial_Red (2).JPG' → 'bacterial red  2 '
    """
    # Remove extension
    stem = re.sub(r"\.[^.]+$", "", name)
    # NFKD normalise → remove accent characters
    nfkd = unicodedata.normalize("NFKD", stem)
    ascii_stem = nfkd.encode("ascii", "ignore").decode("ascii")
    # Lowercase, replace underscores/hyphens/dots with spaces
    cleaned = re.sub(r"[_\-\.]+", " ", ascii_stem.lower())
    # Remove remaining non-alphanumeric (except spaces)
    return re.sub(r"[^a-z0-9 ]", " ", cleaned)


def extract_filename_hint(filename: str) -> Optional[str]:
    """
    Parse a filename and return the display name of the matched disease,
    or None if no keyword is found.

    E.g. 'aeromoniasis_sample_001.jpg' → 'Aeromoniasis'
         'healthy_fish_01.png'         → 'Healthy'
         'IMG_20240101.jpg'            → None
    """
    normalised = _normalise_filename(filename)
    for pattern, canonical in _KEYWORD_MAP:
        if re.search(pattern, normalised):
            return _DISPLAY_NAMES.get(canonical, canonical)
    return None


# ─────────────────────────────────────────────────────────────────────────────
# SEVERITY HELPER (request-spec rules)
# ─────────────────────────────────────────────────────────────────────────────

def _severity_from_confidence(confidence: float, disease: str) -> str:
    """
    Spec rules:
      < 0.60 → low
      0.60–0.80 → moderate
      > 0.80 → high
    Healthy always returns low.
    """
    if disease in ("Healthy", "Uncertain"):
        return "low"
    pct = confidence * 100
    if pct < 60:
        return "low"
    if pct <= 80:
        return "moderate"
    return "high"


# ─────────────────────────────────────────────────────────────────────────────
# HYBRID DECISION LOGIC
# ─────────────────────────────────────────────────────────────────────────────

def _hybrid_decide(
    model_disease: str,
    model_confidence: float,
    filename_hint: Optional[str],
) -> tuple[str, float, str]:
    """
    Apply the hybrid decision rules and return (disease, confidence, source).

    Rules:
      1. No hint → model wins unconditionally
      2. Hint exists + model_confidence ≥ threshold → model wins
         (but if hint matches model → source = "model", else "hybrid")
      3. Hint exists + model_confidence < threshold → hint wins
    """
    if filename_hint is None:
        return model_disease, model_confidence, "model"

    if model_confidence >= MODEL_CONFIDENCE_THRESHOLD:
        # Model is confident enough to override the hint
        if filename_hint == model_disease:
            return model_disease, model_confidence, "model"
        else:
            # Both exist but differ — model wins due to confidence, mark hybrid
            return model_disease, model_confidence, "hybrid"
    else:
        # Model not confident — use the filename hint
        # Assign a pseudo-confidence (hint = 0.65, "borderline") so severity is moderate
        hint_confidence = 0.65
        if filename_hint == model_disease:
            return model_disease, model_confidence, "filename_hint"
        return filename_hint, hint_confidence, "filename_hint"


# ─────────────────────────────────────────────────────────────────────────────
# PER-IMAGE CLASSIFICATION
# ─────────────────────────────────────────────────────────────────────────────

def _classify_single(
    image_bytes: bytes,
    fish_id: str,
    filename_hint: Optional[str],
) -> dict:
    """
    Run model inference on one image and apply hybrid decision.
    Returns the structured per-image result dict.
    """
    # Import here to avoid circular import — aquasense_service is loaded at startup
    from services.aquasense_service import predict as aq_predict

    raw_result = aq_predict(image_bytes)

    model_disease    = raw_result.get("disease", "Uncertain")
    model_confidence = float(raw_result.get("confidence", 0.0))

    disease, confidence, source = _hybrid_decide(
        model_disease, model_confidence, filename_hint
    )

    severity = _severity_from_confidence(confidence, disease)

    return {
        "id"          : fish_id,
        "disease"     : disease,
        "confidence"  : round(confidence, 4),
        "severity"    : severity,
        "source"      : source,
        # Optionally include model top-2 for transparency
        "top_predictions": raw_result.get("top_predictions", []),
        "filename_hint"  : filename_hint,
    }


# ─────────────────────────────────────────────────────────────────────────────
# BATCH SUMMARY
# ─────────────────────────────────────────────────────────────────────────────

def _build_summary(results: list[dict]) -> dict:
    """
    Aggregate per-image results into a dashboard-ready summary object.
    """
    total        = len(results)
    healthy_ct   = sum(1 for r in results if r["disease"] == "Healthy")
    uncertain_ct = sum(1 for r in results if r["disease"] == "Uncertain")
    infected_ct  = total - healthy_ct - uncertain_ct
    high_risk_ct = sum(1 for r in results if r["severity"] == "high")

    # Most common disease (excluding Healthy / Uncertain)
    disease_counts = Counter(
        r["disease"] for r in results
        if r["disease"] not in ("Healthy", "Uncertain")
    )
    most_common = disease_counts.most_common(1)
    most_common_disease = most_common[0][0] if most_common else None

    # Average confidence across all images
    avg_confidence = (
        round(float(np.mean([r["confidence"] for r in results])), 4)
        if results else 0.0
    )

    # Source breakdown
    source_breakdown = dict(Counter(r["source"] for r in results))

    return {
        "total_images"       : total,
        "infected_count"     : infected_ct,
        "healthy_count"      : healthy_ct,
        "uncertain_count"    : uncertain_ct,
        "high_risk_count"    : high_risk_ct,
        "most_common_disease": most_common_disease,
        "average_confidence" : avg_confidence,
        "source_breakdown"   : source_breakdown,
        "disease_distribution": dict(disease_counts),
    }


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

def process_batch(
    files: list[tuple[str, bytes]],   # [(original_filename, raw_bytes), ...]
) -> dict:
    """
    Process a batch of (filename, image_bytes) tuples.

    Returns:
        {
            "results" : [ per_image_result, ... ],
            "summary" : { batch_summary },
            "errors"  : [ { "id": ..., "reason": ... }, ... ],
        }

    Validation (done before this is called in the route, but also checked here):
      - Skips entries where image_bytes is empty
      - Returns error entry if prediction throws
    """
    results: list[dict] = []
    errors:  list[dict] = []

    for seq, (filename, image_bytes) in enumerate(files, start=1):
        fish_id = f"Fish {seq}"

        if not image_bytes:
            log.warning("[Bulk] %s is empty — skipping.", filename)
            errors.append({"id": fish_id, "filename": filename, "reason": "Empty file"})
            continue

        filename_hint = extract_filename_hint(filename)
        log.info("[Bulk] %s → hint=%s", filename, filename_hint or "none")

        try:
            result = _classify_single(image_bytes, fish_id, filename_hint)
            results.append(result)
        except Exception as exc:
            log.error("[Bulk] Error processing %s: %s", filename, exc, exc_info=True)
            errors.append({"id": fish_id, "filename": filename, "reason": str(exc)})

    if not results and errors:
        # Nothing succeeded at all — caller should raise HTTP 422
        return {"results": [], "summary": {}, "errors": errors}

    summary = _build_summary(results)
    return {"results": results, "summary": summary, "errors": errors}
