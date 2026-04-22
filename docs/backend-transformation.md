# Backend Transformation Plan: SmartEdge → AquaGuard

This document details the backend engineering strategy to pivot the existing SmartEdge platform into AquaGuard. Our primary goal is to **reuse the existing architecture** while cleanly replacing the core detection intelligence layer.

## 1. System Transformation Plan

To adapt the system rapidly for the hackathon, we will perform a semantic and functional mapping of existing SmartEdge modules to their AquaGuard equivalents. 

**Terminology & Logic Mapping:**
*   **"Inspection"** becomes **"Fish Scan"**
    *   *Backend change:* The core `Inspection` models/tables remain structurally the same but store biological data instead of manufacturing data.
*   **"Defect Detection"** becomes **"Disease Detection"**
    *   *Backend change:* The inference pipeline is swapped from an anomaly/defect model to our new MobileNet classification model.
*   **"Alerts"** becomes **"Infection Alerts"**
    *   *Backend change:* Alert thresholds are updated. Instead of triggering on "manufacturing tolerance", alerts trigger on high-confidence severe disease predictions.
*   **"Analytics"** becomes **"Farm Health Insights"**
    *   *Backend change:* Data aggregation endpoints now group by disease type and pond/batch instead of machine/production line.

---

## 2. Model Integration

We will replace the existing defect detection model with a lightweight, trained MobileNet model optimized for mobile and web inference.

**Execution Steps:**
1.  **Load Model:** Initialize the trained classification model (MobileNet) in memory at startup to minimize latency.
2.  **Preprocess Image:** 
    *   Receive the image buffer from the `POST` request.
    *   Resize to the model's expected input dimensions (e.g., 224x224).
    *   Normalize pixel values as required by MobileNet.
3.  **Predict Class:** Run the forward pass to get the logits, apply softmax to determine the predicted class and confidence.
4.  **Map Result:**
    *   Identify the `disease name`.
    *   Determine `severity` based on the confidence logic (e.g., >80% = severe).
    *   Fetch the corresponding `treatment` from `ai/treatment-mapping.json`.

---

## 3. Final API Design

These are the updated contracts for the intelligent layer, designed to be easily consumed by the adapted frontend.

### `POST /predict`
*   **Input:** Multipart form data containing the `image` file.
*   **Logic:** Runs the standard Model Integration pipeline.
*   **Output:**
```json
{
  "disease": "Aeromoniasis",
  "confidence": 0.92,
  "severity": "severe",
  "treatment": "Mix Oxytetracycline with feed for 7-10 days. Isolate visibly sick fish immediately. Do a 30% water change to improve water quality.",
  "recommendation": "Remove and safely dispose of heavily infected fish to save the rest. Begin full antibiotic treatment."
}
```

### `POST /video-analyze`
*   **Input:** Multipart form data containing the `video` file.
*   **Logic:**
    *   Extract 5–10 representative frames evenly spaced across the video duration.
    *   Run the `/predict` logic concurrently on each frame.
    *   Aggregate the results to find the most frequent prediction.
*   **Output:**
```json
{
  "summary": "Multiple frames indicate a high probability of fungal infection.",
  "detected_cases": 3,
  "dominant_disease": "Fungal"
}
```

### `POST /chat`
*   **Input:** JSON payload containing the `user_question` (e.g., `{"question": "How do I perform a salt bath?"}`).
*   **Logic:** Pass the question to the LLM, prepended with a system prompt that includes context from `ai/knowledge-base.md`.
*   **Output:**
```json
{
  "response": "To perform a salt bath, mix 2-3% non-iodized salt into a separate quarantine tank. Place the affected fish in the bath for 10-15 minutes, observing them closely. Return them to clean water immediately if they show signs of distress."
}
```

---

## 4. Engineering Principles (Hackathon Scope)

To ensure we deliver a working, impressive product within the time constraint, we will adhere to these principles:

*   **Lightweight:** We are not building heavy asynchronous queues (Celery/Redis) unless absolutely necessary. Synchronous inference is acceptable for MVP if model execution is fast.
*   **Fast:** The MobileNet architecture guarantees low latency. Pre-loading the model in memory is mandatory.
*   **Easy to Debug:** Keep the routing straightforward. Log all incoming requests and model confidence scores for easy troubleshooting during the demo.
*   **Hackathon-Ready:** Focus on the "happy path" first. Ensure the integration between the UI, the backend API, and the new ML model is bulletproof before worrying about edge-case infrastructure scaling.
