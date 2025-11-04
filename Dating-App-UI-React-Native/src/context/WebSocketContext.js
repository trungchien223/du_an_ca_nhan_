import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  websocketEvents,
  websocketService,
} from "../services/websocketService";

const WebSocketContext = createContext(null);

const cleanTypingMap = (map) => {
  const draft = {};
  Object.entries(map).forEach(([matchId, users]) => {
    const filtered = Object.fromEntries(
      Object.entries(users).filter(([, typing]) => typing)
    );
    if (Object.keys(filtered).length) {
      draft[matchId] = filtered;
    }
  });
  return draft;
};

export const WebSocketProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState({});
  const [typingState, setTypingState] = useState({});
  const statusRef = useRef(new Map());
  const [, forceTick] = useState(0);

  useEffect(() => {
    websocketService.connect();

    const offConnection = websocketEvents.on("connection.change", (state) => {
      setConnected(Boolean(state));
    });

    const offPresence = websocketEvents.on("presence.update", (payload) => {
      if (!payload || !payload.userId) return;
      setPresence((prev) => ({
        ...prev,
        [payload.userId]: Boolean(payload.online),
      }));
    });

    const offTyping = websocketEvents.on("chat.typing", (payload) => {
      if (!payload || !payload.matchId || !payload.userId) return;
      setTypingState((prev) => {
        const current = prev[payload.matchId] ?? {};
        const updated = {
          ...current,
          [payload.userId]: Boolean(payload.typing),
        };
        const next = {
          ...prev,
          [payload.matchId]: updated,
        };
        return cleanTypingMap(next);
      });
    });

    const offStatus = websocketEvents.on("chat.status", (payload) => {
      if (!payload || !payload.messageId) return;
      statusRef.current.set(payload.messageId, payload);
      // Force update for consumers using context
      forceTick((tick) => tick + 1);
    });

    return () => {
      offConnection();
      offPresence();
      offTyping();
      offStatus();
      websocketService.disconnect();
    };
  }, []);

  const value = useMemo(
    () => ({
      connected,
      presence,
      typingState,
      messageStatuses: statusRef.current,
      connect: () => websocketService.connect(),
      disconnect: () => websocketService.disconnect(),
      sendChatMessage: (payload) => websocketService.sendChatMessage(payload),
      sendTyping: (payload) => websocketService.sendTyping(payload),
      sendStatus: (payload) => websocketService.sendStatus(payload),
      recallMessage: (payload) => websocketService.recallMessage(payload),
      subscribe: websocketEvents.on,
    }),
    [connected, presence, typingState]
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};
