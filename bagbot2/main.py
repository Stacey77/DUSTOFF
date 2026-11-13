"""Entry point: python main.py  (run from the project directory)."""
import logging
import logging.handlers
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
import uvicorn


def setup_logging() -> None:
    Path("logs").mkdir(exist_ok=True)
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    stream = logging.StreamHandler(sys.stdout)
    stream.setFormatter(fmt)
    rotating = logging.handlers.RotatingFileHandler("logs/bagbot2.log", maxBytes=5_000_000, backupCount=5)
    rotating.setFormatter(fmt)
    root.addHandler(stream)
    root.addHandler(rotating)


if __name__ == "__main__":
    load_dotenv()  # local development only; on servers systemd supplies the environment
    setup_logging()
    host = os.getenv("BAGBOT_HOST", "127.0.0.1")
    port = int(os.getenv("BAGBOT_PORT", "8000"))
    # Single worker only: the paper engine runs as a thread inside this process.
    uvicorn.run("dashboard:app", host=host, port=port, workers=1, log_level="info")
