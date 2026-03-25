import { useEffect, useRef } from 'react';

const BACKEND = import.meta.env.VITE_GRL_BACKEND_URL
  || 'https://governed-research-lab-v2-production.up.railway.app';

export function useSSE(sessionId, dispatch) {
  const esRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;

    const url = `${BACKEND}/stream/${sessionId}`;
    const es = new EventSource(url, { withCredentials: false });
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        // ── Phase machine — driven by RUN LIFECYCLE only ──────────────────
        // First agent running → burst phase
        if (msg.type === 'agent_update' && msg.status === 'running') {
          dispatch({ type: 'SET_PHASE', phase: 'burst' });
        }

        // Graph updating → advance phase (burst→drift→converge)
        // but never to complete — that's final_output only
        if (msg.type === 'graph_update') {
          dispatch({ type: 'ADVANCE_PHASE' });
        }

        // Stability update → extract entropy if present
        if (msg.type === 'stability_update' && msg.entropy != null) {
          dispatch({ type: 'SET_ENTROPY', value: msg.entropy });
        }

        // Run actually finished → complete phase
        if (msg.type === 'final_output') {
          dispatch({ type: 'SET_PHASE', phase: 'complete' });
        }

        if (msg.type === 'stream_end') {
          es.close();
        }

        // Always dispatch raw event for reducer
        dispatch(msg);

      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    es.onerror = (err) => {
      console.warn('SSE connection lost:', err);
      es.close();
    };

    return () => es.close();
  }, [sessionId, dispatch]);

  return esRef;
}
