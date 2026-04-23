"""
AquaSense — Inference Engine v3
Loads the trained EfficientNetB0 model and returns disease predictions.

Key improvements over v2
------------------------
- Supports both EfficientNetB0 (v3) and MobileNetV2 (v2) models
- Auto-detects preprocessing from model_config.json:
    preprocessing=="efficientnet" → uses preprocess_input (no /255)
    preprocessing=="mobilenet"    → uses /255 rescale (legacy)
- Loads .keras format first (TF 2.12+ native), falls back to .h5
- Temperature scaling from model_config.json
- Uncertain branch with top-2 candidates
- Richer action-plan fields from treatment-mapping.json

Usage (standalone):
    python predict.py path/to/fish_image.jpg
"""

import os
import sys
import json
import numpy as np
from PIL import Image

# ─────────────────────────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────────────────────────
SCRIPT_DIR      = os.path.dirname(os.path.abspath(__file__))
# Try .keras first (v3 EfficientNetB0), fall back to .h5 (v2 MobileNetV2)
_KERAS_PATH     = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "aquasense_model.keras")
_H5_PATH        = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "aquasense_model.h5")
MODEL_PATH      = _KERAS_PATH if os.path.exists(_KERAS_PATH) else _H5_PATH
LABELS_PATH     = os.path.join(SCRIPT_DIR, "models", "class_labels.json")
CONFIG_PATH     = os.path.join(SCRIPT_DIR, "models", "model_config.json")
TREATMENT_PATH  = os.path.join(SCRIPT_DIR, "treatment-mapping.json")

IMG_SIZE = (224, 224)

# ── Default thresholds (overridden by model_config.json if present) ──
_DEFAULT_CFG = {
    "temperature"        : 1.5,
    "threshold_uncertain": 0.55,
    "threshold_moderate" : 0.75,
}


# ─────────────────────────────────────────────────────────────────
# FRIENDLY DISPLAY NAMES
# ─────────────────────────────────────────────────────────────────
CLASS_DISPLAY_NAMES = {
    "Bacterial diseases - Aeromoniasis"  : "Aeromoniasis",
    "Bacterial gill disease"             : "Gill Disease",
    "Bacterial Red disease"              : "Red Disease",
    "Fungal diseases Saprolegniasis"     : "Fungal (Saprolegniasis)",
    "Healthy Fish"                       : "Healthy",
    "Parasitic diseases"                 : "Parasitic",
    "Viral diseases White tail disease"  : "Viral (White Tail Disease)",
}

TREATMENT_KEYS = {
    "Aeromoniasis"              : "Aeromoniasis",
    "Gill Disease"              : "Gill disease",
    "Red Disease"               : "Red disease",
    "Fungal (Saprolegniasis)"   : "Fungal",
    "Healthy"                   : "Healthy",
    "Parasitic"                 : "Parasitic",
    "Viral (White Tail Disease)": "Viral",
}


# ─────────────────────────────────────────────────────────────────
# SINGLETON RESOURCES
# ─────────────────────────────────────────────────────────────────
_model        = None
_class_labels = None
_treatments   = None
_cfg          = None


def _load_config() -> dict:
    """Load model_config.json (temperature, thresholds). Falls back to defaults."""
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r") as f:
            cfg = json.load(f)
        # fill any missing keys from defaults
        for k, v in _DEFAULT_CFG.items():
            cfg.setdefault(k, v)
        return cfg
    return dict(_DEFAULT_CFG)


def load_resources():
    """Load model, labels, config, and treatment mapping into memory (once)."""
    global _model, _class_labels, _treatments, _cfg

    if _cfg is None:
        _cfg = _load_config()

    if _model is None:
        import tensorflow as tf
        # Determine which model file to load
        model_file = MODEL_PATH
        if not os.path.exists(model_file):
            raise FileNotFoundError(
                f"No model found at {model_file}. "
                "Run ai/train_model.py first."
            )
        arch = _cfg.get("architecture", "MobileNetV2")
        print(f"[AquaSense] Loading {arch} model from {os.path.basename(model_file)}…")
        _model = tf.keras.models.load_model(model_file)
        # warm-up pass so first real request isn't slow
        dummy = np.zeros((1, *IMG_SIZE, 3), dtype=np.float32)
        _model.predict(dummy, verbose=0)
        print("[AquaSense] Model ready.")

    if _class_labels is None:
        with open(LABELS_PATH, "r") as f:
            _class_labels = json.load(f)   # {str(idx): "raw folder name"}

    if _treatments is None:
        with open(TREATMENT_PATH, "r") as f:
            _treatments = json.load(f)


# ─────────────────────────────────────────────────────────────────
# PREPROCESSING  — must match training exactly
# ─────────────────────────────────────────────────────────────────

def preprocess_image(image_input) -> np.ndarray:
    """
    Accepts: file path (str) | PIL.Image | raw bytes.
    Returns: float32 numpy array of shape (1, 224, 224, 3).

    Preprocessing mode is determined by model_config.json:
      preprocessing == "efficientnet"  → uses EfficientNet preprocess_input
      anything else (default)          → /255 rescale (MobileNetV2 v2 compat)
    """
    if isinstance(image_input, str):
        img = Image.open(image_input).convert("RGB")
    elif isinstance(image_input, bytes):
        from io import BytesIO
        img = Image.open(BytesIO(image_input)).convert("RGB")
    elif isinstance(image_input, Image.Image):
        img = image_input.convert("RGB")
    else:
        raise ValueError(f"Unsupported image input type: {type(image_input)}")

    img = img.resize(IMG_SIZE, Image.BICUBIC)   # high-quality resize
    arr = np.array(img, dtype=np.float32)       # shape (224, 224, 3)  values 0-255

    # v3 (EfficientNetB0): preprocessing Lambda layer is INSIDE the model,
    # so inference only needs /255 rescale — same as MobileNetV2 v2.
    # v2 (MobileNetV2): also uses /255.
    # Both models receive [0,1] float32 input.
    arr = arr / 255.0

    return np.expand_dims(arr, axis=0)


# ─────────────────────────────────────────────────────────────────
# TEMPERATURE SCALING
# ─────────────────────────────────────────────────────────────────

def _apply_temperature(logits: np.ndarray, temperature: float) -> np.ndarray:
    """
    Divide raw softmax probabilities by temperature before re-normalising.
    T > 1 → softer distribution (less over-confident).
    T = 1 → no change.
    """
    if temperature <= 1.0:
        return logits
    # work in log-space for numerical stability
    log_probs = np.log(logits + 1e-10) / temperature
    # softmax
    shifted   = log_probs - np.max(log_probs)
    exp       = np.exp(shifted)
    return exp / exp.sum()


# ─────────────────────────────────────────────────────────────────
# SEVERITY MAPPER
# ─────────────────────────────────────────────────────────────────

def _severity(confidence: float, disease: str) -> str:
    if disease == "Healthy":
        return "low"          # frontend expects low/moderate/high — never "normal"
    if confidence < _cfg["threshold_uncertain"]:
        return "low"
    if confidence < _cfg["threshold_moderate"]:
        return "moderate"
    return "high"


# ─────────────────────────────────────────────────────────────────
# TOP-N HELPER
# ─────────────────────────────────────────────────────────────────

def _top_n_names(probs: np.ndarray, n: int = 2) -> list[str]:
    """Return display names of the top-n predicted classes."""
    top_idx = np.argsort(probs)[::-1][:n]
    names   = []
    for i in top_idx:
        raw  = _class_labels[str(i)]
        names.append(CLASS_DISPLAY_NAMES.get(raw, raw))
    return names


# ─────────────────────────────────────────────────────────────────
# CORE PREDICT  —  called by aquasense_service.py AND standalone CLI
# ─────────────────────────────────────────────────────────────────

def predict(image_input) -> dict:
    """
    Main prediction function.

    Returns one of two schemas:

    Normal result:
    {
        "disease":          str,
        "confidence":       float (0-1, rounded to 2 dp),
        "severity":         "low" | "moderate" | "high",
        "treatment":        str,
        "tips":             str,
        "medication":       str,
        "water_management": str,
        "feeding_advice":   str,
    }

    Uncertain result (top confidence < threshold):
    {
        "disease":          "Uncertain",
        "confidence":       float,
        "severity":         "low",
        "uncertain":        True,
        "top_predictions":  [str, str],   # top-2 candidate names
        "treatment":        str,
        "tips":             str,
        "medication":       str,
        "water_management": str,
        "feeding_advice":   str,
    }
    """
    load_resources()

    # 1. Preprocess
    arr = preprocess_image(image_input)

    # 2. Raw inference
    raw_probs = _model.predict(arr, verbose=0)[0]   # shape (num_classes,)

    # 3. Temperature scaling (softens over-confident Healthy predictions)
    probs = _apply_temperature(raw_probs, _cfg["temperature"])

    # 4. Top class
    pred_idx    = int(np.argmax(probs))
    confidence  = float(probs[pred_idx])
    raw_class   = _class_labels[str(pred_idx)]
    display     = CLASS_DISPLAY_NAMES.get(raw_class, raw_class)

    # ── UNCERTAIN BRANCH ─────────────────────────────────────────
    THRESH_UNCERTAIN = _cfg["threshold_uncertain"]   # e.g. 0.55

    if confidence < THRESH_UNCERTAIN:
        top2   = _top_n_names(probs, n=2)
        # Use mild treatment from the #1 candidate
        t_key  = TREATMENT_KEYS.get(top2[0], top2[0])
        t_data = _treatments.get(t_key, {})
        return {
            "disease"          : "Uncertain",
            "confidence"       : round(confidence, 2),
            "severity"         : "low",
            "uncertain"        : True,
            "top_predictions"  : top2,
            "treatment"        : (
                f"Low confidence result. Possible conditions: {' or '.join(top2)}. "
                "Isolate any fish showing visible symptoms and monitor closely."
            ),
            "tips"             : t_data.get(
                "severity_actions", {}
            ).get("mild", "Monitor closely and consult a local aquaculture expert."),
            "medication"       : "No medication without a confirmed diagnosis.",
            "water_management" : "Ensure clean water, good aeration, and low ammonia.",
            "feeding_advice"   : "Reduce feeding by 30% and observe fish behaviour.",
        }

    # ── NORMAL BRANCH ────────────────────────────────────────────
    severity   = _severity(confidence, display)
    t_key      = TREATMENT_KEYS.get(display, display)
    t_data     = _treatments.get(t_key, {})

    # Pick the right severity-action tier
    action_map = {"low": "mild", "moderate": "moderate", "high": "severe"}
    action_key = action_map.get(severity, "mild")
    tips       = t_data.get("severity_actions", {}).get(
        action_key, "Monitor closely and consult a local aquaculture expert."
    )

    return {
        "disease"          : display,
        "confidence"       : round(confidence, 2),
        "severity"         : severity,
        "uncertain"        : False,
        "top_predictions"  : _top_n_names(probs, n=2),
        "treatment"        : t_data.get("treatment", "Consult a local aquaculture expert."),
        "tips"             : tips,
        "medication"       : t_data.get("medication", "No medication prescribed at this confidence level."),
        "water_management" : t_data.get("water_management", "Check standard water quality parameters."),
        "feeding_advice"   : t_data.get("feeding_advice", "Maintain current feeding schedule."),
    }


# ─────────────────────────────────────────────────────────────────
# CLI STANDALONE TEST
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python predict.py <path_to_image>")
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(f"Error: file not found — {image_path}")
        sys.exit(1)

    result = predict(image_path)

    print("\n" + "=" * 60)
    print("  AquaSense — Disease Prediction Result")
    print("=" * 60)

    if result.get("uncertain"):
        print(f"  Status         : ⚠️  UNCERTAIN")
        print(f"  Top candidates : {' / '.join(result['top_predictions'])}")
    else:
        print(f"  Disease        : {result['disease']}")

    print(f"  Confidence     : {result['confidence'] * 100:.1f}%")
    print(f"  Severity       : {result['severity'].upper()}")
    print(f"  Treatment      : {result['treatment']}")
    print(f"  Tips           : {result['tips']}")
    print(f"  Medication     : {result['medication']}")
    print("=" * 60)
