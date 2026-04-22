# UI/UX Design System: AquaGuard

This document outlines the visual identity and interface architecture for AquaGuard. The goal is to quickly adapt the existing SmartEdge UI into a premium, clean, and trustworthy aquaculture platform, heavily inspired by modern SaaS designs (e.g., Stripe, Notion).

## 1. Design System

### 1.1 Colors
**Theme:** Light Mode ONLY. 
The palette is centered around aquatic blues to emphasize cleanliness, water, and scientific trust, while avoiding clutter.

*   **Primary Blue:** `#2563EB` (Tailwind `blue-600`) - Used for primary actions, active states, and emphasis.
*   **Light Blue Accents:** `#DBEAFE` (Tailwind `blue-100`) - Used for subtle backgrounds, hover states on cards, and secondary badges.
*   **Background (App):** `#F8FAFC` (Tailwind `slate-50`) - Soft off-white to reduce eye strain.
*   **Background (Cards):** `#FFFFFF` - Clean white to make content pop.
*   **Text (Primary):** `#0F172A` (Tailwind `slate-900`) - Dark slate for high contrast readability.
*   **Text (Secondary):** `#64748B` (Tailwind `slate-500`) - For labels, subtitles, and secondary information.

**Semantic Colors (Badges & Alerts):**
*   **Success (Healthy):** `#10B981` (Green)
*   **Warning (Mild/Uncertain):** `#F59E0B` (Amber)
*   **Error/Critical (Severe Disease):** `#EF4444` (Red)

### 1.2 Typography
Clean sans-serif typography (e.g., Inter, Roboto, or system UI fonts) to ensure high readability.

*   **H1 (Page Titles/Hero):** 30px - 36px, Semi-Bold, Tight tracking.
*   **H2 (Section Headers):** 20px - 24px, Medium.
*   **Body Text:** 14px - 16px, Regular, 1.5 line height.
*   **Microcopy (Labels):** 12px, Medium, Slate-500.

### 1.3 Components
*   **Cards:** Clean white backgrounds, subtle borders (`1px solid #E2E8F0`), and very soft shadows. Rounded corners (`rounded-xl`).
*   **Buttons:**
    *   *Primary:* Solid `#2563EB` background, white text, slight hover lift/opacity transition.
    *   *Secondary:* White background, `#2563EB` text, subtle border.
*   **Upload Box:** Large dashed border (`#CBD5E1`), transitions to light blue background on drag-over, featuring a prominent, friendly upload icon.
*   **Badges (Severity):** Small, pill-shaped tags.
    *   `High` -> Red background / white text.
    *   `Medium` -> Amber background / white text.
    *   `Low` -> Green background / white text.

---

## 2. Page Design (SmartEdge Adaptation)

### 2.1 Landing Page
*   **Hero Section:** Clean white background. Bold Headline: "AI Fish Disease Detection." Subheadline explaining the value (e.g., "Instantly diagnose diseases and save your stock").
*   **Primary CTA:** Large "Scan Now" button.
*   **Features Section:** 3-column minimalist layout highlighting: Instant Diagnosis, Treatment Plans, Expert AI Assistant.

### 2.2 Dashboard
*   **Sidebar Navigation:** Minimalist left sidebar with icons.
    *   Menu Items: Home, Scan Fish, Analytics, Chatbot.
    *   Active state indicated by Primary Blue text and a subtle left border highlight.
*   **Main Content Area:**
    *   Top row: High-level metric cards (e.g., "Overall Health Score", "Active Alerts").
    *   Middle row: List or grid of "Recent Detections" showing a small thumbnail, date, and status badge.

### 2.3 Scan Page (Crucial Hackathon Flow)
*   **Layout:** Centralized, focused UI without distractions.
*   **Upload Area:** Large drag-and-drop zone. Text: "Drag image/video here or click to browse."
*   **Mobile Experience:** For mobile users, reuse SmartEdge's native camera trigger to provide a seamless "Tap to Scan" experience directly over the pond.

### 2.4 Result Page
*   **Header:** Large, clear text stating the Disease Name (e.g., "Aeromoniasis Detected").
*   **Hero Image:** The uploaded image preview, displayed cleanly within a rounded container.
*   **Stats Row:**
    *   **Confidence:** Large percentage text (e.g., "94%").
    *   **Severity:** Visual color badge (e.g., `[High Severity]`).
*   **Treatment Card:** A dedicated, visually distinct card (light blue background) listing actionable treatment steps clearly via bullet points.
*   **CTA:** "Ask Chatbot" floating nearby for follow-up questions.

### 2.5 Analytics (Mocked)
*   **Visuals:** Clean, minimal charts (bar charts or line graphs).
*   **Metrics:** "Infections Detected (Last 30 Days)", "Most Common Diseases".
*   **Style:** Minimal grid lines, no clutter, utilizing the primary blue and semantic colors to keep the Stripe-like feel.

### 2.6 Chatbot
*   **Placement:** Persistent floating widget in the bottom-right corner OR a dedicated slide-in side panel.
*   **UI:** Clean chat bubbles (Blue for user, White/Light grey for AI).
*   **Quick Actions:** Pre-filled prompt buttons above the input field to guide the user (e.g., "What is the salt bath dosage?", "Is this contagious?").

---

## 3. UX Details

*   **Loading States:** Avoid generic spinners. Use contextual, reassuring text: *"Analyzing fish health..."* or *"Cross-referencing disease database..."* alongside a smooth, pulsing skeleton loader to make the wait feel deliberate and intelligent.
*   **Error Handling:** Friendly, non-technical error states. E.g., *"Unable to detect clearly. Please try another image with better lighting."*
*   **Transitions:** Fast, crisp CSS transitions (150ms-200ms ease-in-out) on button hovers, modal openings, and page navigations to make the app feel lightweight and instantaneous.
