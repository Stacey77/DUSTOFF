FROM python:3.12-slim

# iputils-ping gives the container a real `ping` for probes
RUN apt-get update && apt-get install -y --no-install-recommends iputils-ping \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY static ./static
COPY run.py .

ENV NRB_HOST=0.0.0.0 NRB_PORT=8080
EXPOSE 8080
VOLUME ["/srv/data"]

CMD ["python", "run.py"]
