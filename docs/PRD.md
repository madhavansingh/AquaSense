# Product Requirements Document (PRD)

## 1. Product Overview
**AquaGuard** is an AI-powered fish health monitoring system designed to replace manual inspection with intelligent, real-time disease diagnosis for the aquaculture industry. Built on the robust foundation of the existing SmartEdge platform, AquaGuard leverages machine learning to minimize stock loss and empower farmers with actionable insights.

## 2. Problem Statement
Aquaculture suffers from massive financial losses due to rapid disease outbreaks. The current process relies on manual, visual inspection which is:
- **Slow and Inaccurate:** By the time a farmer manually identifies an issue, the disease has often spread.
- **Resource Intensive:** Inspecting thousands of fish manually is not scalable.
- **Lacking Expertise:** Many farmers lack immediate access to aquatic veterinary experts for accurate diagnosis and treatment plans.

## 3. Target Users
1. **Smallholder Fish Farmers:** Need an accessible, mobile-friendly tool (like QR scanning) for quick, reliable checks without specialized equipment.
2. **Commercial Aquaculture Farms:** Require scalable, rapid dashboard monitoring and aggregate health analytics for large ponds.

## 4. Solution: AquaGuard
AquaGuard transforms the existing SmartEdge defect detection pipeline into a biological health scanner. By feeding images or video frames of fish into our trained classification model, the system instantly identifies diseases, estimates severity, and prescribes treatment.

## 5. Core Features
- **Image-Based Detection:** Instant classification of diseases from uploaded images.
- **Video Frame Analysis:** Extraction and analysis of key frames from video feeds for continuous monitoring.
- **Treatment Suggestions:** Automated, actionable interventions based on the specific disease identified.
- **AI Chatbot Assistant:** A conversational agent trained on aquaculture knowledge to answer follow-up questions from farmers.

## 6. Feature Prioritization

### Must-Have (MVP / Hackathon Scope)
- Core dashboard UI (adapted from SmartEdge).
- Mobile/QR scan flow for quick image capture.
- Image-based disease classification (using the South Asian Freshwater Fish Disease dataset).
- Basic treatment recommendations.

### Good-to-Have (Post-MVP)
- Asynchronous video frame analysis.
- Advanced AI chatbot with contextual memory.
- Historical health trend tracking per pond/batch.

## 7. Success Metrics
- **Model Accuracy:** > 90% classification accuracy on validation datasets.
- **Time to Value:** < 5 seconds from scan to diagnosis report.
- **User Engagement:** Number of scans processed per active user/farm per week.

## 8. Risks & Mitigations
- **Risk:** Poor image quality from farmers (blur, bad lighting).
  - **Mitigation:** Implement a pre-processing check to flag invalid/blurry images before model inference.
- **Risk:** False positives/negatives leading to wrong treatments.
  - **Mitigation:** Display confidence scores clearly. Require a confidence threshold (> 70%) to show a definitive result, otherwise output "Uncertain" and advise manual review.
