FROM python:3.11-slim

WORKDIR /app

# Copy requirements first
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY app.py predict.py ./

# Models are mounted at runtime: -v /path/to/ml_models:/app/models
# predict.py expects MODELS_DIR = parent/ml_models, so we need to adjust
# We'll use /app/models as the mount point
ENV MODELS_PATH=/app/models

EXPOSE 5000

CMD ["python", "app.py"]
