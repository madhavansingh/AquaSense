# AquaSense ML Module

## Setup & Training

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Train the model (run from the ai/ folder)
python train_model.py
```

After training completes, you will find:
- `models/aquasense_model.h5`     — The saved Keras model
- `models/class_labels.json`      — Maps class index to disease name
- `models/training_history.json`  — Loss/accuracy per epoch

## Standalone Prediction Test

```bash
python predict.py /path/to/fish/image.jpg
```

## Backend Integration

In your backend API handler, import and call:

```python
from ai.predict import predict

result = predict(image_bytes)  # or a file path
# result is a dict with: disease, confidence, severity, treatment, recommendation
```

## Training Notes
- **Phase 1 (5 epochs):** Only the classification head is trained. Base MobileNetV2 is frozen.
- **Phase 2 (up to 10 epochs):** The top 30 layers of MobileNetV2 are unfrozen and fine-tuned at a low learning rate (1e-5).
- Expected validation accuracy: **85–95%** depending on hardware and dataset quality.
- Training time: ~10-20 minutes on CPU, ~3-5 minutes on GPU.
