# Dataset — Freshwater Fish Disease Aquaculture in South Asia

This directory is the expected location for the training dataset.  
The actual images are **not tracked by Git** (they are excluded in `.gitignore`).

## Download Instructions

1. Visit the dataset on Kaggle:  
   **[Freshwater Fish Disease Aquaculture in South Asia](https://www.kaggle.com/datasets)**

2. Download and extract the archive into the `dataset/` folder at the repo root so the structure looks like:

```
dataset/
├── Train/
│   ├── Bacterial diseases - Aeromoniasis/
│   ├── Bacterial gill disease/
│   ├── Bacterial Red disease/
│   ├── Fungal diseases Saprolegniasis/
│   ├── Healthy Fish/
│   ├── Parasitic diseases/
│   └── Viral diseases White tail disease/
├── Test/
│   └── (same class folders)
└── Train.csv
```

3. Update the `DATA_DIR` path in `ai/train_model.py` to point here if needed.

## Classes

| Class | Disease Type |
|---|---|
| Bacterial diseases - Aeromoniasis | Bacterial |
| Bacterial gill disease | Bacterial |
| Bacterial Red disease | Bacterial + Fungal |
| Fungal diseases Saprolegniasis | Fungal |
| Healthy Fish | — |
| Parasitic diseases | Parasitic |
| Viral diseases White tail disease | Viral |
