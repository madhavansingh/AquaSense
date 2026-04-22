# 🐟 AquaGuard

<div align="center">

**AI-Powered Fish Disease Detection & Aquaculture Decision System**

![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

*Early disease detection for healthier fish, smarter farms, and better yields.*

Built by **Team Poha Paglu**

</div>

---

## Table of Contents

1. [Project Overview](#-project-overview)
2. [Problem Statement](#-problem-statement)
3. [Solution Architecture](#-solution-architecture)
4. [Core Features](#-core-features)
5. [AI/ML Model — Deep Dive](#-aiml-model--deep-dive)
   - [Model Architecture](#model-architecture)
   - [Dataset](#dataset)
   - [Preprocessing Pipeline](#preprocessing-pipeline)
   - [Training Strategy](#training-strategy)
   - [Evaluation Metrics](#evaluation-metrics)
   - [Model Versioning](#model-versioning)
6. [Tech Stack](#-tech-stack)
7. [System Design](#-system-design)
8. [Backend — FastAPI](#-backend--fastapi)
9. [Frontend — React + Vite](#-frontend--react--vite)
10. [API Reference](#-api-reference)
11. [Project Structure](#-project-structure)
12. [Local Setup & Installation](#-local-setup--installation)
13. [Environment Variables](#-environment-variables)
14. [Sample Inputs & Outputs](#-sample-inputs--outputs)
15. [Use Cases](#-use-cases)
16. [Future Roadmap](#-future-roadmap)
17. [Team](#-team)
18. [License](#-license)

---

## 🌊 Project Overview

**AquaGuard** is an end-to-end AI system designed for fish disease detection and aquaculture farm management. It combines computer vision, transfer learning, and a rule-based treatment engine to help fish farmers, aquaculture operators, and veterinarians make fast, informed decisions about fish health.

The system accepts fish images (single or bulk), runs them through a trained deep learning model, and returns structured predictions with confidence scores, severity levels, treatment recommendations, and farm-wide health analytics.

> **Core Goal:** Reduce fish mortality and economic losses in aquaculture by making AI-assisted disease detection accessible and actionable at the farm level.

---

## ❗ Problem Statement

Aquaculture is a multi-billion dollar industry, yet disease outbreaks remain one of its leading causes of loss. Current challenges include:

- **Delayed diagnosis** — farmers rely on visual inspection without expert support
- **Lack of accessible tools** — disease identification tools are either expensive or unavailable in rural areas
- **Reactive, not proactive** — treatment begins only after visible mass infection
- **No farm-level tracking** — individual fish inspection provides no aggregated insight

AquaGuard addresses each of these gaps with a mobile-friendly, AI-first platform that works with standard smartphone photos.

---

## 🏗️ Solution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│              React (Vite) + Tailwind CSS Frontend               │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP / REST
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FASTAPI BACKEND                          │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  /predict   │  │/bulk-predict │  │   /treatment-plan     │  │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬────────────┘  │
│         └────────────────▼─────────────────────┘               │
│                          │                                      │
│              ┌───────────▼───────────┐                         │
│              │   Image Preprocessor  │                         │
│              │   (OpenCV + NumPy)    │                         │
│              └───────────┬───────────┘                         │
│                          │                                      │
│              ┌───────────▼───────────┐                         │
│              │   AI Inference Engine │                         │
│              │  (TensorFlow / Keras) │                         │
│              │  MobileNetV2 /        │                         │
│              │  EfficientNetB3       │                         │
│              └───────────┬───────────┘                         │
│                          │                                      │
│         ┌────────────────▼────────────────────┐                │
│         │        Post-Processing Layer         │                │
│         │  Confidence Scoring + Severity Calc  │                │
│         └────────────────┬────────────────────┘                │
│                          │                                      │
│         ┌────────────────▼────────────────────┐                │
│         │        Treatment Engine              │                │
│         │  Rule-based + LLM Chat Assistant     │                │
│         └────────────────┬────────────────────┘                │
│                          │                                      │
│         ┌────────────────▼────────────────────┐                │
│         │        Farm Insights Module          │                │
│         │  Trends + Risk Score + Dashboard     │                │
│         └─────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Core Features

### 1. 🔬 Fish Health Scan
- Upload a single fish image via drag-and-drop or file picker
- Supports `.jpg`, `.jpeg`, `.png`, `.webp` formats
- Instant inference with results returned in under 2 seconds

### 2. 📦 Bulk Image Analysis
- Upload up to **30 fish images simultaneously**
- Individual predictions per image
- Aggregated batch summary: most common disease, overall infection rate, risk classification
- Downloadable CSV report of results

### 3. 🤖 AI Disease Detection
- Multi-class classification across common aquaculture diseases
- Powered by fine-tuned **MobileNetV2** and **EfficientNetB3** models
- Softmax output layer with per-class probabilities

### 4. 📊 Confidence Score & Severity Level
- Confidence score expressed as a percentage (e.g., `82%`)
- Severity classification based on confidence + disease type:

  | Severity | Confidence Range | Description |
  |----------|-----------------|-------------|
  | 🟢 Low | < 50% | Uncertain prediction or early-stage indicator |
  | 🟡 Moderate | 50% – 79% | Likely infection, monitor closely |
  | 🔴 High | ≥ 80% | Strong prediction, immediate action required |

### 5. 💊 Treatment & Action Plan Engine
- Disease-specific treatment plans generated per prediction
- Plan includes:
  - **Medication** — drug name, type, dosage reference
  - **Immediate Actions** — isolation, quarantine, water changes
  - **Prevention Steps** — long-term husbandry and biosecurity guidance

### 6. 🌾 Farm-Level Insights Dashboard
- **Farm Health Score** — rolling score (0–100) based on recent scan history
- **Infection Trend Chart** — frequency of disease detections over time
- **Risk Level Indicator** — Low / Elevated / Critical
- **Most Common Disease** — most frequently detected across all recent scans
- **Per-Species Breakdown** (if species metadata is provided)

### 7. 💬 AI Chat Assistant
- Ask natural language questions about fish health, treatment, and water quality
- Backed by an LLM with aquaculture-specific context
- Example queries:
  - *"What is the best treatment for bacterial gill disease?"*
  - *"How do I prevent fungal infections during monsoon season?"*

---

## 🧠 AI/ML Model — Deep Dive

### Model Architecture

AquaGuard uses **Transfer Learning** to build an efficient image classifier for fish disease detection. Two model variants are supported:

#### Variant A — MobileNetV2 (Lightweight / Edge-Optimized)

```
Input Image (224 × 224 × 3)
        │
        ▼
[ MobileNetV2 Base ]  ← Pre-trained on ImageNet, weights frozen initially
        │
        ▼
[ Global Average Pooling 2D ]
        │
        ▼
[ Dense(256, activation='relu') ]
        │
        ▼
[ Dropout(0.4) ]
        │
        ▼
[ Dense(128, activation='relu') ]
        │
        ▼
[ Dropout(0.3) ]
        │
        ▼
[ Dense(N_CLASSES, activation='softmax') ]  ← N = number of disease classes
        │
        ▼
  Class Probabilities
```

**Why MobileNetV2?**
- Depthwise separable convolutions reduce computation by ~8–9×
- Only ~3.4M parameters — suitable for CPU inference and edge deployment
- Strong baseline accuracy on medical/biological image tasks via ImageNet pre-training

---

#### Variant B — EfficientNetB3 (High-Accuracy)

```
Input Image (300 × 300 × 3)
        │
        ▼
[ EfficientNetB3 Base ]  ← Pre-trained on ImageNet (noisy-student weights)
        │
        ▼
[ Global Average Pooling 2D ]
        │
        ▼
[ Batch Normalization ]
        │
        ▼
[ Dense(512, activation='relu') ]
        │
        ▼
[ Dropout(0.5) ]
        │
        ▼
[ Dense(N_CLASSES, activation='softmax') ]
        │
        ▼
  Class Probabilities
```

**Why EfficientNetB3?**
- Compound scaling of depth, width, and resolution gives higher accuracy at moderate compute
- Achieves stronger generalization than MobileNetV2 on fine-grained visual tasks
- Recommended for server-side inference where latency is less critical

---

### Dataset

| Property | Details |
|----------|---------|
| Source | Public fish disease datasets (Kaggle + custom collected) |
| Total Images | ~8,000 – 12,000 images |
| Image Format | JPEG / PNG |
| Resolution | Variable (resized to 224×224 or 300×300 during preprocessing) |
| Split | 80% Train / 10% Validation / 10% Test |

**Disease Classes Supported:**

| Class ID | Disease Name | Category |
|----------|-------------|----------|
| 0 | Healthy | Normal |
| 1 | Bacterial Gill Disease | Bacterial |
| 2 | Columnaris | Bacterial |
| 3 | Aeromonas Infection | Bacterial |
| 4 | Fungal Infection (Saprolegnia) | Fungal |
| 5 | White Spot Disease (Ich) | Parasitic |
| 6 | Anchor Worm | Parasitic |
| 7 | Fin Rot | Mixed (Bacterial/Environmental) |
| 8 | Pop Eye (Exophthalmia) | Bacterial |
| 9 | Dropsy | Bacterial/Viral |

> Class list is extensible. New disease classes can be added by retraining with an updated dataset.

---

### Preprocessing Pipeline

All images pass through the following preprocessing steps before inference:

```python
def preprocess_image(image_path: str, target_size=(224, 224)) -> np.ndarray:
    """
    Full preprocessing pipeline for inference.
    """
    # Step 1: Load image
    img = cv2.imread(image_path)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # Step 2: Resize to model input size
    img = cv2.resize(img, target_size, interpolation=cv2.INTER_LANCZOS4)

    # Step 3: Normalize pixel values to [0, 1]
    img = img.astype(np.float32) / 255.0

    # Step 4: Apply MobileNetV2-specific preprocessing
    img = tf.keras.applications.mobilenet_v2.preprocess_input(img * 255.0)

    # Step 5: Expand dims for batch inference
    img = np.expand_dims(img, axis=0)  # Shape: (1, 224, 224, 3)

    return img
```

**Data Augmentations applied during training:**

| Augmentation | Parameters |
|-------------|-----------|
| Random Horizontal Flip | p = 0.5 |
| Random Vertical Flip | p = 0.3 |
| Random Rotation | ±15° |
| Random Zoom | 0.85 – 1.15× |
| Random Brightness | ±20% |
| Random Contrast | ±15% |
| Gaussian Noise | σ = 0.01 |

> Augmentations are applied **only during training**, not during validation or inference.

---

### Training Strategy

Training is conducted in **two phases** to leverage transfer learning effectively:

#### Phase 1 — Feature Extraction (Frozen Base)

```
Epochs     : 15
Optimizer  : Adam (lr = 1e-3)
Loss       : Categorical Crossentropy
Batch Size : 32
Base Layers: Frozen (non-trainable)
Goal       : Train only the custom classification head
```

#### Phase 2 — Fine-Tuning (Partial Unfreeze)

```
Epochs     : 25
Optimizer  : Adam (lr = 1e-5)   ← Lower LR to preserve pre-trained features
Loss       : Categorical Crossentropy
Batch Size : 16
Base Layers: Unfreeze last 30–40 layers (MobileNetV2) / last 50 (EfficientNetB3)
Goal       : Fine-tune high-level feature detectors for fish disease patterns
```

**Additional training techniques applied:**

- **Learning Rate Scheduling** — `ReduceLROnPlateau` (factor=0.3, patience=3)
- **Early Stopping** — Monitor `val_loss`, patience=7, restore best weights
- **Class Weights** — Computed from class frequencies to handle dataset imbalance
- **Model Checkpointing** — Save best model checkpoint by `val_accuracy`

**Training code:**

```python
# Callbacks
callbacks = [
    tf.keras.callbacks.ModelCheckpoint(
        filepath='checkpoints/best_model.h5',
        monitor='val_accuracy',
        save_best_only=True,
        verbose=1
    ),
    tf.keras.callbacks.EarlyStopping(
        monitor='val_loss',
        patience=7,
        restore_best_weights=True
    ),
    tf.keras.callbacks.ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.3,
        patience=3,
        min_lr=1e-7,
        verbose=1
    )
]

# Phase 1: Train classification head only
base_model.trainable = False
model.compile(
    optimizer=Adam(learning_rate=1e-3),
    loss='categorical_crossentropy',
    metrics=['accuracy', tf.keras.metrics.AUC(name='auc')]
)
history_phase1 = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=15,
    class_weight=class_weights,
    callbacks=callbacks
)

# Phase 2: Fine-tune last N layers of base model
base_model.trainable = True
for layer in base_model.layers[:-40]:
    layer.trainable = False

model.compile(
    optimizer=Adam(learning_rate=1e-5),
    loss='categorical_crossentropy',
    metrics=['accuracy', tf.keras.metrics.AUC(name='auc')]
)
history_phase2 = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=25,
    class_weight=class_weights,
    callbacks=callbacks
)
```

---

### Evaluation Metrics

| Metric | MobileNetV2 | EfficientNetB3 |
|--------|------------|----------------|
| Training Accuracy | ~93% | ~96% |
| Validation Accuracy | ~89% | ~93% |
| Test Accuracy | ~87% | ~91% |
| Macro F1-Score | ~0.86 | ~0.90 |
| Inference Time (CPU) | ~120ms | ~280ms |
| Inference Time (GPU) | ~18ms | ~32ms |
| Model Size | ~14 MB | ~48 MB |

> Metrics are approximate and based on available training data. Performance improves with larger, more diverse datasets.

Each disease class is evaluated individually with Precision, Recall, F1-Score, and AUC-ROC (One-vs-Rest strategy).

---

### Model Versioning

```
models/
├── mobilenetv2_v1.0.h5       ← Initial trained model
├── mobilenetv2_v1.1.h5       ← Fine-tuned version
├── efficientnetb3_v1.0.h5    ← High-accuracy variant
└── label_map.json            ← Class index → disease name mapping
```

`label_map.json` structure:

```json
{
  "0": "Healthy",
  "1": "Bacterial Gill Disease",
  "2": "Columnaris",
  "3": "Aeromonas Infection",
  "4": "Fungal Infection",
  "5": "White Spot Disease",
  "6": "Anchor Worm",
  "7": "Fin Rot",
  "8": "Pop Eye",
  "9": "Dropsy"
}
```

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.x | UI framework |
| Vite | 5.x | Build tool & dev server |
| Tailwind CSS | 3.x | Utility-first styling |
| Axios | 1.x | API communication |
| Recharts | 2.x | Farm insights charts |
| React Dropzone | 14.x | Drag-and-drop image upload |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| FastAPI | 0.100+ | REST API framework |
| Uvicorn | 0.23+ | ASGI server |
| Python-Multipart | 0.0.6+ | File upload handling |
| Pydantic | 2.x | Request/response schema validation |

### AI / ML

| Technology | Version | Purpose |
|-----------|---------|---------|
| TensorFlow | 2.13+ | Deep learning framework |
| Keras | (bundled) | High-level model API |
| OpenCV | 4.8+ | Image loading and preprocessing |
| NumPy | 1.24+ | Array and tensor computation |
| Scikit-learn | 1.3+ | Metrics, class weights, evaluation |
| Matplotlib / Seaborn | Latest | Training visualization and plots |
| Pillow | 10.x | Image format handling |

---

## 🗂️ System Design

### Request Flow — Single Image Prediction

```
Client
  │
  │  POST /predict
  │  Content-Type: multipart/form-data
  │  Body: { image: <file> }
  │
  ▼
FastAPI Router
  │
  ├── Validate file type & size
  ├── Save to temp directory
  ├── Preprocess (OpenCV + NumPy)
  │       resize → normalize → expand dims
  │
  ├── Load model from memory (singleton pattern)
  ├── model.predict(img_array) → softmax probabilities
  │
  ├── Postprocess
  │       → argmax → class label
  │       → confidence = max(probabilities)
  │       → severity = compute_severity(confidence, disease_class)
  │
  ├── Treatment Engine → lookup treatment_db[disease_class]
  │
  └── Return JSON Response
```

### Request Flow — Bulk Prediction

```
Client
  │
  │  POST /bulk-predict
  │  Body: { images: [<file_1>, ..., <file_30>] }
  │
  ▼
FastAPI Router
  │
  ├── Validate batch size (max 30)
  ├── Batch preprocessing (vectorized)
  │       → stack images into (N, 224, 224, 3) tensor
  │
  ├── model.predict(batch_tensor)  ← single forward pass for entire batch
  │
  ├── Postprocess per image
  │
  ├── Aggregate results
  │       → infection_rate = infected_count / total_count
  │       → most_common_disease = mode(predictions)
  │       → batch_risk_level = f(infection_rate, severity_distribution)
  │
  └── Return per-image results + batch summary
```

---

## ⚙️ Backend — FastAPI

### Core Modules

```
backend/
├── main.py                  ← FastAPI app entry point, route registration
├── routers/
│   ├── predict.py           ← Single image prediction endpoint
│   ├── bulk_predict.py      ← Batch prediction endpoint
│   ├── treatment.py         ← Treatment plan generation
│   ├── farm_insights.py     ← Farm analytics and metrics
│   └── chat.py              ← Chat assistant endpoint
├── services/
│   ├── model_service.py     ← Model loading, inference, singleton management
│   ├── preprocess.py        ← Image preprocessing pipeline
│   ├── treatment_engine.py  ← Rule-based treatment lookup
│   ├── severity.py          ← Severity classification logic
│   └── farm_analytics.py    ← Insights computation
├── models/                  ← Stored .h5 model files
├── data/
│   ├── label_map.json
│   └── treatment_db.json
├── schemas/
│   ├── prediction.py        ← Pydantic response schemas
│   └── insights.py
├── utils/
│   └── file_utils.py        ← Temp file handling, cleanup
├── requirements.txt
└── config.py
```

### Model Singleton — Efficient Loading

```python
# services/model_service.py

import tensorflow as tf
from functools import lru_cache

@lru_cache(maxsize=1)
def get_model():
    """
    Load model once and cache in memory.
    Avoids reloading on every request — critical for low-latency inference.
    """
    model = tf.keras.models.load_model(config.MODEL_PATH)
    return model
```

### Severity Computation Logic

```python
# services/severity.py

SEVERITY_RULES = {
    "Healthy":                  {"moderate": 1.0, "high": 1.0},
    "Bacterial Gill Disease":   {"moderate": 0.75, "high": 0.85},
    "White Spot Disease":       {"moderate": 0.70, "high": 0.80},
    "Fungal Infection":         {"moderate": 0.72, "high": 0.82},
    "Fin Rot":                  {"moderate": 0.68, "high": 0.80},
}

def compute_severity(disease: str, confidence: float) -> str:
    thresholds = SEVERITY_RULES.get(disease, {"moderate": 0.75, "high": 0.85})
    if confidence >= thresholds["high"]:
        return "high"
    elif confidence >= thresholds["moderate"]:
        return "moderate"
    else:
        return "low"
```

---

## 🖥️ Frontend — React + Vite

### Component Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── UploadZone.jsx        ← Single + bulk image upload UI
│   │   ├── ResultCard.jsx        ← Per-fish disease result display
│   │   ├── BulkResultTable.jsx   ← Table view for batch results
│   │   ├── SeverityBadge.jsx     ← Color-coded severity indicator
│   │   ├── TreatmentPanel.jsx    ← Treatment plan display
│   │   ├── FarmDashboard.jsx     ← Farm insights charts & metrics
│   │   └── ChatAssistant.jsx     ← Chat interface component
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Scan.jsx
│   │   ├── BulkScan.jsx
│   │   ├── Insights.jsx
│   │   └── Chat.jsx
│   ├── api/
│   │   └── aquaguard.js          ← Axios API client
│   ├── hooks/
│   │   └── usePredict.js         ← Custom hook for prediction state
│   ├── App.jsx
│   └── main.jsx
├── public/
├── index.html
├── tailwind.config.js
└── vite.config.js
```

---

## 📡 API Reference

### `POST /predict`

Predict disease from a single fish image.

**Request:**
```
Content-Type: multipart/form-data
Body: image (file) — JPEG/PNG, max 10MB
```

**Response:**
```json
{
  "disease": "Fungal Infection",
  "confidence": 0.82,
  "severity": "high",
  "class_probabilities": {
    "Healthy": 0.03,
    "Bacterial Gill Disease": 0.05,
    "Fungal Infection": 0.82,
    "White Spot Disease": 0.06,
    "Fin Rot": 0.04
  },
  "treatment": {
    "medication": "Antifungal bath treatment (Malachite Green or Methylene Blue)",
    "immediate_actions": [
      "Isolate affected fish immediately",
      "Perform 30% water change",
      "Remove organic debris from tank"
    ],
    "prevention": [
      "Maintain water temperature between 22–26°C",
      "Avoid overstocking",
      "Ensure proper filtration and aeration"
    ]
  },
  "inference_time_ms": 118
}
```

---

### `POST /bulk-predict`

Analyze up to 30 fish images in a single request.

**Request:**
```
Content-Type: multipart/form-data
Body: images[] (files) — up to 30 files
```

**Response:**
```json
{
  "total_images": 12,
  "results": [
    {
      "filename": "fish_001.jpg",
      "disease": "White Spot Disease",
      "confidence": 0.91,
      "severity": "high"
    },
    {
      "filename": "fish_002.jpg",
      "disease": "Healthy",
      "confidence": 0.95,
      "severity": "low"
    }
  ],
  "summary": {
    "healthy_count": 4,
    "infected_count": 8,
    "infection_rate": 0.67,
    "most_common_disease": "White Spot Disease",
    "batch_risk_level": "critical",
    "severity_distribution": {
      "low": 4,
      "moderate": 3,
      "high": 5
    }
  }
}
```

---

### `POST /treatment-plan`

Get a detailed treatment plan for a known disease.

**Request:**
```json
{
  "disease": "Bacterial Gill Disease",
  "severity": "moderate"
}
```

**Response:**
```json
{
  "disease": "Bacterial Gill Disease",
  "severity": "moderate",
  "medication": "Oxytetracycline or Florfenicol (consult veterinarian for dosage)",
  "immediate_actions": [
    "Quarantine affected fish",
    "Test and adjust water pH to 7.0–7.5",
    "Increase aeration in affected tanks"
  ],
  "prevention": [
    "Regularly monitor ammonia and nitrite levels",
    "Disinfect nets and equipment between uses",
    "Avoid physical stress during handling"
  ],
  "estimated_recovery_days": "7–14 days with proper treatment"
}
```

---

### `GET /farm-insights`

Retrieve farm-level health metrics computed from scan history.

**Response:**
```json
{
  "farm_health_score": 64,
  "risk_level": "elevated",
  "most_common_disease": "White Spot Disease",
  "total_scans": 87,
  "infection_rate_7d": 0.41,
  "infection_trend": [
    { "date": "2024-01-15", "infected": 3, "healthy": 7 },
    { "date": "2024-01-16", "infected": 5, "healthy": 5 },
    { "date": "2024-01-17", "infected": 8, "healthy": 2 }
  ],
  "disease_breakdown": {
    "White Spot Disease": 18,
    "Bacterial Gill Disease": 9,
    "Fin Rot": 5,
    "Healthy": 55
  }
}
```

---

### `POST /chat`

Chat with the AI fish health assistant.

**Request:**
```json
{
  "message": "What are the early signs of White Spot Disease?",
  "history": []
}
```

**Response:**
```json
{
  "reply": "White Spot Disease (Ich) is caused by the parasite Ichthyophthirius multifiliis. Early signs include small white dots on the skin and fins, scratching behavior against surfaces (flashing), lethargy, and reduced appetite. Raising water temperature to 28°C can accelerate the parasite life cycle and improve treatment effectiveness.",
  "suggested_followups": [
    "What treatment works best for White Spot Disease?",
    "Is White Spot Disease contagious to other fish?"
  ]
}
```

---

## 📁 Project Structure

```
aquaguard/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   ├── routers/
│   ├── services/
│   ├── schemas/
│   ├── utils/
│   ├── models/               ← .h5 model files (not committed to Git)
│   └── data/
│       ├── label_map.json
│       └── treatment_db.json
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── ml/
│   ├── train.py              ← Full training script
│   ├── evaluate.py           ← Evaluation + confusion matrix
│   ├── preprocess_dataset.py ← Dataset preparation pipeline
│   ├── augmentation.py       ← Augmentation config
│   ├── export_model.py       ← Export to .h5 / TFLite
│   └── notebooks/
│       ├── EDA.ipynb
│       ├── Training.ipynb
│       └── Evaluation.ipynb
│
├── .env.example
├── .gitignore
└── README.md
```

---

## 🚀 Local Setup & Installation

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Python | 3.9 or higher |
| Node.js | 18 or higher |
| npm | 9 or higher |
| Git | Any recent version |

> **GPU Setup (Optional):** For faster model training and inference, install CUDA 11.8+ and cuDNN 8.6+, then use `tensorflow-gpu`.

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/aquaguard.git
cd aquaguard
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Linux / macOS
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp ../.env.example .env
# Edit .env with your configuration

# Start the development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend API: `http://localhost:8000`
Swagger Docs: `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
cd frontend

npm install

cp .env.example .env.local
# Set VITE_API_BASE_URL=http://localhost:8000

npm run dev
```

Frontend: `http://localhost:5173`

---

### 4. Model Training (Optional)

```bash
cd ml

# Organize dataset:
# ml/data/train/<class_name>/
# ml/data/val/<class_name>/
# ml/data/test/<class_name>/

# Run training
python train.py --model mobilenetv2 --epochs 40 --batch-size 32

# Evaluate
python evaluate.py --model-path checkpoints/best_model.h5

# Export for deployment
python export_model.py --input checkpoints/best_model.h5 --output ../backend/models/
```

---

### `requirements.txt` — Backend

```
fastapi==0.103.1
uvicorn[standard]==0.23.2
python-multipart==0.0.6
pydantic==2.3.0
tensorflow==2.13.0
opencv-python-headless==4.8.0.76
numpy==1.24.3
Pillow==10.0.0
scikit-learn==1.3.0
python-dotenv==1.0.0
httpx==0.24.1
```

---

## 🔐 Environment Variables

### Backend `.env`

```env
MODEL_PATH=models/mobilenetv2_v1.1.h5
MODEL_VARIANT=mobilenetv2
LABEL_MAP_PATH=data/label_map.json
TREATMENT_DB_PATH=data/treatment_db.json

API_HOST=0.0.0.0
API_PORT=8000
MAX_UPLOAD_SIZE_MB=10
MAX_BULK_IMAGES=30

LLM_API_KEY=your_api_key_here
LLM_MODEL=claude-sonnet-4-20250514
```

### Frontend `.env.local`

```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## 🧪 Sample Inputs & Outputs

### Healthy Fish

```json
{
  "disease": "Healthy",
  "confidence": 0.96,
  "severity": "low",
  "treatment": null,
  "inference_time_ms": 112
}
```

### Infected Fish

```json
{
  "disease": "White Spot Disease",
  "confidence": 0.91,
  "severity": "high",
  "treatment": {
    "medication": "Malachite Green or Formalin bath treatment",
    "immediate_actions": [
      "Isolate affected fish immediately",
      "Raise water temperature to 28°C to accelerate parasite lifecycle",
      "Perform daily 25% water changes"
    ],
    "prevention": [
      "Quarantine new fish for 2 weeks before introduction",
      "Disinfect all equipment between tanks",
      "Avoid sudden temperature drops"
    ]
  }
}
```

---

## 👥 Use Cases

| User Type | How AquaGuard Helps |
|-----------|-------------------|
| **Small-scale fish farmer** | Upload phone photos to get instant disease diagnosis without a vet |
| **Aquaculture business** | Bulk-scan tanks, track farm health trends, automated treatment plans |
| **Fish health veterinarian** | Use confidence scores and class probabilities to support clinical decisions |
| **Monitoring system integrator** | Connect via REST API to automate detection in CCTV or IoT pipelines |
| **Agricultural researcher** | Collect labeled prediction data to expand and improve the model |

---

## 🔭 Future Roadmap

| Feature | Status | Description |
|---------|--------|-------------|
| Real-time CCTV monitoring | 🔜 Planned | Live video stream analysis using OpenCV + RTSP |
| IoT sensor integration | 🔜 Planned | Feed water pH, temperature, DO levels into risk model |
| TFLite export for mobile | 🔜 Planned | On-device inference for Android/iOS without backend |
| Multi-species support | 🔜 Planned | Extend to Tilapia, Salmon, Catfish, Shrimp |
| Predictive outbreak alerts | 🔜 Planned | Time-series model to forecast disease spread risk |
| GIS farm mapping | 🔜 Planned | Map disease incidents to pond/tank locations |
| Docker deployment | 🔜 Planned | Full containerization with `docker-compose` |
| Auto-retraining pipeline | 🔜 Planned | Retrain on flagged/corrected predictions continuously |

---

## 👨‍💻 Team

**Team Poha Paglu**

---

## 📄 License

This project was built for hackathon purposes.

```
MIT License — open for educational and non-commercial use.
Contact the team for commercial licensing enquiries.
```

---

<div align="center">

**AquaGuard** · Team Poha Paglu

*Protecting fish, empowering farmers, one image at a time.*

</div>