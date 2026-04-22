# API Design: AquaGuard

This document outlines the core API contracts required to power the AquaGuard frontend interfaces.

## 1. Predict Image
**Endpoint:** `POST /api/v1/predict`
**Description:** Analyzes a single image for fish diseases.

**Request (multipart/form-data):**
*   `file`: The image file (jpg, png).
*   `pond_id` (optional): String identifier for the location.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "scan_id": "scn_12345abc",
    "disease_class": "Aeromoniasis",
    "confidence_score": 0.92,
    "severity": "High",
    "treatment_recommendation": [
      "Isolate affected fish immediately.",
      "Apply Oxytetracycline medicated feed."
    ],
    "is_valid_image": true
  }
}
```

**Edge Case Response (400 Bad Request - Invalid Image):**
```json
{
  "status": "error",
  "error_code": "INVALID_IMAGE",
  "message": "Image is too blurry or no fish detected."
}
```

---

## 2. Analyze Video
**Endpoint:** `POST /api/v1/video-analyze`
**Description:** Accepts a short video, extracts frames, and returns aggregated analysis.

**Request (multipart/form-data):**
*   `file`: The video file (mp4, mov).

**Response (202 Accepted):**
*(Note: Video processing is typically async, returning a job ID to poll, but for a hackathon MVP it might return synchronously if videos are very short.)*
```json
{
  "status": "success",
  "data": {
    "job_id": "job_9876xyz",
    "aggregated_result": {
      "primary_disease_detected": "Fungal Infection",
      "average_confidence": 0.85,
      "frames_analyzed": 15
    }
  }
}
```

---

## 3. Chat with AI Assistant
**Endpoint:** `POST /api/v1/chat`
**Description:** Interacts with the aquaculture knowledge-base chatbot.

**Request (application/json):**
```json
{
  "message": "Is a 5% salt bath safe for fingerlings?",
  "context": {
    "scan_id": "scn_12345abc",
    "disease_detected": "Fungal Infection"
  }
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "reply": "A 5% salt bath might be too harsh for young fingerlings. It is generally recommended to start with a milder 1-2% solution for 10-15 minutes, observing them closely for stress. Since your recent scan detected a Fungal Infection, ensure the water temperature is also optimized.",
    "sources_cited": ["Aquaculture Health Guidelines 2023"]
  }
}
```
