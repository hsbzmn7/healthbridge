# HealthBridge backend

Node.js API for the HealthBridge app: profiles, manual health entries, alerts, and ML-backed insights via `/model/analyze`.

## Requirements

- Node.js 18+
- MongoDB Atlas URI (or local MongoDB)

## Setup

1. Copy **`.env.example`** to **`.env`** and set secrets. **Never commit `.env`** (it is gitignored).
2. **Production:** `SKIP_FIREBASE=false` and add **`firebase-service-account.json`** from Firebase (gitignored). **Local/Postman without Firebase:** `SKIP_FIREBASE=true` only on dev machines.
3. `npm install`
4. `npm start` — listens on **`PORT`** (default **7000**).

Optional: **`CORS_ORIGIN`** — comma-separated allowed origins for web clients; leave unset to allow any origin (common for mobile backends).

Optional Python ML service: see `ml_service/` and `ml_models/` (`.pkl` files). Set **`ML_SERVICE_URL`** to the Flask service URL in production.

**Testing and Postman** (if your clone includes the parent repo): **`docs/TESTING_AND_ML_LOCAL.md`**.

## Deployment checklist

- [ ] `.env` on server with **`MONGO_URI`**, **`SKIP_FIREBASE=false`**, **`firebase-service-account.json`** beside `app.js` (or adjust auth loading).
- [ ] **`ML_SERVICE_URL`** points to your running ML service (or accept degraded `/model/analyze` if ML is down).
- [ ] **`CORS_ORIGIN`** set if a browser web app must call this API; React Native often works without it.
- [ ] Do **not** ship **`SKIP_FIREBASE=true`** on a public production host.
- [ ] Run **`npm run sanity`** before deploy to verify modules load.

## Docker

From this directory:

```
docker build -t healthbridge-backend .
docker run -p 7000:7000 --env-file .env healthbridge-backend
```
