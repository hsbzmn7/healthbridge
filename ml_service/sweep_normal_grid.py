"""
Sweep vitals grids and list combinations the trained model classifies as Normal.

Run from ml_service with venv activated:
  cd ml_service
  .\\.venv\\Scripts\\Activate.ps1
  python sweep_normal_grid.py
  python sweep_normal_grid.py --hr-min 60 --hr-max 90 --step 1

Models load once per run (fast). Requires ml_models/*.pkl.
"""
from __future__ import annotations

import argparse
import warnings

# Quiet sklearn pickle / feature-name warnings during grid sweep
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", message=".*InconsistentVersionWarning.*")

import joblib

from predict import MODELS_DIR, create_features


def load_artifacts():
    if not MODELS_DIR.exists():
        raise FileNotFoundError(
            f"Models folder not found: {MODELS_DIR}. "
            "Extract model .pkl files to release_1_backend/ml_models/"
        )
    return {
        "model": joblib.load(MODELS_DIR / "enhanced_best_model.pkl"),
        "scaler": joblib.load(MODELS_DIR / "enhanced_scaler.pkl"),
        "selector": joblib.load(MODELS_DIR / "feature_selector.pkl"),
        "label_encoder": joblib.load(MODELS_DIR / "enhanced_label_encoder.pkl"),
    }


def predict_with_artifacts(a, hr, resp, spo2, height, weight):
    """Same logic as predict.predict() but reuses loaded artifacts."""
    X = create_features(hr, resp, spo2, height, weight)
    X_scaled = a["scaler"].transform(X)
    X_selected = a["selector"].transform(X_scaled)
    pred_proba = a["model"].predict_proba(X_selected)[0]
    pred_idx = a["model"].predict(X_selected)[0]
    le = a["label_encoder"]
    pred_label = le.inverse_transform([pred_idx])[0]
    confidence = float(max(pred_proba))
    probabilities = {}
    for i, class_val in enumerate(a["model"].classes_):
        name = le.inverse_transform([class_val])[0]
        probabilities[name] = float(pred_proba[i])
    return {
        "prediction": pred_label,
        "confidence": round(confidence, 4),
        "probabilities": probabilities,
    }


def main() -> None:
    p = argparse.ArgumentParser(description="Find vitals combos that predict Normal")
    p.add_argument("--height", type=float, default=170)
    p.add_argument("--weight", type=float, default=70)
    p.add_argument("--hr-min", type=int, default=55)
    p.add_argument("--hr-max", type=int, default=120)
    p.add_argument("--resp-min", type=int, default=10)
    p.add_argument("--resp-max", type=int, default=28)
    p.add_argument("--spo2-min", type=int, default=94)
    p.add_argument("--spo2-max", type=int, default=100)
    p.add_argument("--step", type=int, default=2, help="Step for HR and resp integers")
    p.add_argument("--max-print", type=int, default=80, help="Max Normal rows to print")
    args = p.parse_args()

    a = load_artifacts()
    height, weight = args.height, args.weight
    normals: list[tuple[float, float, float, float, dict]] = []
    abnormal_count = 0
    errors: list[str] = []

    hr_range = range(args.hr_min, args.hr_max + 1, args.step)
    resp_range = range(args.resp_min, args.resp_max + 1, args.step)
    spo2_range = range(args.spo2_min, args.spo2_max + 1)

    total = len(hr_range) * len(resp_range) * len(spo2_range)
    print(f"Scanning {total} combinations (height={height}, weight={weight}) ...\n")

    for hr in hr_range:
        for resp in resp_range:
            for spo2 in spo2_range:
                try:
                    r = predict_with_artifacts(
                        a, float(hr), float(resp), float(spo2), height, weight
                    )
                    pred = r.get("prediction")
                    conf = float(r.get("confidence", 0))
                    if pred == "Normal":
                        normals.append((float(hr), float(resp), float(spo2), conf, r.get("probabilities", {})))
                    else:
                        abnormal_count += 1
                except Exception as e:
                    errors.append(f"hr={hr} resp={resp} spo2={spo2}: {e}")

    print(f"Normal: {len(normals)}  |  Abnormal (or other): {abnormal_count}  |  Errors: {len(errors)}")
    if errors:
        print("\nFirst errors:")
        for line in errors[:5]:
            print(" ", line)
        if len(errors) > 5:
            print(f"  ... and {len(errors) - 5} more")

    if not normals:
        print("\nNo Normal predictions in this grid. Widen ranges or reduce --step.")
        return

    normals.sort(key=lambda x: -x[3])

    print(f"\nTop Normal combinations (up to {args.max_print}), columns: hr, resp, spo2, confidence, P(Normal):\n")
    for hr, resp, spo2, conf, probs in normals[: args.max_print]:
        p_n = probs.get("Normal") if isinstance(probs, dict) else None
        print(f"  hr={hr:>3.0f}  resp={resp:>2.0f}  spo2={spo2:>2.0f}  conf={conf:.4f}  P(Normal)={p_n}")

    if len(normals) > args.max_print:
        print(f"\n... {len(normals) - args.max_print} more Normal rows not shown.")


if __name__ == "__main__":
    main()
