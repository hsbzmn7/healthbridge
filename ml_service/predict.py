"""
Feature engineering and prediction logic - must match Session 2 notebook exactly.
Input: HR, RESP, SpO2, Height, Weight
Output: Normal or Abnormal
"""
import os
import numpy as np
from pathlib import Path

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
    pred_label = label_encoder.inverse_transform([pred_idx])[0]

    confidence = float(max(pred_proba))

    # predict_proba columns follow model.classes_ order — do not assume [0]=Normal, [1]=Abnormal
    probabilities = {}
    for i, class_val in enumerate(model.classes_):
        name = label_encoder.inverse_transform([class_val])[0]
        probabilities[name] = float(pred_proba[i])

    return {
        "prediction": pred_label,
        "confidence": round(confidence, 4),
        "probabilities": probabilities,
    }
