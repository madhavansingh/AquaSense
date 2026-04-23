<div align="center">

<img src="https://img.shields.io/badge/AquaGuard-AI%20Fish%20Health%20Platform-00b4d8?style=for-the-badge&logo=fish&logoColor=white" alt="AquaGuard"/>

# 🐟 AquaGuard — AI-Powered Fish Disease Detection Platform

**Production-grade aquaculture intelligence platform combining custom CNN inference, Gemini Vision AI, and farm-level analytics to detect fish diseases in real time.**

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.12%2B-FF6F00?style=flat-square&logo=tensorflow&logoColor=white)](https://tensorflow.org)
[![Google Gemini](https://img.shields.io/badge/Gemini-Vision-4285F4?style=flat-square&logo=google&logoColor=white)](https://aistudio.google.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

[API Docs](#api-reference) · [Report Bug](https://github.com/Team-Nexus-At-NIT/31-poha-pagalu/issues) · [Request Feature](https://github.com/Team-Nexus-At-NIT/31-poha-pagalu/issues)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [AI Pipeline](#ai-pipeline)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Disease Classes](#disease-classes)
- [Dataset](#dataset)
- [Model Performance](#model-performance)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

AquaGuard is a full-stack AI platform for South Asian freshwater aquaculture farmers and fish health veterinarians. It accepts fish images from any device (desktop upload or mobile camera via QR), runs a **two-stage hybrid classification pipeline** (local CNN → Gemini Vision fallback), and returns:

- Disease classification with confidence score
- Severity level (Critical / High / Moderate / Low)
- Evidence-based treatment protocol
- Farm-level risk trends and batch analytics
- AI chat assistant grounded in aquaculture domain knowledge

The system is built to operate in low-bandwidth environments with an offline-first model inference path and an intelligent Gemini API key rotation pool to maximise quota availability.

---

## Key Features

| Feature | Description |
|---|---|
| 🔬 **Hybrid AI Detection** | Local CNN (MobileNetV2) for speed + Gemini Vision for accuracy, auto-selected by confidence threshold |
| 📸 **Mobile Scan via QR** | Farmers scan a QR code to open a mobile camera interface — no app install needed |
| 🧪 **Batch Processing** | Upload entire folders of fish images; results aggregated with per-disease breakdown |
| 📊 **Farm Intelligence** | Session-based health trend engine: disease frequency, recurrence patterns, risk scoring |
| 💊 **Treatment Engine** | Rule-based + AI-generated treatment plans mapped to detected diseases and severity |
| 🚨 **Alert System** | Sliding-window detection fires email alerts (+ PDF report) when critical patterns emerge |
| 🤖 **Domain Chat AI** | Gemini-powered assistant grounded in the AquaGuard knowledge base |
| 🔐 **Google OAuth** | Secure Google Sign-In with JWT session management |
| 🎙️ **Voice TTS** | ElevenLabs integration for voice read-back of scan results |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  React 19 + Vite · Recharts · Framer Motion · React Router 7   │
│                                                                 │
│  LandingPage → LoginPage → DashboardPage                        │
│       ↓              ↓            ↓                             │
│  InspectPage   BatchScanPage  AnalyticsPage  TreatmentPage      │
│                                                                 │
│  Components: Layout · ChatAssistant · MobileQRPanel             │
│  Context:    AuthContext · SystemContext · SettingsContext       │
└────────────────────┬────────────────────────────────────────────┘
                     │  HTTPS / REST
┌────────────────────▼────────────────────────────────────────────┐
│                      API LAYER (FastAPI)                        │
│                        backend/main.py                          │
│                                                                 │
│  /auth/*              Google OAuth + JWT verification           │
│  /aquaguard/predict   Single image detection                    │
│  /aquaguard/batch     Batch image processing                    │
│  /aquaguard/chat      Gemini RAG chatbot                        │
│  /aquaguard/treatment-plan  Treatment decision engine           │
│  /alerts/*            Sliding-window alert system               │
└──────┬──────────────────┬──────────────────────────────────────┘
       │                  │
┌──────▼───────┐  ┌───────▼──────────────────────────────────────┐
│  LOCAL MODEL │  │           GEMINI API POOL                     │
│  ai/predict  │  │  services/gemini_key_pool.py                  │
│              │  │  · Up to 10 API keys, round-robin rotation    │
│  MobileNetV2 │  │  · Quota-exhaustion auto-failover             │
│  .keras/.h5  │  │  · gemini-2.0-flash-exp vision model          │
│  7 classes   │  └──────────────────────────────────────────────┘
│  ~92% acc    │
└──────────────┘
       │
┌──────▼──────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                                 │
│                                                                 │
│  aquaguard_service.py  — main detection orchestrator            │
│  domain_classifier.py  — filename-based hybrid routing          │
│  farm_intelligence.py  — session analytics engine               │
│  treatment_service.py  — treatment plan generator               │
│  alert_service.py      — email + PDF alert system               │
│  bulk_predict_service.py — async batch processing               │
│  decision_engine.py    — severity + recommendation logic        │
│  gemini_vision_service.py — Gemini API wrapper                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## AI Pipeline

### Stage 1 — Domain Classification (filename-based)
`services/domain_classifier.py` inspects the uploaded filename for known disease keywords. This zero-latency heuristic boosts accuracy when filenames carry semantic meaning (e.g., from batch exports).

### Stage 2 — Local CNN Inference
`ai/predict.py` loads the custom MobileNetV2 model (`ai/models/aquaguard_model.keras`) and runs inference in < 200 ms on CPU. Returns class label + softmax confidence.

### Stage 3 — Gemini Vision Fallback
If local CNN confidence < threshold **or** the domain classifier signals ambiguity, `services/gemini_vision_service.py` sends the image to Gemini Vision via the pooled key manager. The structured response is merged with the local result.

### Stage 4 — Severity & Treatment
`services/decision_engine.py` maps `(class, confidence)` → severity level using the rules in `ai/severity-logic.md`. `services/treatment_service.py` looks up `ai/treatment-mapping.json` and optionally calls Gemini for a personalised protocol.

```
Image Input
    │
    ▼
Domain Classifier (filename heuristic)
    │
    ├─ High confidence ──► Local CNN ──► result
    │                                     │
    └─ Low / ambiguous ──► Gemini Vision ─┤
                                          │
                                     Severity Engine
                                          │
                                     Treatment Mapper
                                          │
                                     JSON Response
```

---

## Project Structure

```
aquaguard/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE/
│       └── pull_request_template.md
│
├── ai/                             # AI / ML module
│   ├── models/                     # Trained model artifacts (git-ignored)
│   │   ├── aquaguard_model.keras   #   MobileNetV2 weights (~20 MB)
│   │   ├── class_labels.json
│   │   ├── model_config.json
│   │   ├── training_history.json
│   │   └── confusion_matrix.txt
│   ├── predict.py                  # Inference entry point
│   ├── train_model.py              # Training script
│   ├── knowledge-base.md           # Domain knowledge (RAG source)
│   ├── severity-logic.md           # Severity classification rules
│   ├── treatment-mapping.json      # Disease → treatment protocol map
│   └── requirements.txt
│
├── backend/                        # FastAPI server
│   ├── services/
│   │   ├── aquaguard_service.py    # Detection orchestrator
│   │   ├── domain_classifier.py
│   │   ├── gemini_vision_service.py
│   │   ├── gemini_key_pool.py      # Multi-key round-robin pool
│   │   ├── farm_intelligence.py    # Session analytics engine
│   │   ├── treatment_service.py
│   │   ├── alert_service.py        # Email + PDF alert system
│   │   ├── bulk_predict_service.py
│   │   └── decision_engine.py
│   ├── utils/
│   │   └── image_quality.py
│   ├── main.py                     # FastAPI app — all routes
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                       # React / Vite SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   ├── ChatAssistant.jsx
│   │   │   ├── MobileQRPanel.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   ├── SystemContext.jsx
│   │   │   └── SettingsContext.jsx
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── InspectPage.jsx
│   │   │   ├── BatchScanPage.jsx
│   │   │   ├── AnalyticsPage.jsx
│   │   │   ├── TreatmentPage.jsx
│   │   │   └── ReportsPage.jsx
│   │   ├── utils/
│   │   │   ├── farmIntelligence.js
│   │   │   ├── elevenLabsTTS.js
│   │   │   └── reportGenerator.js
│   │   ├── design-system.css
│   │   └── App.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── data/                           # Dataset placeholder
│   └── README.md                   # Download instructions
│
├── dataset/                        # Raw images — git-ignored (see data/README.md)
│
├── .env.example                    # Combined env reference
├── .gitignore
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

---

## Technology Stack

### Backend
| Layer | Technology | Purpose |
|---|---|---|
| Web Framework | FastAPI | Async REST API with auto-generated OpenAPI docs |
| AI Inference | TensorFlow 2.12+ / Keras | Local CNN disease classification |
| Vision LLM | Google Gemini 2.0 Flash | Fallback vision analysis + chat |
| Image Processing | OpenCV, Pillow | Preprocessing, quality checks |
| Auth | Google OAuth 2.0 + JWT | Secure user authentication |
| Email / Alerts | SMTP + ReportLab | Alert emails with PDF attachments |
| HTTP Client | httpx | Async external API calls |
| Server | Uvicorn (ASGI) | Production ASGI server |

### Frontend
| Layer | Technology | Purpose |
|---|---|---|
| UI Framework | React 19 | Component-based SPA |
| Build Tool | Vite 8 | Lightning-fast dev server + bundler |
| Routing | React Router 7 | Client-side navigation |
| Charts | Recharts | Analytics dashboards |
| Animations | Framer Motion | Page transitions + micro-animations |
| Icons | Lucide React | Consistent icon set |
| Styling | Vanilla CSS + Design Tokens | Custom design system |

---

## Getting Started

### Prerequisites

| Requirement | Version |
|---|---|
| Python | ≥ 3.10 |
| Node.js | ≥ 20 LTS |
| npm | ≥ 10 |

### 1. Clone the Repository

```bash
git clone https://github.com/Team-Nexus-At-NIT/31-poha-pagalu.git
cd 31-poha-pagalu
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys
```

### 3. AI Model Setup

The trained model weights are excluded from Git (too large). Download them from the [Releases](https://github.com/Team-Nexus-At-NIT/31-poha-pagalu/releases) page and place them in `ai/models/`:

```
ai/models/
├── aquaguard_model.keras   ← download this
├── class_labels.json       ← included in repo
└── model_config.json       ← included in repo
```

To retrain from scratch:

```bash
cd ai
pip install -r requirements.txt
# Place dataset in dataset/ (see data/README.md)
python train_model.py
```

### 4. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:8000
```

### 5. Run

**Terminal 1 — Backend:**
```bash
cd backend && source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend && npm run dev
```

- App → **http://localhost:5173**  
- Swagger UI → **http://localhost:8000/docs**

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Gemini API Key Pool — up to 10 keys, auto-rotated on quota exhaustion
# Get free keys: https://aistudio.google.com/apikey
GEMINI_API_KEY_1=your_first_key
GEMINI_API_KEY_2=your_second_key

# Google OAuth — https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# JWT — generate with: openssl rand -base64 32
JWT_SECRET=your_jwt_secret

# ElevenLabs TTS
ELEVENLABS_API_KEY=your_key
ELEVENLABS_VOICE_ID=your_voice_id

# SMTP Alert System
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
ALERT_RECIPIENT=alerts@example.com
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

> ⚠️ Never commit `.env` files. Only `.env.example` files belong in version control.

---

## API Reference

All endpoints are documented interactively at `http://localhost:8000/docs`.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/google` | Exchange Google OAuth token for JWT |
| `POST` | `/auth/verify` | Verify JWT and return user info |

### Fish Disease Detection

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/aquaguard/predict` | Single image disease detection |
| `POST` | `/aquaguard/batch` | Batch image processing |
| `POST` | `/aquaguard/chat` | AI chat with aquaculture context |
| `POST` | `/aquaguard/treatment-plan` | Generate treatment plan |
| `GET` | `/aquaguard/farm-intelligence` | Session-based farm health analytics |

### Example — Single Prediction

```bash
curl -X POST http://localhost:8000/aquaguard/predict \
  -H "Authorization: Bearer <jwt_token>" \
  -F "file=@fish_photo.jpg"
```

```json
{
  "disease": "Bacterial diseases - Aeromoniasis",
  "confidence": 0.927,
  "severity": "HIGH",
  "hybrid_method": "local_cnn",
  "treatment": {
    "immediate": ["Isolate affected fish", "Increase aeration"],
    "medication": ["Oxytetracycline 50mg/kg feed for 10 days"],
    "prevention": ["Test water quality daily", "Reduce stocking density"]
  },
  "scan_id": "aq_20260422_083412_a1b2"
}
```

### Alert System

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/alerts/status` | Get active alert state |
| `POST` | `/alerts/dismiss` | Dismiss current alert |
| `GET` | `/alerts/history` | Full alert history |

---

## Disease Classes

The model classifies into **7 categories** from the Freshwater Fish Disease Aquaculture in South Asia dataset:

| Class | Type | Severity | Key Symptoms |
|---|---|---|---|
| Bacterial diseases - Aeromoniasis | Bacterial | HIGH → CRITICAL | Open sores, fin rot, bloating |
| Bacterial gill disease | Bacterial | HIGH → CRITICAL | Swollen gills, surface gasping |
| Bacterial Red disease (EUS) | Bacterial + Fungal | EXTREME | Large spreading ulcers |
| Fungal diseases - Saprolegniasis | Fungal | MODERATE | Cotton-like white tufts |
| Parasitic diseases | Parasitic | MODERATE → HIGH | Scratching, white dots, flashing |
| Viral diseases - White tail disease | Viral | EXTREME | Tail whitening, erratic swimming |
| Healthy Fish | — | NONE | Normal coloration, active swimming |

---

## Dataset

**Name:** Freshwater Fish Disease Aquaculture in South Asia  
**Source:** [Kaggle](https://www.kaggle.com/datasets)  
**Classes:** 7 | **Split:** Train / Test  
**Local path:** `dataset/` (git-ignored — see `data/README.md` for download instructions)

The dataset is not included in this repository due to file size. The `.gitignore` excludes `dataset/` automatically.

---

## Model Performance

| Metric | Value |
|---|---|
| Overall Accuracy | ~92% |
| Architecture | MobileNetV2 (transfer learning) |
| Input Shape | 224 × 224 × 3 |
| Optimizer | Adam |
| Loss | Categorical Cross-Entropy |

Detailed per-class metrics are in `ai/models/confusion_matrix.txt`.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork → feature branch → commit (Conventional Commits) → PR

---

## License

MIT License — see [LICENSE](LICENSE).

---

<div align="center">
  Made with ❤️ for South Asian aquaculture farmers<br/>
  <sub>Built with FastAPI · React · TensorFlow · Google Gemini</sub>
</div>
