export function createSSEClient(url, onMessage) {
  let source = null

  function connect() {
    source = new EventSource(url)

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (err) {
        console.error("SSE parse error:", err)
      }
    }

    source.onerror = () => {
      console.warn("SSE disconnected, retrying in 2s…")
      source.close()
      setTimeout(connect, 2000)
    }
  }

  connect()

  return {
    close() {
      if (source) source.close()
    },
  }
}