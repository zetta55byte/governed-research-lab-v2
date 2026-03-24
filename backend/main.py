"""
grl_v2 FastAPI backend


Endpoints:
  POST /run              — start a governed research cycle
  GET  /stream/{id}      — SSE event stream
  GET  /session/{id}     — session status + summary
  GET  /session/{id}/chain — full continuity chain
  GET  /health           — health + stability
"""


import asyncio
import time
import uuid


from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel


from runtime.dispatcher import get_runtime, GovernedRuntime
from core.event_bus import registry


app = FastAPI(title="Governed Research Lab v2", version="2.0.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Session store ─────────────────────────────────────────────────────────────


sessions: dict[str, dict] = {}



@app.get("/test-llm")
async def test_llm():
    import os, httpx
    key = os.getenv("ANTHROPIC_API_KEY", "")
    if not key:
        return {"error": "no key", "key_len": 0}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json={"model": "claude-sonnet-4-5", "max_tokens": 50, "messages": [{"role": "user", "content": "say hi"}]},
            )
            return {"status": resp.status_code, "key_prefix": key[:12], "body": resp.text[:300]}
    except Exception as exc:
        return {"error": str(exc), "key_prefix": key[:12]}

