"""
AquaGuard — Fish Disease Classification Training Pipeline v6
Model  : EfficientNetB0 (Transfer Learning)
Dataset: Freshwater Fish Disease Aquaculture in South Asia

Key insight for v6
------------------
EfficientNetB0 has its own preprocess_input baked into the Keras application.
When you call EfficientNetB0(include_top=False, weights='imagenet'), the
architecture already expects raw [0,255] pixel values — it does NOT expect
manual normalization to [-1,1].

The Rescaling(2,-1) in v4/v5 caused the frozen BatchNorm layers to see
completely unexpected activation distributions during Phase 1, preventing
any learning.

Correct approach:
  - Feed [0,255] directly into EfficientNetB0 (no manual rescaling)
  - EfficientNet internally normalizes per-channel for ImageNet
  - During Phase 1: unfreeze BatchNorm layers so they can adapt to this dataset
  - During Phase 2: fine-tune top-N layers with small LR

Usage:
    python train_model.py

Outputs (ai/models/):
    aquaguard_model.keras  aquaguard_model.h5
    class_labels.json  model_config.json
    training_history.json  confusion_matrix.txt
"""

import os
import json
import time
import numpy as np

# ── macOS Python 3.12 SSL fix ──────────────────────────────────────────────
try:
    import certifi
    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
    os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())
except ImportError:
    pass
# ──────────────────────────────────────────────────────────────────────────

import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import confusion_matrix, classification_report

t_start = time.time()

# ─────────────────────────────────────────────────────────────────────────────
# 1. CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.join(SCRIPT_DIR, "..")

DATASET_NAME = "Freshwater Fish Disease Aquaculture in south asia"
TRAIN_DIR    = os.path.join(PROJECT_ROOT, DATASET_NAME, "Train")
TEST_DIR     = os.path.join(PROJECT_ROOT, DATASET_NAME, "Test")
MODEL_DIR    = os.path.join(SCRIPT_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

IMG_SIZE        = (224, 224)
BATCH_SIZE      = 16
VAL_SPLIT       = 0.15
EPOCHS_PHASE1   = 10
EPOCHS_PHASE2   = 15
LR_HEAD         = 5e-4
LR_FINETUNE     = 1e-5
LABEL_SMOOTHING = 0.05     # mild smoothing only
TEMPERATURE     = 1.3
UNFREEZE_LAYERS = 50       # more layers unfrozen for better fine-tuning
SEED            = 42

print("\n" + "═" * 65)
print("  AquaGuard — Training Pipeline v6 (EfficientNetB0)")
print("═" * 65)
print(f"  TensorFlow : {tf.__version__}")
print(f"  Keras      : {tf.keras.__version__}")
gpus = tf.config.list_physical_devices("GPU")
print(f"  GPU        : {gpus if gpus else 'None (CPU)'}")


# ─────────────────────────────────────────────────────────────────────────────
# 2. DATA ANALYSIS
# ─────────────────────────────────────────────────────────────────────────────

print("\n[1/7] Dataset analysis...")

class_names = sorted([
    d for d in os.listdir(TRAIN_DIR) if os.path.isdir(os.path.join(TRAIN_DIR, d))
])
NUM_CLASSES = len(class_names)

class_counts = {}
for cls in class_names:
    cls_path = os.path.join(TRAIN_DIR, cls)
    n = len([f for f in os.listdir(cls_path)
             if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp"))])
    class_counts[cls] = n

total_imgs = sum(class_counts.values())
max_count  = max(class_counts.values())
for cls, count in sorted(class_counts.items(), key=lambda x: x[1]):
    bar = "█" * int(count / max_count * 20)
    print(f"  {cls:<47}  {count:>5}  {bar}")
print(f"  TOTAL: {total_imgs}  |  Classes: {NUM_CLASSES}")
print(f"  Imbalance ratio: {max_count / min(class_counts.values()):.2f}x")

# Save label mapping
class_labels = {str(i): name for i, name in enumerate(class_names)}
labels_path  = os.path.join(MODEL_DIR, "class_labels.json")
with open(labels_path, "w") as f:
    json.dump(class_labels, f, indent=2)
print(f"  Saved class_labels.json → {class_labels}")


# ─────────────────────────────────────────────────────────────────────────────
# 3. tf.data PIPELINE
#
# KEY: Feed raw [0, 255] uint8 into the model.
# EfficientNetB0 already knows how to preprocess its own inputs.
# No manual Rescaling — just cast to float32.
#
# Augmentation: applied via Keras layers (graph-safe) inside the map.
# No .cache() on training (augmentation must run fresh every epoch).
# ─────────────────────────────────────────────────────────────────────────────

print("\n[2/7] Building tf.data pipeline (raw [0,255] input)...")

AUTOTUNE = tf.data.AUTOTUNE

# Augmentation layers — applied to [0,255] float32
augment = tf.keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.07),
    layers.RandomZoom(height_factor=0.20),
    layers.RandomTranslation(height_factor=0.08, width_factor=0.08),
    layers.RandomContrast(0.20),
], name="augmentation")


def cast_float(images, labels):
    """Cast [0,255] uint8 → float32 (no rescaling — EfficientNet handles it)."""
    return tf.cast(images, tf.float32), labels


def cast_and_augment(images, labels):
    images = tf.cast(images, tf.float32)
    images = augment(images, training=True)
    return images, labels


# Training: no .cache() so augmentation runs fresh each epoch
train_ds = (
    tf.keras.utils.image_dataset_from_directory(
        TRAIN_DIR,
        validation_split=VAL_SPLIT,
        subset="training",
        seed=SEED,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="categorical",
        shuffle=True,
        class_names=class_names,      # explicit ordering — matches class_labels.json
    )
    .map(cast_and_augment, num_parallel_calls=AUTOTUNE)
    .prefetch(AUTOTUNE)
)

# Validation: cache (small, deterministic)
val_ds = (
    tf.keras.utils.image_dataset_from_directory(
        TRAIN_DIR,
        validation_split=VAL_SPLIT,
        subset="validation",
        seed=SEED,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="categorical",
        shuffle=False,
        class_names=class_names,
    )
    .map(cast_float, num_parallel_calls=AUTOTUNE)
    .cache()
    .prefetch(AUTOTUNE)
)

# Test: explicit class_names for consistent label mapping
test_ds = (
    tf.keras.utils.image_dataset_from_directory(
        TEST_DIR,
        seed=SEED,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="categorical",
        shuffle=False,
        class_names=class_names,      # CRITICAL: same order as training
    )
    .map(cast_float, num_parallel_calls=AUTOTUNE)
    .cache()
    .prefetch(AUTOTUNE)
)

train_n = int(total_imgs * (1 - VAL_SPLIT))
val_n   = total_imgs - train_n
print(f"  Train: ~{train_n}  Val: ~{val_n}  Test: {sum(class_counts.values())} (from disk)")


# ─────────────────────────────────────────────────────────────────────────────
# 4. CLASS WEIGHTS
# ─────────────────────────────────────────────────────────────────────────────

print("\n[3/7] Computing class weights...")

y_train_flat = []
for idx, cls in enumerate(class_names):
    n_total = class_counts.get(cls, 0)
    n_train = max(1, round(n_total * (1 - VAL_SPLIT)))
    y_train_flat.extend([idx] * n_train)
y_train_flat = np.array(y_train_flat)

classes = np.arange(NUM_CLASSES)
raw_w   = compute_class_weight("balanced", classes=classes, y=y_train_flat)
raw_w  /= raw_w.mean()
cw_dict = {int(c): float(w) for c, w in zip(classes, raw_w)}

for idx, name in class_labels.items():
    w     = cw_dict.get(int(idx), 1.0)
    count = int(np.sum(y_train_flat == int(idx)))
    print(f"  [{idx}] {name:<47} n={count:>4}  w={w:.3f}")


# ─────────────────────────────────────────────────────────────────────────────
# 5. BUILD MODEL
#
# CORRECT EfficientNetB0 usage:
#   - Input: [0, 255] float32
#   - No manual Rescaling before the base model
#   - EfficientNetB0 applies its own per-channel normalization internally
#   - training=True for the base during Phase 1 to allow BatchNorm adaptation
#   - Freeze only conv weights in Phase 1, unfreeze BatchNorm
# ─────────────────────────────────────────────────────────────────────────────

print("\n[4/7] Building EfficientNetB0 model...")

base_model = EfficientNetB0(
    input_shape=(*IMG_SIZE, 3),
    include_top=False,
    weights="imagenet",
)

# Phase 1: freeze conv weights but allow BatchNorm to adapt (crucial!)
# BatchNorm has running statistics from ImageNet; this dataset is very different
for layer in base_model.layers:
    if isinstance(layer, layers.BatchNormalization):
        layer.trainable = True   # allow BN to adapt to fish images
    else:
        layer.trainable = False  # freeze conv weights

inputs = tf.keras.Input(shape=(*IMG_SIZE, 3), name="image_input")

# NO manual Rescaling — EfficientNetB0 handles its own preprocessing
# training=True because BN layers need to update their stats in Phase 1
x = base_model(inputs, training=True)

# Classification head
x = layers.GlobalAveragePooling2D()(x)
x = layers.BatchNormalization()(x)
x = layers.Dense(
    256, activation="relu",
    kernel_regularizer=tf.keras.regularizers.l2(1e-4),
)(x)
x = layers.BatchNormalization()(x)
x = layers.Dropout(0.45)(x)
outputs = layers.Dense(NUM_CLASSES, activation="softmax", name="predictions")(x)

model = models.Model(inputs, outputs)

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=LR_HEAD),
    loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=LABEL_SMOOTHING),
    metrics=["accuracy"],
)

total_p = model.count_params()
train_p = sum(w.numpy().size for w in model.trainable_weights)
frozen_p = total_p - sum(w.numpy().size for w in base_model.non_trainable_weights
                          if hasattr(w, 'numpy'))
print(f"  Total params     : {total_p:,}")
print(f"  Trainable (P1)   : {train_p:,}  (BN + head only)")


# ─────────────────────────────────────────────────────────────────────────────
# 6. PHASE 1 — Head warm-up + BatchNorm adaptation
# ─────────────────────────────────────────────────────────────────────────────

print(f"\n[5/7] Phase 1: Head + BatchNorm warm-up ({EPOCHS_PHASE1} epochs max)...")

best_ckpt = os.path.join(MODEL_DIR, "best_checkpoint.keras")

callbacks_p1 = [
    EarlyStopping(monitor="val_accuracy", patience=4,
                  restore_best_weights=True, verbose=1),
    tf.keras.callbacks.ReduceLROnPlateau(
        monitor="val_loss", factor=0.5, patience=2,
        min_lr=1e-7, verbose=1,
    ),
    ModelCheckpoint(best_ckpt, monitor="val_accuracy",
                    save_best_only=True, verbose=0),
]

history_p1 = model.fit(
    train_ds,
    epochs=EPOCHS_PHASE1,
    validation_data=val_ds,
    class_weight=cw_dict,
    callbacks=callbacks_p1,
    verbose=1,
)

best_p1 = max(history_p1.history.get("val_accuracy", [0]))
print(f"\n  Phase 1 best val_accuracy: {best_p1 * 100:.2f}%")


# ─────────────────────────────────────────────────────────────────────────────
# 7. PHASE 2 — Fine-tune top layers
# ─────────────────────────────────────────────────────────────────────────────

print(f"\n[6/7] Phase 2: Fine-tune top {UNFREEZE_LAYERS} base layers...")

# ── Critical: reload best Phase-1 weights BEFORE changing trainability.
# Keras 3 + TF 2.x Adam accumulates momentum slots that match the current
# set of trainable variables.  If we flip layer.trainable AFTER fit() the
# slot tensors become stale and shapes mismatch on the next compile.
# Solution: load best weights → mutate trainability → compile fresh.
print("  Loading Phase-1 best checkpoint before unlocking base layers...")
if os.path.exists(best_ckpt):
    model.load_weights(best_ckpt)

base_model.trainable = True
for layer in base_model.layers[:-UNFREEZE_LAYERS]:
    layer.trainable = False

# Force a dummy build pass so variable shapes are registered correctly
# before we hand the model to a brand-new Adam instance.
dummy = tf.zeros([1, *IMG_SIZE, 3])
_ = model(dummy, training=False)

train_steps = (train_n + BATCH_SIZE - 1) // BATCH_SIZE
total_steps = EPOCHS_PHASE2 * train_steps
cosine_lr   = tf.keras.optimizers.schedules.CosineDecay(
    initial_learning_rate=LR_FINETUNE,
    decay_steps=total_steps,
    alpha=LR_FINETUNE * 0.01,
)

# Compile with a FRESH optimizer — no stale slot shapes
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=cosine_lr),
    loss=tf.keras.losses.CategoricalCrossentropy(label_smoothing=LABEL_SMOOTHING),
    metrics=["accuracy"],
)
train_p2 = sum(w.numpy().size for w in model.trainable_weights)
print(f"  Trainable params (P2): {train_p2:,}")

callbacks_p2 = [
    EarlyStopping(monitor="val_accuracy", patience=5,
                  restore_best_weights=True, verbose=1),
    ModelCheckpoint(best_ckpt, monitor="val_accuracy",
                    save_best_only=True, verbose=0),
]

history_p2 = model.fit(
    train_ds,
    epochs=EPOCHS_PHASE2,
    validation_data=val_ds,
    class_weight=cw_dict,
    callbacks=callbacks_p2,
    verbose=1,
)

best_p2 = max(history_p2.history.get("val_accuracy", [0]))
print(f"\n  Phase 2 best val_accuracy: {best_p2 * 100:.2f}%")


# ─────────────────────────────────────────────────────────────────────────────
# 8. EVALUATE
# ─────────────────────────────────────────────────────────────────────────────

print("\n[7/7] Evaluating on test set...")

test_loss, test_acc = model.evaluate(test_ds, verbose=1)
print(f"\n{'═' * 65}")
print(f"  ✅  Final Test Accuracy : {test_acc * 100:.2f}%")
print(f"  📉  Final Test Loss     : {test_loss:.4f}")
print(f"{'═' * 65}")

y_true, y_pred = [], []
for images, labels_batch in test_ds:
    preds = model.predict(images, verbose=0)
    y_true.extend(int(tf.argmax(l)) for l in labels_batch.numpy())
    y_pred.extend(int(tf.argmax(p)) for p in preds)
y_true = np.array(y_true)
y_pred = np.array(y_pred)

print("\n  Per-class accuracy on test set:")
for idx, name in class_labels.items():
    mask    = y_true == int(idx)
    total   = int(np.sum(mask))
    correct = int(np.sum(y_pred[mask] == int(idx)))
    pct     = correct / total * 100 if total else 0
    bar     = "█" * int(pct / 5)
    status  = "✅" if pct >= 60 else "⚠️ " if pct >= 40 else "❌"
    print(f"  {status}  {name:<47} {correct:>3}/{total:<3}  {pct:5.1f}%  {bar}")

cm    = confusion_matrix(y_true, y_pred)
names = [class_labels[str(i)] for i in range(NUM_CLASSES)]
print("\n  Confusion matrix (rows=true, cols=predicted):")
header = "  " + " " * 24 + "  ".join(f"{n[:5]:>5}" for n in names)
print(header)
for i, row in enumerate(cm):
    print(f"  {names[i]:<24}" + "  ".join(f"{v:>5}" for v in row))

cm_path = os.path.join(MODEL_DIR, "confusion_matrix.txt")
with open(cm_path, "w") as f:
    f.write("AquaGuard v6 — Confusion Matrix\n\n")
    f.write(header.strip() + "\n")
    for i, row in enumerate(cm):
        f.write(f"{names[i]:<24}" + "  ".join(f"{v:>5}" for v in row) + "\n")
    f.write("\n--- Classification Report ---\n")
    f.write(classification_report(y_true, y_pred, target_names=names,
                                  zero_division=0))


# ─────────────────────────────────────────────────────────────────────────────
# 9. SAVE
# ─────────────────────────────────────────────────────────────────────────────

keras_path = os.path.join(MODEL_DIR, "aquaguard_model.keras")
h5_path    = os.path.join(MODEL_DIR, "aquaguard_model.h5")
model.save(keras_path)
print(f"\n  ✅  Model (.keras)   → {keras_path}")
model.save(h5_path)
print(f"  ✅  Model (.h5)      → {h5_path}")

config = {
    "architecture"       : "EfficientNetB0",
    "preprocessing"      : "raw_255",      # no manual rescaling; EfficientNet handles it
    "temperature"        : TEMPERATURE,
    "threshold_uncertain": 0.55,
    "threshold_moderate" : 0.73,
    "label_smoothing"    : LABEL_SMOOTHING,
    "img_size"           : list(IMG_SIZE),
    "num_classes"        : NUM_CLASSES,
    "phase1_val_acc"     : round(best_p1, 4),
    "phase2_val_acc"     : round(best_p2, 4),
    "test_acc"           : round(float(test_acc), 4),
}
config_path = os.path.join(MODEL_DIR, "model_config.json")
with open(config_path, "w") as f:
    json.dump(config, f, indent=2)

combined = {}
for key in history_p1.history:
    combined[key] = history_p1.history[key] + history_p2.history.get(key, [])
hist_path = os.path.join(MODEL_DIR, "training_history.json")
with open(hist_path, "w") as f:
    json.dump(combined, f, indent=2)

elapsed = time.time() - t_start
print(f"  ✅  Config/History/Labels saved")
print(f"\n  ⏱️   Total time: {elapsed / 60:.1f} min")
print(f"\n{'═' * 65}")
print("  AquaGuard v6 training complete. 🐟")
print(f"{'═' * 65}\n")
