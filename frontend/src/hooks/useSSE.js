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

        // ── Phase machine driven by RUN LIFECYCLE, not graph deltas ──
        if (msg.type === 'agent_update' && msg.status === 'running') {
          // First agent starts running → burst phase
          dispatch({ type: 'SET_PHASE', phase: 'burst' });
        }

        if (msg.type === 'graph_update') {
          // Graph is updating → advance toward converge
          dispatch({ type: 'ADVANCE_PHASE' });
        }

        if (msg.type === 'final_output') {
          // Run actually finished → complete
          dispatch({ type: 'SET_PHASE', phase: 'complete' });
        }

        if (msg.type === 'stream_end') {
          es.close();
        }

        // Always dispatch the raw event for the reducer
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
