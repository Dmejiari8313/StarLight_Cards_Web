import { create } from "zustand";
import { GameMessage } from "../types";

interface WebSocketStore {
  ws: WebSocket | null;
  connect: (
    url: string,
    handlers: {
      onMessage: (message: GameMessage) => void;
      onOpen: () => void;
      onClose: () => void;
      onError: () => void;
    }
  ) => void;
  disconnect: () => void;
  send: (message: GameMessage) => boolean;
}

export const useWebSocketStore = create<WebSocketStore>((set, get) => ({
  ws: null,
  connect: (url, handlers) => {
    get().disconnect();
    const ws = new WebSocket(url);
    ws.onopen = handlers.onOpen;
    ws.onmessage = (event) => {
      try {
        handlers.onMessage(JSON.parse(event.data) as GameMessage);
      } catch {
        handlers.onError();
      }
    };
    ws.onerror = handlers.onError;
    ws.onclose = handlers.onClose;
    set({ ws });
  },
  disconnect: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
      set({ ws: null });
    }
  },
  send: (message) => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  },
}));
