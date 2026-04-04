"""
Feature engineering and prediction logic - must match Session 2 notebook exactly.
Input: HR, RESP, SpO2, Height, Weight
Output: Normal or Abnormal

Calibration: the Session 2 classifier can be biased toward "Abnormal" on healthy vitals with
moderate confidence (~0.55–0.65). When readings are in typical ranges AND the model is not
highly confident in Abnormal, we report Normal (see apply_calibration).
"""
import os
import numpy as np
from pathlib import Path

# Max probability below which we treat the model as "uncertain" for calibration
_UNCERTAIN_MAX_PROBA = float(os.environ.get("ML_UNCERTAIN_THRESHOLD", "0.72"))
# Typical consumer vitals — not diagnostic; used only to de-bias misfires

# Path to model files - use env var for Docker, else sibling ml_models folder
MODELS_DIR = Path(os.environ.get("MODELS_PATH", str(Path(__file__).parent.parent / "ml_models")))


def create_features(hr, resp, spo2, height, weight):
    """
    Create all 15 features - matches df_enhanced.drop('OUTPUT') column order.
    Scaler expects 15 features; selector reduces to 10 for the model.
    """
    spo2 = min(float(spo2), 100)  # Cap SpO2 at 100
    bmi = weight / ((height / 100) ** 2)

    hr_spo2_ratio = hr / spo2 if spo2 > 0 else 0
    resp_hr_ratio = resp / hr if hr > 0 else 0
    weight_height_ratio = weight / height if height > 0 else 0

    # HR_category: 0=Low(0-60), 1=Normal(60-100), 2=High(100-150)
    if hr < 60:
        hr_category = 0
    elif hr < 100:
        hr_category = 1
    else:
        hr_category = 2

    # SpO2_category: 0=Low(0-94), 1=Normal(94-98), 2=High(98-120)
    if spo2 < 94:
        spo2_category = 0
    elif spo2 < 98:
        spo2_category = 1
    else:
        spo2_category = 2

    hr_squared = hr ** 2
    spo2_squared = spo2 ** 2
    bmi_squared = bmi ** 2

    health_risk_score = (
        (1 if hr > 100 else 0) +
        (1 if spo2 < 95 else 0) +
        (1 if bmi > 25 else 0) +
        (1 if resp > 20 else 0)
    )

    # Order matches X = df_enhanced.drop('OUTPUT') - 15 features for scaler
    features = [
        hr, resp, spo2,
        height, weight, bmi,
        hr_spo2_ratio, resp_hr_ratio, weight_height_ratio,
        hr_category, spo2_category,
        hr_squared, spo2_squared, bmi_squared,
        health_risk_score,
    ]
    return np.array([features])


def _clinical_typical_ranges(hr, resp, spo2, height, weight):
    """True if vitals look like a healthy adult snapshot (wearable context)."""
    try:
        hr = float(hr)
        resp = float(resp)
        spo2 = float(spo2)
        h = float(height)
        w = float(weight)
    except (TypeError, ValueError):
        return False
    if h <= 0 or w <= 0 or spo2 <= 0:
        return False
    bmi = w / ((h / 100) ** 2)
    return (
        55 <= hr <= 105
        and 10 <= resp <= 24
        and 94 <= spo2 <= 100
        and 17.0 <= bmi <= 32.0
    )


def apply_calibration(pred_label, probabilities, confidence, hr, resp, spo2, height, weight):
    """
    If model says Abnormal but max class prob is low and vitals are in typical ranges,
    report Normal to reduce false alarms from class imbalance / threshold effects.
    """
    note = None
    if pred_label != "Abnormal":
        return pred_label, note
    if not _clinical_typical_ranges(hr, resp, spo2, height, weight):
        return pred_label, note

    p_normal = float(probabilities.get("Normal", 0.0))
    p_abnormal = float(probabilities.get("Abnormal", 0.0))

    # Uncertain winner OR Normal probability is competitive
    uncertain = confidence < _UNCERTAIN_MAX_PROBA
    competitive = p_normal >= 0.32 and (p_abnormal - p_normal) < 0.35

    if uncertain or competitive:
        return "Normal", (
            "Adjusted from screening model output: vitals were in typical ranges and "
            "the model was not highly confident (demo calibration)."
        )

    return pred_label, note


def predict(hr, resp, spo2, height, weight):
    """
    Load models and predict. Returns dict with prediction, confidence, etc.
    """
    import joblib

    models_dir = MODELS_DIR
    if not models_dir.exists():
        raise FileNotFoundError(
            f"Models folder not found: {models_dir}. "
            "Download model_artifacts.zip from JupyterHub (/home/zamanmd/Session/) and extract to release_1_backend/ml_models/"
        )

    model = joblib.load(models_dir / "enhanced_best_model.pkl")
    scaler = joblib.load(models_dir / "enhanced_scaler.pkl")
    selector = joblib.load(models_dir / "feature_selector.pkl")
    label_encoder = joblib.load(models_dir / "enhanced_label_encoder.pkl")

    X = create_features(hr, resp, spo2, height, weight)
    X_scaled = scaler.transform(X)
    X_selected = selector.transform(X_scaled)

    pred_proba = model.predict_proba(X_selected)[0]
    pred_idx = model.predict(X_selected)[0]
    raw_label = label_encoder.inverse_transform([pred_idx])[0]

    confidence = float(max(pred_proba))

    # predict_proba columns follow model.classes_ order — do not assume [0]=Normal, [1]=Abnormal
    probabilities = {}
    for i, class_val in enumerate(model.classes_):
        name = label_encoder.inverse_transform([class_val])[0]
        probabilities[name] = float(pred_proba[i])

    pred_label, cal_note = apply_calibration(
        raw_label, probabilities, confidence, hr, resp, spo2, height, weight
    )
    if pred_label != raw_label:
        # Recompute confidence as max prob under final label for display consistency
        confidence = float(probabilities.get(pred_label, confidence))

    vitals_typical = _clinical_typical_ranges(hr, resp, spo2, height, weight)
    out = {
        "prediction": pred_label,
        "rawModelPrediction": raw_label,
        "confidence": round(confidence, 4),
        "probabilities": probabilities,
        "vitalsInTypicalRanges": vitals_typical,
    }
    if cal_note:
        out["calibrationNote"] = cal_note
    return out
