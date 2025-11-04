import { Client } from "@stomp/stompjs";
import { API_BASE_URL, getValidAccessToken } from "./authService";

const WS_PATH = "/ws";

const listeners = new Map();

const emit = (event, payload) => {
  const handlers = listeners.get(event);
  if (!handlers) return;
  handlers.forEach((handler) => {
    try {
      handler(payload);
    } catch (error) {
      console.warn(`[WebSocket] listener for ${event} failed`, error);
    }
  });
};

const addListener = (event, handler) => {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  const set = listeners.get(event);
  set.add(handler);
  return () => {
    set.delete(handler);
    if (!set.size) {
      listeners.delete(event);
    }
  };
};

const buildBrokerUrl = (token) => {
  if (!API_BASE_URL) {
    throw new Error("Missing API base URL for WebSocket connection");
  }
  const base = API_BASE_URL.replace(/^http/, "ws");
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${WS_PATH}${separator}token=${encodeURIComponent(token)}`;
};

const generateClientMessageId = () =>
  `local-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.connecting = false;
    this.pendingAcks = new Map();
    this.currentToken = null;
  }

  async connect(options = {}) {
    const { force = false } = options;
    if (this.connecting) {
      return;
    }
    if (!force && this.connected) {
      return;
    }

    let token;
    try {
      token = await getValidAccessToken();
    } catch (error) {
      this.connecting = false;
      this.connected = false;
      emit("connection.change", false);
      console.warn("[WebSocket] Cannot obtain valid token:", error?.message);
      return;
    }

    if (!force && this.client?.active && this.currentToken === token) {
      return;
    }

    if (this.client) {
      try {
        await this.client.deactivate();
      } catch (error) {
        console.warn("[WebSocket] Error during deactivate:", error);
      }
      this.client = null;
    }

    this.connecting = true;

    try {
      this.currentToken = token;
      const brokerURL = buildBrokerUrl(token);
      console.log("[WebSocket] Connecting to", brokerURL);

      this.client = new Client({
        brokerURL,
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        debug: (msg) => console.log("[STOMP]", msg),
        onConnect: () => {
          console.log("[WebSocket] Connected");
          this.connected = true;
          this.connecting = false;
          emit("connection.change", true);
          this.registerSubscriptions();
        },
        onStompError: (frame) => {
          console.warn("[WebSocket] STOMP error:", frame.headers, frame.body);
        },
        onWebSocketError: (event) => {
          console.warn("[WebSocket] transport error:", event?.message ?? event);
        },
        onDisconnect: () => {
          console.warn("[WebSocket] Disconnected");
          this.connected = false;
          emit("connection.change", false);
        },
        onWebSocketClose: (event) => {
          console.warn("[WebSocket] Closed:", event?.code, event?.reason);
          this.connected = false;
          this.connecting = false;
          emit("connection.change", false);

          // Reset current token so we will fetch a fresh one next time
          this.currentToken = null;

          if (event?.code !== 1000 || !event.wasClean) {
            // attempt reconnect on abnormal closure
            setTimeout(() => this.connect({ force: true }), 2000);
          }
        },
      });

      this.client.activate();
    } catch (error) {
      console.warn("[WebSocket] Unable to activate:", error);
      this.connected = false;
      this.connecting = false;
      this.currentToken = null;
    }
  }

  disconnect() {
    if (!this.client) return;
    this.client.deactivate();
    this.client = null;
    this.connected = false;
    this.currentToken = null;
    this.connecting = false;
  }

  registerSubscriptions() {
    if (!this.client || !this.connected) return;

    this.client.subscribe("/user/queue/chat", (message) => {
      const payload = safeParse(message.body);
      if (!payload) return;

      const { clientMessageId } = payload;
      if (clientMessageId && this.pendingAcks.has(clientMessageId)) {
        this.pendingAcks.get(clientMessageId)(payload);
        this.pendingAcks.delete(clientMessageId);
      }

      emit("chat.message", payload);
    });

    this.client.subscribe("/user/queue/chat-status", (message) => {
      const payload = safeParse(message.body);
      if (!payload) return;
      emit("chat.status", payload);
    });

    this.client.subscribe("/user/queue/typing", (message) => {
      const payload = safeParse(message.body);
      if (!payload) return;
      emit("chat.typing", payload);
    });

    this.client.subscribe("/user/queue/match", (message) => {
      const payload = safeParse(message.body);
      if (!payload) return;
      emit("match.new", payload);
    });

    this.client.subscribe("/topic/presence", (message) => {
      const payload = safeParse(message.body);
      if (!payload) return;
      emit("presence.update", payload);
    });
  }

  publish(destination, body) {
    if (!this.client || !this.connected) {
      console.warn("[WebSocket] publish skipped, client not ready.");
      return false;
    }
    this.client.publish({
      destination,
      body: JSON.stringify(body),
    });
    return true;
  }

  sendChatMessage({ matchId, receiverId, content }) {
    if (!matchId || !receiverId || !content?.trim()) {
      throw new Error("Thiếu thông tin để gửi tin nhắn.");
    }
    const clientMessageId = generateClientMessageId();
    const published = this.publish("/app/chat/send", {
      matchId,
      receiverId,
      content: content.trim(),
      clientMessageId,
    });

    if (!published) {
      throw new Error("WebSocket chưa sẵn sàng.");
    }

    const ack = new Promise((resolve) => {
      this.pendingAcks.set(clientMessageId, resolve);
      setTimeout(() => {
        if (this.pendingAcks.has(clientMessageId)) {
          this.pendingAcks.delete(clientMessageId);
          resolve({
            message: null,
            status: "SENT",
            clientMessageId,
            timeout: true,
          });
        }
      }, 8000);
    });

    return { clientMessageId, ack };
  }

  sendTyping({ matchId, receiverId, typing }) {
    if (!this.connected) {
      this.connect();
      return;
    }
    if (!matchId || !receiverId) return;
    this.publish("/app/chat/typing", {
      matchId,
      receiverId,
      typing: Boolean(typing),
    });
  }

  sendStatus({ messageId, matchId, partnerId, status }) {
    if (!this.connected) {
      this.connect();
      return;
    }
    if (!messageId || !matchId || !partnerId || !status) return;
    this.publish("/app/chat/status", {
      messageId,
      matchId,
      partnerId,
      status,
    });
  }

  recallMessage({ messageId, matchId, partnerId }) {
    if (!this.connected) {
      throw new Error("WebSocket chưa sẵn sàng.");
    }
    if (!messageId || !matchId || !partnerId) {
      throw new Error("Thiếu thông tin để thu hồi tin nhắn.");
    }
    this.publish("/app/chat/recall", {
      messageId,
      matchId,
      partnerId,
    });
  }
}

const safeParse = (input) => {
  try {
    return JSON.parse(input);
  } catch (error) {
    console.warn("[WebSocket] Không parse được payload:", error);
    return null;
  }
};

export const websocketService = new WebSocketService();
export const websocketEvents = {
  on: addListener,
  off: (event, handler) => {
    const set = listeners.get(event);
    if (!set) return;
    set.delete(handler);
    if (!set.size) {
      listeners.delete(event);
    }
  },
};
