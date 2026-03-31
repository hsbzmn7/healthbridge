# HealthBridge backend

Node.js API for the HealthBridge app: profiles, manual health entries, alerts, and ML-backed insights via `/model/analyze`.

## Requirements

- Node.js 18+
- MongoDB Atlas URI (or local MongoDB)

## Setup

1. Create a `.env` file in this folder and set `MONGO_URI` (and `PORT`, `SKIP_FIREBASE`, `ML_SERVICE_URL` as needed). Do not commit `.env`.
2. `npm install`
3. `npm start` — server listens on port `7000` by default (`PORT` in `.env`).

Optional Python ML service: see `ml_service/` and mount `ml_models/` with the trained `.pkl` files. Set `ML_SERVICE_URL` in `.env` when the ML service is running.

## Docker

From this directory:

```
docker build -t healthbridge-backend .
docker run -p 7000:7000 --env-file .env healthbridge-backend
```
