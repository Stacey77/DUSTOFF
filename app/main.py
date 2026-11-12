"""AI Network Repair Bot - FastAPI application entrypoint."""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.agents.specialists import register_all
from app.api.routes import router
from app.core.config import settings
from app.core.models import CheckType, Device
from app.core.state import store
from app.monitors.scheduler import monitoring_loop

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


def seed_devices() -> None:
    loaded = store.load_devices()
    if loaded:
        logging.getLogger("main").info("loaded %d persisted device(s)", loaded)
        return
    store.add_device(Device(name="internet-gateway", host="8.8.8.8", check=CheckType.ping, tags=["wan"]))
    store.add_device(Device(name="dns-google", host="8.8.8.8", dns_query="google.com", check=CheckType.dns, tags=["dns"]))
    store.add_device(Device(name="github-https", host="github.com", port=443, check=CheckType.tcp_port, tags=["saas"]))


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_devices()
    register_all()
    task = asyncio.create_task(monitoring_loop(interval=settings.poll_interval))
    yield
    task.cancel()


app = FastAPI(title="AI Network Repair Bot", version="1.0.0", lifespan=lifespan)
app.include_router(router)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")
