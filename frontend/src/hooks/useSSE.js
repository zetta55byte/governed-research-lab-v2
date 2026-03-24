import { useEffect, useRef } from 'react';

const BACKEND = import.meta.env.VITE_GRL_BACKEND_URL ||
  'https://governed-research-lab-v2-production.up.railway.app';

export function useSSE(sessionId, dispatch) {
  const esRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;

    const url = `${BACKEND}/stream/${sessionId}`;
    const es = new EventSource(url, { withCredentials: false });
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        dispatch(event);
        if (event.type === 'stream_end') es.close();
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
