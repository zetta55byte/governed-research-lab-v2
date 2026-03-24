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


# ─── Request models ────────────────────────────────────────────────────────────

class RunRequest(BaseModel):
    query: str
    profile: str = "governance"      # ai_safety | evals | governance | planning | custom
    runtime: str = "claude"          # claude | openai | autogen
    api_key: str = ""


# ─── Routes ────────────────────────────────────────────────────────────────────

@app.post("/run")
async def run_research(req: RunRequest):
    session_id = str(uuid.uuid4())

    runtime: GovernedRuntime = get_runtime(
        runtime=req.runtime,
        session_id=session_id,
        query=req.query,
        profile=req.profile,
        api_key=req.api_key,
    )

    # Register the bus
    registry._buses[session_id] = runtime.bus

    sessions[session_id] = {
        "session_id": session_id,
        "query": req.query,
        "profile": req.profile,
        "runtime": req.runtime,
        "status": "running",
        "created_at": time.time(),
        "runtime_obj": runtime,
    }

    # Run pipeline in background
    asyncio.create_task(_run_pipeline(session_id, runtime))

    return {
        "session_id": session_id,
        "query": req.query,
        "profile": req.profile,
        "runtime": req.runtime,
        "status": "running",
    }


async def _run_pipeline(session_id: str, runtime: GovernedRuntime):
    try:
        result = await runtime.run_cycle()
        if session_id in sessions:
            sessions[session_id]["status"] = "complete"
            sessions[session_id]["result"] = result
    except Exception as exc:
        if session_id in sessions:
            sessions[session_id]["status"] = "error"
            sessions[session_id]["error"] = str(exc)
        await runtime.bus.emit_raw({"type": "error", "message": str(exc)})
        await runtime.bus.emit_raw({"type": "stream_end"})


@app.get("/stream/{session_id}")
async def stream_events(session_id: str):
    bus = registry.get(session_id)
    if not bus:
        raise HTTPException(status_code=404, detail="Session not found")

    return StreamingResponse(
        bus.stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/session/{session_id}")
async def get_session(session_id: str):
    s = sessions.get(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    runtime: GovernedRuntime = s.get("runtime_obj")
    return {
        "session_id": session_id,
        "query": s["query"],
        "profile": s["profile"],
        "runtime": s["runtime"],
        "status": s["status"],
        "stability_score": runtime.stability.current_score() if runtime else 1.0,
        "chain_summary": runtime.chain.summary() if runtime else {},
    }


@app.get("/session/{session_id}/chain")
async def get_chain(session_id: str):
    s = sessions.get(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    runtime: GovernedRuntime = s.get("runtime_obj")
    if not runtime:
        return {"chain": [], "summary": {}}
    return {
        "chain": runtime.chain.to_list(),
        "summary": runtime.chain.summary(),
        "stability_curve": runtime.stability.stability_curve(),
    }


@app.get("/session/{session_id}/graph")
async def get_graph(session_id: str):
    s = sessions.get(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    runtime: GovernedRuntime = s.get("runtime_obj")
    if not runtime:
        return {"nodes": [], "links": []}
    return {
        "nodes": [n.to_dict() for n in runtime.graph_nodes],
        "links": [l.to_dict() for l in runtime.graph_links],
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "2.0.0",
        "active_sessions": len(sessions),
        "constitutional_os_api": "https://constitutional-os-production.up.railway.app",
    }
