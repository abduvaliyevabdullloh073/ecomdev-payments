FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && useradd --create-home appuser
COPY --chown=appuser:appuser app ./app
RUN mkdir -p /app/data && chown appuser:appuser /app/data
USER appuser
ENV HOST=0.0.0.0 PORT=8000 DATABASE_PATH=/app/data/payments.sqlite3
EXPOSE 8000
CMD ["python", "-m", "app"]
