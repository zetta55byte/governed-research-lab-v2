"""
grl_v2.core.event_bus
======================
Backend SSE event multiplexer.

One endpoint, many event types, all funneled through a single async generator.
The frontend event reducer subscribes and dispatches all events.
"""

import asyncio
import json
from typing import AsyncIterator
from .types import SSEEvent


class EventBus:
    """
    Session-scoped event bus.
    Agents push events; the SSE endpoint pulls them.
    """

    def __init__(self):
        self._queue: asyncio.Queue = asyncio.Queue()
        self._closed = False

    async def emit(self, event: SSEEvent):
        """Push an event onto the bus."""
        if not self._closed:
            await self._queue.put(event.to_dict())

    async def emit_raw(self, event_dict: dict):
        """Push a raw dict event."""
        if not self._closed:
            await self._queue.put(event_dict)

    async def stream(self, timeout: float = 60.0) -> AsyncIterator[str]:
        """
        Async generator that yields SSE-formatted strings.
        Yields heartbeats on timeout to keep connection alive.
        """
        while True:
            try:
                event = await asyncio.wait_for(self._queue.get(), timeout=timeout)
                data = json.dumps(event)
                yield f"data: {data}\n\n"
                if event.get("type") == "stream_end":
                    break
            except asyncio.TimeoutError:
                yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
            except asyncio.CancelledError:
                break

    def close(self):
        self._closed = True


class SessionBusRegistry:
    """Global registry of session buses."""

    def __init__(self):
        self._buses: dict[str, EventBus] = {}

    def create(self, session_id: str) -> EventBus:
        bus = EventBus()
        self._buses[session_id] = bus
        return bus

    def get(self, session_id: str) -> EventBus | None:
        return self._buses.get(session_id)

    def remove(self, session_id: str):
        if session_id in self._buses:
            self._buses[session_id].close()
            del self._buses[session_id]

    def __len__(self):
        return len(self._buses)


# Global registry
registry = SessionBusRegistry()
