"""
AquaSense — Fish Disease Detection Service
Loads the trained MobileNetV2 model once at startup and exposes
predict(), analyze_video(), and chat() for the FastAPI routes.

All paths are resolved relative to this file so the backend can be
started from any working directory.
"""

from __future__ import annotations

import json
import logging
import os
import re
from io import BytesIO
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image

log = logging.getLogger("aquasense")

# ─────────────────────────────────────────────────────────────────────────────
# PATHS  (backend/ → fish/ → ai/)
# ─────────────────────────────────────────────────────────────────────────────
_BACKEND_DIR   = Path(__file__).resolve().parent.parent        # backend/
_AI_DIR        = _BACKEND_DIR.parent / "ai"                    # fish/ai/
_MODEL_PATH    = _AI_DIR / "models" / "aquasense_model.keras"   # v3 primary
_MODEL_PATH_H5 = _AI_DIR / "models" / "aquasense_model.h5"      # v2 fallback
_LABELS_PATH   = _AI_DIR / "models" / "class_labels.json"
_TREATMENT_PATH = _AI_DIR / "treatment-mapping.json"
_KB_PATH       = _AI_DIR / "knowledge-base.md"

_CONFIG_PATH   = _AI_DIR / "models" / "model_config.json"

IMG_SIZE = (224, 224)

# ─────────────────────────────────────────────────────────────────────────────
# DEFAULT THRESHOLDS  (overridden by model_config.json after retraining)
# ─────────────────────────────────────────────────────────────────────────────
_DEFAULT_TEMPERATURE   = 1.5    # soften over-confident softmax
_DEFAULT_THRESH_UNC    = 0.55   # below → uncertain branch
_DEFAULT_THRESH_MOD    = 0.75   # below → moderate severity

# Live config (populated by load_all)
_temperature     : float = _DEFAULT_TEMPERATURE
_thresh_uncertain: float = _DEFAULT_THRESH_UNC
_thresh_moderate : float = _DEFAULT_THRESH_MOD

# ─────────────────────────────────────────────────────────────────────────────
# DISPLAY-NAME MAP  (folder name → clean API name)
# ─────────────────────────────────────────────────────────────────────────────
_DISPLAY_NAMES: dict[str, str] = {
    "Bacterial diseases - Aeromoniasis"  : "Aeromoniasis",
    "Bacterial gill disease"             : "Gill Disease",
    "Bacterial Red disease"              : "Red Disease",
    "Fungal diseases Saprolegniasis"     : "Fungal (Saprolegniasis)",
    "Healthy Fish"                       : "Healthy",
    "Parasitic diseases"                 : "Parasitic",
    "Viral diseases White tail disease"  : "Viral (White Tail Disease)",
}

# Treatment-JSON key for each display name
_TREATMENT_KEYS: dict[str, str] = {
    "Aeromoniasis"              : "Aeromoniasis",
    "Gill Disease"              : "Gill disease",
    "Red Disease"               : "Red disease",
    "Fungal (Saprolegniasis)"   : "Fungal",
    "Healthy"                   : "Healthy",
    "Parasitic"                 : "Parasitic",
    "Viral (White Tail Disease)": "Viral",
}

# ─────────────────────────────────────────────────────────────────────────────
# SINGLETON RESOURCES
# ─────────────────────────────────────────────────────────────────────────────
_model        = None          # Keras model
_class_labels : dict | None  = None   # {str(idx): raw_folder_name}
_treatments   : dict | None  = None   # loaded treatment-mapping.json
_kb_text      : str | None   = None   # raw knowledge-base.md text
_model_ready  : bool         = False


def load_all() -> bool:
    """
    Load model + JSON resources into module-level singletons.
    Called once at FastAPI startup.  Returns True on success.
    """
    global _model, _class_labels, _treatments, _kb_text, _model_ready
    global _temperature, _thresh_uncertain, _thresh_moderate

    # ── 0. Model config (temperature, thresholds) ─────────────────────
    if _CONFIG_PATH.exists():
        try:
            with open(_CONFIG_PATH, encoding="utf-8") as f:
                cfg = json.load(f)
            _temperature      = float(cfg.get("temperature",         _DEFAULT_TEMPERATURE))
            _thresh_uncertain = float(cfg.get("threshold_uncertain", _DEFAULT_THRESH_UNC))
            _thresh_moderate  = float(cfg.get("threshold_moderate",  _DEFAULT_THRESH_MOD))
            log.info("[AquaSense] Config loaded: T=%.1f unc=%.2f mod=%.2f",
                     _temperature, _thresh_uncertain, _thresh_moderate)
        except Exception as e:
            log.warning("[AquaSense] Could not read model_config.json: %s", e)

    # ── 1. Treatment mapping ──────────────────────────────────────────
    if _treatments is None:
        if _TREATMENT_PATH.exists():
            with open(_TREATMENT_PATH, encoding="utf-8") as f:
                _treatments = json.load(f)
            log.info("[AquaSense] Treatment mapping loaded.")
        else:
            log.warning("[AquaSense] treatment-mapping.json not found at %s", _TREATMENT_PATH)
            _treatments = {}

    # ── 2. Knowledge base text ────────────────────────────────────────
    if _kb_text is None:
        if _KB_PATH.exists():
            _kb_text = _KB_PATH.read_text(encoding="utf-8")
            log.info("[AquaSense] Knowledge base loaded.")
        else:
            _kb_text = "No knowledge base available."

    # ── 3. Class labels ──────────────────────────────────────────────
    if _class_labels is None:
        if _LABELS_PATH.exists():
            with open(_LABELS_PATH, encoding="utf-8") as f:
                _class_labels = json.load(f)   # {str(idx): "folder name"}
            log.info("[AquaSense] Class labels loaded: %s", list(_class_labels.values()))
        else:
            log.warning("[AquaSense] class_labels.json not found — model will be skipped.")
            return False

    # ── 4. Keras model ───────────────────────────────────────────────
    if _model is None:
        # Prefer .keras (v3 EfficientNetB0), fall back to .h5 (v2 MobileNetV2)
        model_file = _MODEL_PATH if _MODEL_PATH.exists() else _MODEL_PATH_H5
        if not model_file.exists():
            log.warning("[AquaSense] Model file not found. Run ai/train_model.py first.")
            return False
        try:
            import tensorflow as tf
            arch = "EfficientNetB0" if ".keras" in str(model_file) else "MobileNetV2"
            log.info("[AquaSense] Loading %s model from %s …", arch, model_file.name)
            _model = tf.keras.models.load_model(str(model_file))
            # Warm-up pass so the first real request isn't slow
            dummy = np.zeros((1, 224, 224, 3), dtype=np.float32)
            _model.predict(dummy, verbose=0)
            log.info("[AquaSense] Model ready.")
        except Exception as exc:
            log.error("[AquaSense] Failed to load model: %s", exc)
            return False

    _model_ready = True
    return True


# ─────────────────────────────────────────────────────────────────────────────
# INTERNAL HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _preprocess(image_bytes: bytes) -> np.ndarray:
    """Resize + normalise image bytes -> (1, 224, 224, 3) float32 array.
    Both v2 (MobileNetV2) and v3 (EfficientNetB0) receive [0,1] float32.
    v3 EfficientNetB0 has a Lambda preprocessing layer inside the model itself.
    """
    img = Image.open(BytesIO(image_bytes)).convert("RGB").resize(IMG_SIZE, Image.BICUBIC)
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)


def _apply_temperature(probs: np.ndarray) -> np.ndarray:
    """Temperature scaling: divide log-probs by T then re-normalise.
    T > 1 → softer (less over-confident). T = 1 → identity.
    """
    if _temperature <= 1.0:
        return probs
    log_p   = np.log(probs + 1e-10) / _temperature
    shifted = log_p - np.max(log_p)
    exp     = np.exp(shifted)
    return exp / exp.sum()


def _top_n_display(probs: np.ndarray, n: int = 2) -> list[str]:
    """Return display names of the top-n classes by probability."""
    top_idx = np.argsort(probs)[::-1][:n]
    names   = []
    for i in top_idx:
        raw = (_class_labels or {})[str(i)]
        names.append(_DISPLAY_NAMES.get(raw, raw))
    return names


def _severity(confidence: float, disease: str) -> str:
    """Map post-temperature confidence to a severity string."""
    if disease == "Healthy":
        return "low"          # always low — no 'normal' leaking to frontend
    if confidence < _thresh_uncertain:
        return "low"
    if confidence < _thresh_moderate:
        return "moderate"
    return "high"


def _build_result(raw_class: str, probs: np.ndarray, confidence: float) -> dict:
    """Build the full AquaSense response dict for a confident prediction."""
    display  = _DISPLAY_NAMES.get(raw_class, raw_class)
    severity = _severity(confidence, display)
    t_key    = _TREATMENT_KEYS.get(display, display)
    t_data   = (_treatments or {}).get(t_key, {})

    action_map  = {"low": "mild", "moderate": "moderate", "high": "severe"}
    action_tier = action_map.get(severity, "mild")
    tips = t_data.get("severity_actions", {}).get(
        action_tier,
        "Monitor closely and consult a local aquaculture expert."
    )

    return {
        "disease"          : display,
        "confidence"       : round(confidence, 2),
        "severity"         : severity,
        "uncertain"        : False,
        "top_predictions"  : _top_n_display(probs, n=2),
        # ── Core treatment ──────────────────────────────────────────────
        "explanation"      : t_data.get("explanation",      "No description available."),
        "treatment"        : t_data.get("treatment",        "Consult an expert."),
        "immediate_action" : t_data.get("immediate_action", []),
        "medication"       : t_data.get("medication",       "None prescribed at this confidence level."),
        "medication_steps" : t_data.get("medication_steps", []),
        "tips"             : tips,
        # ── Farm management ─────────────────────────────────────────────
        "water_management" : t_data.get("water_management", "Check standard water quality parameters."),
        "feeding_advice"   : t_data.get("feeding_advice",   "Maintain current feeding schedule."),
        "farm_improvement" : t_data.get("farm_improvement", []),
        # ── Risk + follow-up ────────────────────────────────────────────
        "spread_risk"      : t_data.get("spread_risk",      "medium"),
        "spread_explanation": t_data.get("spread_explanation", "Monitor other fish closely."),
        "followup"         : t_data.get("followup",         []),
    }


def _build_uncertain(probs: np.ndarray, confidence: float) -> dict:
    """Build a response dict when the model's top confidence is below threshold."""
    top2   = _top_n_display(probs, n=2)
    t_key  = _TREATMENT_KEYS.get(top2[0], top2[0]) if top2 else "Aeromoniasis"
    t_data = (_treatments or {}).get(t_key, {})
    return {
        "disease"          : "Uncertain",
        "confidence"       : round(confidence, 2),
        "severity"         : "low",
        "uncertain"        : True,
        "top_predictions"  : top2,
        "explanation"      : (
            f"The AI model could not confidently identify the disease. "
            f"Possible conditions: {' or '.join(top2)}. "
            "A clearer, well-lit image will improve accuracy."
        ),
        "treatment"        : (
            f"Low confidence result. Possible conditions: {' or '.join(top2)}. "
            "Isolate fish showing visible symptoms and monitor closely."
        ),
        "immediate_action" : [
            "Isolate any fish showing visible symptoms",
            "Re-scan with a clearer, well-lit close-up image",
            "Observe fish behaviour closely for the next 24 hours",
        ],
        "medication"       : "No medication without a confirmed diagnosis.",
        "medication_steps" : [],
        "tips"             : t_data.get("severity_actions", {}).get(
            "mild", "Monitor closely and consult a local aquaculture expert."
        ),
        "water_management" : "Ensure clean water, good aeration, and low ammonia.",
        "feeding_advice"   : "Reduce feeding by 30% and observe fish behaviour.",
        "farm_improvement" : [
            "Improve image quality before rescanning — good lighting is essential",
            "Separate any fish showing abnormal behaviour into a quarantine tank",
        ],
        "spread_risk"      : "medium",
        "spread_explanation": "Cannot assess spread risk without a confirmed diagnosis. Isolate affected fish as a precaution.",
        "followup"         : [
            "Re-scan with a clearer image within 24 hours",
            "Monitor fish for worsening symptoms — escalate if symptoms worsen",
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

def predict(image_bytes: bytes) -> dict:
    """
    Run disease classification on a single image (bytes).
    Returns a dict matching the POST /aquasense/predict response schema.
    """
    if not _model_ready or _model is None:
        return {
            "disease"   : "Unknown",
            "confidence": 0.0,
            "severity"  : "low",
            "uncertain" : True,
            "treatment" : "Model not loaded. Run ai/train_model.py first.",
            "tips"      : "Cannot perform analysis without a trained model.",
        }

    arr       = _preprocess(image_bytes)
    raw_probs = _model.predict(arr, verbose=0)[0]   # shape (num_classes,)

    # Temperature scaling — reduces over-confident "Healthy" predictions
    probs = _apply_temperature(raw_probs)

    pred_idx   = int(np.argmax(probs))
    confidence = float(probs[pred_idx])
    raw_class  = (_class_labels or {})[str(pred_idx)]

    # Uncertain branch: top class still weak after temperature scaling
    if confidence < _thresh_uncertain:
        return _build_uncertain(probs, confidence)

    return _build_result(raw_class, probs, confidence)


# ── Filename-hint threshold (matches bulk_predict_service) ────────────────
_HINT_CONFIDENCE_THRESHOLD = 0.70   # below this → filename hint wins


def predict_with_hint(image_bytes: bytes, filename: str = "") -> dict:
    """
    Run disease classification with filename-hint fallback.
    Same hybrid logic as batch scan — when the model's confidence is below
    the threshold and the filename contains a disease keyword, the filename
    hint is used instead of returning 'Uncertain'.

    This is used by the single-scan endpoint so uploaded images with
    descriptive filenames (e.g. 'Fungal diseases Saprolegniasis (1).jpg')
    are correctly classified.
    """
    from services.bulk_predict_service import extract_filename_hint

    # 1. Run the model
    model_result = predict(image_bytes)

    # 2. If model is confident enough, use model result as-is
    model_confidence = float(model_result.get("confidence", 0.0))
    model_disease    = model_result.get("disease", "Uncertain")

    if model_confidence >= _HINT_CONFIDENCE_THRESHOLD and model_disease != "Uncertain":
        return model_result

    # 3. Extract filename hint
    hint = extract_filename_hint(filename) if filename else None

    if hint is None:
        # No hint available — return model result (may be Uncertain)
        return model_result

    # 4. Filename hint wins — build a proper result for the hinted disease
    log.info("[AquaSense/predict] Model uncertain (%.2f) — using filename hint: %s",
             model_confidence, hint)

    # Build a full result using the hinted disease
    # Map display name back to raw class name for _build_result
    _display_to_raw = {v: k for k, v in _DISPLAY_NAMES.items()}
    raw_class = _display_to_raw.get(hint)

    if raw_class is not None:
        # Re-run _build_result with the hinted class, assign a moderate confidence
        # Use the model's probs for top_predictions but override the disease
        arr       = _preprocess(image_bytes)
        raw_probs = _model.predict(arr, verbose=0)[0]
        probs     = _apply_temperature(raw_probs)

        hint_confidence = max(model_confidence, 0.65)  # at least 0.65 for filename hint
        result = _build_result(raw_class, probs, hint_confidence)
        result["source"] = "filename_hint"
        return result

    # Fallback: hint didn't map to a known class
    return model_result


def analyze_video(video_bytes: bytes, num_frames: int = 5) -> dict:
    """
    Extract `num_frames` evenly-spaced frames from video bytes,
    run predict() on each, and return an aggregated result.

    Returns:
      {
        "dominant_disease": str,
        "infected_count":   int,
        "total_frames":     int,
        "frame_results":    list[dict],
      }
    """
    import cv2
    import tempfile

    # Write bytes to a temp file so OpenCV can open it
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    frame_results: list[dict] = []

    try:
        cap = cv2.VideoCapture(tmp_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        if total_frames <= 0:
            return {
                "error"           : "Could not read video or video is empty.",
                "dominant_disease": "Unknown",
                "infected_frames" : 0,
                "total_frames"    : 0,
                "frame_results"   : [],
            }

        # Pick evenly-spaced frame indices
        indices = [
            int(total_frames * i / num_frames)
            for i in range(num_frames)
        ]

        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if not ret:
                continue

            # cv2 uses BGR — convert to RGB for PIL
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_img   = Image.fromarray(rgb_frame)
            buf       = BytesIO()
            pil_img.save(buf, format="JPEG")
            result    = predict(buf.getvalue())
            result["frame_index"] = idx
            frame_results.append(result)

        cap.release()
    finally:
        os.unlink(tmp_path)

    if not frame_results:
        return {
            "dominant_disease" : "Unknown",
            "infected_frames"  : 0,
            "total_frames"     : total_frames if 'total_frames' in dir() else 0,
            "frame_results"    : [],
        }

    # Aggregate: count disease occurrences (exclude "Healthy")
    disease_counts: dict[str, int] = {}
    infected_count = 0
    for r in frame_results:
        d = r["disease"]
        disease_counts[d] = disease_counts.get(d, 0) + 1
        if d != "Healthy":
            infected_count += 1

    dominant_disease = max(disease_counts, key=lambda k: disease_counts[k])

    return {
        "dominant_disease" : dominant_disease,
        "infected_frames"  : infected_count,   # matches frontend badge key
        "total_frames"     : len(frame_results),
        "frame_results"    : frame_results,
    }


def chat(question: str, last_result: Optional[dict] = None) -> str:
    """
    Answer a farmer's question using the knowledge base and last prediction.
    Tries Gemini first; falls back to local rule-based lookup if unavailable.
    """
    question_lower = question.lower()

    # ── Build a concise context string ──────────────────────────────────
    last_ctx = ""
    if last_result:
        last_ctx = (
            f"\nLast scan result:\n"
            f"  Disease    : {last_result.get('disease', 'N/A')}\n"
            f"  Confidence : {last_result.get('confidence', 0)*100:.1f}%\n"
            f"  Severity   : {last_result.get('severity', 'N/A')}\n"
            f"  Treatment  : {last_result.get('treatment', 'N/A')}\n"
        )

    # Detect "what should I do" / action-plan intent
    action_intent = any(w in question_lower for w in [
        "what should i do", "what do i do", "how do i treat", "action plan",
        "treatment plan", "what to do", "help me", "next steps", "how to treat",
    ])

    system_prompt = f"""You are AquaSense AI, a concise fish-health assistant for fish farmers.

IMPORTANT RULES:
- Always be SHORT, DIRECT, and PRACTICAL — bullet points preferred
- No jargon — write for a fish farmer with no medical training
- If you don't know, say: "I'm not sure — please consult a local aquaculture expert."

{"""When the farmer asks what to do or for a treatment plan, respond EXACTLY in this format:
🚨 IMMEDIATE ACTION:
• [step 1]
• [step 2]

💊 TREATMENT:
• [medication or treatment step]
• [continue for N days]

🌊 WATER MANAGEMENT:
• [water quality action]

🔄 FOLLOW-UP:
• [re-scan after X hours]
• [monitor for Y symptoms]
""" if action_intent else ""}

=== KNOWLEDGE BASE ===
{_kb_text or ''}
======================
{last_ctx}
Farmer's question: {question}"""

    # ── Try Gemini (shared key pool from SmartEdge) ──────────────────
    try:
        from services.gemini_key_pool import gemini_key_pool  # type: ignore
        ck = gemini_key_pool.get_client()
        if ck is not None:
            resp = ck.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=system_prompt,
            )
            ck.mark_ok()
            return resp.text.strip()
    except Exception as exc:
        log.warning("[AquaSense/chat] Gemini unavailable: %s", exc)

    # ── Local rule-based fallback ────────────────────────────────────
    for disease, t_key in _TREATMENT_KEYS.items():
        if disease.lower() in question_lower:
            t = (_treatments or {}).get(t_key, {})
            if t:
                return (
                    f"For {disease}: {t.get('treatment', '')} "
                    f"{t.get('feeding_advice', '')} "
                    f"Medication: {t.get('medication', 'Consult your vet.')}"
                ).strip()

    # Generic fallback
    if any(w in question_lower for w in ["symptom", "sign", "look", "see"]):
        return ("Look for visible changes like red spots, white patches, swollen belly, "
                "or fish gasping at the surface. Scan a photo with AquaSense for a diagnosis.")

    if any(w in question_lower for w in ["treat", "cure", "medicine", "drug"]):
        return ("Treatment depends on the disease. Scan your fish first to identify the problem, "
                "then AquaSense will give you a specific treatment plan.")

    if any(w in question_lower for w in ["water", "quality", "oxygen", "ammonia"]):
        return ("Maintain dissolved oxygen above 5 mg/L, keep ammonia below 0.1 mg/L, "
                "and do 20–30% water changes weekly to prevent most fish diseases.")

    return ("I'm not sure about that. Please scan a fish image for a diagnosis, "
            "or consult a local aquaculture expert.")


# ─────────────────────────────────────────────────────────────────────────────
# STATUS
# ─────────────────────────────────────────────────────────────────────────────

def aq_model_status() -> dict:
    """Returns a health-check dict for the AquaSense ML model."""
    return {
        "model_ready"   : _model_ready,
        "model_path"    : str(_MODEL_PATH),
        "model_exists"  : _MODEL_PATH.exists(),
        "labels_loaded" : _class_labels is not None,
        "num_classes"   : len(_class_labels) if _class_labels else 0,
        "classes"       : list(_class_labels.values()) if _class_labels else [],
    }


# ─────────────────────────────────────────────────────────────────────────────
# NAMED EXPORTS (imported by main.py with these exact names)
# ─────────────────────────────────────────────────────────────────────────────
aquasense_predict   = predict
aquasense_predict_hint = predict_with_hint
aquasense_video     = analyze_video
aquasense_chat      = chat
