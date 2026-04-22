# Severity Assessment Logic

AquaGuard uses a dynamic logic system to assign a "Severity" badge (Mild, Moderate, Severe, or Uncertain) to a diagnosis. Because we rely on image classification, the AI's **Confidence Score** is the primary driver for how aggressively we advise the farmer to act.

We map AI Confidence directly to Severity to ensure safety. We do not want to recommend harsh chemicals (Severe action) if the AI is unsure.

## Logic Rules

### 1. Confidence < 60% → "Uncertain" (Warning/Amber)
*   **Meaning:** The AI sees some signs of disease but isn't confident enough to make a strict diagnosis. The image might be blurry, or the symptoms are too faint.
*   **Actionable Output:** 
    *   Do NOT show severe treatment plans.
    *   Prompt the farmer: *"Results uncertain. Please take a clearer photo or consult a local vet."*
    *   Show only "Mild" actions from the `treatment-mapping.json` (e.g., monitor closely, check water quality).

### 2. Confidence 60% – 80% → "Moderate" (Amber)
*   **Meaning:** The AI is fairly certain it has identified the disease, representing a developing or mid-stage infection.
*   **Actionable Output:**
    *   Show "Moderate" actions from the `treatment-mapping.json`.
    *   Recommend immediate isolation of sick fish and preventative pond treatments.

### 3. Confidence > 80% → "Severe" (Red)
*   **Meaning:** The AI is highly confident. Usually, high confidence in a computer vision model means the visual symptoms (ulcers, fungus) are extremely prominent and advanced.
*   **Actionable Output:**
    *   Show "Severe" actions from the `treatment-mapping.json`.
    *   Recommend emergency actions: culling heavily infected stock, applying strong medication, or emergency water changes.

### 4. Special Case: Healthy Class
*   If the predicted class is "Healthy", severity is marked as **"Normal" (Green)** regardless of confidence (though low confidence healthy might prompt a re-scan).

## Why this approach? (Farmer-Friendly Safety)
By tying severity to confidence, we practice "do no harm." If the system is unsure, it recommends safe, general best practices (like water changes). It only prescribes strong, expensive, or potentially dangerous actions when the visual evidence is overwhelming.
