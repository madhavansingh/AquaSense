# System Architecture: AquaGuard

AquaGuard relies on a modernized, AI-first architecture that repurposes the existing SmartEdge infrastructure. It decouples the presentation layer from the heavy ML inference workloads.

## 1. Frontend (SmartEdge UI Reused)
*   **Technology:** React / Vite (assumed based on modern stack standards).
*   **Role:** Provides the interactive Dashboard, Scan interface, and Chatbot UI. 
*   **Adaptation:** The existing "defect detection" terminology and UI components are rebranded and restyled for biological health monitoring (e.g., replacing "Defect Type" with "Disease Classification").

## 2. Backend (API Layer)
*   **Technology:** Python (FastAPI/Flask) or Node.js.
*   **Role:** Acts as the central orchestrator. It handles authentication, database CRUD operations for scan history, and routes media to the AI Model pipeline.

## 3. AI Model (Classification Pipeline)
*   **Technology:** PyTorch or TensorFlow, containerized.
*   **Role:** The core inference engine.
*   **Model Details:** A Convolutional Neural Network (CNN) trained on the "Freshwater Fish Disease Aquaculture in south asia" dataset. It classifies inputs into specific disease categories (e.g., Bacterial, Fungal, Parasitic).

## 4. AI Chatbot (Knowledge-Based)
*   **Technology:** LLM API (e.g., OpenAI, Gemini) + RAG (Retrieval-Augmented Generation).
*   **Role:** Provides conversational assistance. It is grounded in aquaculture best practices and uses the context of the recent scan to give relevant advice.

---

## Data Flow Diagram

The life of a scan request follows this path:

1.  **Input:** User uploads an image via the **UI**.
2.  **Transport:** Image is sent via REST API to the **Backend**.
3.  **Preprocessing:** Backend resizes, normalizes, and validates the image.
4.  **Inference:** Preprocessed image is fed to the **AI Model**.
5.  **Classification:** Model outputs a class (e.g., "Aeromoniasis") and a confidence score (e.g., "89%").
6.  **Enrichment:** Backend looks up the recommended treatment for the identified class.
7.  **Output:** JSON payload containing disease, score, and treatment is sent back to the **UI** for rendering.
