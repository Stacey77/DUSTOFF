"""Optional API-key auth with admin/viewer roles.

Dev-friendly: when NRB_ADMIN_KEY is unset, all requests are treated as
admin (open mode). When set, mutating endpoints require the admin key
via the X-API-Key header; read endpoints accept either key.
"""
from __future__ import annotations

from fastapi import Header, HTTPException

from app.core.config import settings


def _role(api_key: str | None) -> str | None:
    if settings.admin_key and api_key == settings.admin_key:
        return "admin"
    if settings.viewer_key and api_key == settings.viewer_key:
        return "viewer"
    return None


async def require_admin(x_api_key: str | None = Header(default=None)) -> str:
    if not settings.admin_key:
        return "admin"  # open dev mode
    role = _role(x_api_key)
    if role == "admin":
        return role
    raise HTTPException(403, "admin API key required (X-API-Key header)")


async def require_viewer(x_api_key: str | None = Header(default=None)) -> str:
    if not settings.admin_key:
        return "admin"
    role = _role(x_api_key)
    if role:
        return role
    raise HTTPException(401, "valid API key required (X-API-Key header)")
