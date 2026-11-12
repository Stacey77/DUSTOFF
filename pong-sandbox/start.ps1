# Pong Sandbox one-click start (Windows PowerShell)
Set-Location $PSScriptRoot
if (-not (Test-Path .venv)) { python -m venv .venv }
.\.venv\Scripts\python -m pip install -q -r requirements.txt
.\.venv\Scripts\python start.py
