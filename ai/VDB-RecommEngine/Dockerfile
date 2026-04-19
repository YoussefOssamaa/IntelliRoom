# Use a slim version of Python 3.12
FROM python:3.12-slim

# Set the working directory
WORKDIR /app

# Install system dependencies (needed for some Python packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv and leverage pyproject.toml
ENV UV_SYSTEM_PYTHON=1
RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock ./
RUN uv pip install -r pyproject.toml

# Copy the rest of the application code
COPY . .

# Expose the FastAPI port
EXPOSE 7860

# Run the orchestrator
CMD ["python", "intelliroom_local_orchestrator.py"]