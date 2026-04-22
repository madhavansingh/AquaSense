# User Flow: AquaGuard

This document outlines the end-to-end user journey through the AquaGuard platform, detailing both the user experience and the underlying system actions.

## 1. Landing & Authentication
*   **User Action:** User navigates to the AquaGuard web app and enters credentials.
*   **System Action:** Authenticates the user and fetches their specific farm/profile context.

## 2. Dashboard
*   **User Action:** Lands on the main dashboard overview. Views historical scan metrics, recent alerts, and overall farm health status.
*   **System Action:** Loads aggregated scan data from the database. Renders KPI cards and charts (adapted from SmartEdge).

## 3. Scan (Image/Video Capture)
*   **User Action:** Clicks "New Scan" or scans a QR code at a specific pond. Uploads an image or short video of a potentially sick fish.
*   **System Action:**
    *   Validates file type and size.
    *   If video, invokes a background job to extract key frames.
    *   **Edge Case - Invalid Image:** If the image is entirely blurry or doesn't contain a fish, the system immediately rejects it with a prompt: *"Image too blurry or no fish detected. Please take a clearer photo."*

## 4. Result & Diagnosis
*   **User Action:** Views the diagnostic report containing the identified disease, confidence score, and severity. Reads the prescribed treatment recommendations.
*   **System Action:** 
    *   Passes the image/frames through the AI classification model.
    *   Retrieves corresponding treatment protocols from the database based on the predicted class.
    *   **Edge Case - Low Confidence:** If the model's confidence is below 60%, the UI displays: *"Uncertain Diagnosis (Confidence: XX%). Please consult an expert or retake the photo."* It suppresses strong treatment recommendations to prevent harmful actions.

## 5. Chatbot Assistance
*   **User Action:** Clicks the "Ask AI" button on the result screen to ask follow-up questions (e.g., "What is the exact dosage of salt bath for Aeromoniasis?").
*   **System Action:** 
    *   Passes the context of the current scan (Disease, Severity) along with the user's prompt to the LLM.
    *   Returns a domain-specific, helpful response.
