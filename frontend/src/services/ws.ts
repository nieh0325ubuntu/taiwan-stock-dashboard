const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:1681';
const wsUrl = apiBase.replace(/^http/, 'ws') + '/ws/stocks';

let ws: WebSocket | null = null;

export const connectWebSocket = (subscribeCodes: string[], onMessage: (data: any) => void) => {
  if (ws) {
    ws.close();
  }
  ws = new WebSocket(wsUrl);
  ws.onopen = () => {
    ws?.send(JSON.stringify({ subscribe: subscribeCodes }));
  };
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('WS parse error', e);
    }
  };
  ws.onerror = (err) => console.error('WebSocket error', err);
  ws.onclose = () => console.log('WebSocket closed');
};

export const disconnectWebSocket = () => {
  ws?.close();
  ws = null;
};
