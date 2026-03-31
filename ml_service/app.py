"""
HealthBridge ML Prediction Service
Loads Session 2 models and exposes /predict endpoint.
"""
from flask import Flask, request, jsonify
from predict import predict

app = Flask(__name__)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "healthbridge-ml"})


@app.route("/predict", methods=["POST"])
def predict_route():
    try:
        data = request.get_json() or {}
        hr = float(data.get("hr", 0))
        resp = float(data.get("resp", 0))
        spo2 = float(data.get("spo2", 0))
        height = float(data.get("height", 170))
        weight = float(data.get("weight", 70))

        if hr <= 0 or resp <= 0 or spo2 <= 0:
            return jsonify({"error": "hr, resp, spo2 must be positive"}), 400

        result = predict(hr, resp, spo2, height, weight)
        return jsonify(result)
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
