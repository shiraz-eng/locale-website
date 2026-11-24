FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --create-home atelier && mkdir uploads && chown atelier:atelier uploads
COPY backend/ .
COPY data/studio.json .
COPY data/detail-templates.json .
USER atelier
EXPOSE 8000
CMD ["sh","-c","alembic upgrade head && python seed.py && exec uvicorn main:app --host 0.0.0.0 --port 8000"]
