package com.example.dating_app_backend.websocket;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class PresenceTracker {

    private final Map<Integer, Integer> connections = new ConcurrentHashMap<>();

    public boolean markOnline(Integer userId) {
        final boolean[] becameOnline = {false};
        connections.compute(userId, (id, current) -> {
            if (current == null) {
                becameOnline[0] = true;
                return 1;
            }
            return current + 1;
        });
        return becameOnline[0];
    }

    public boolean markOffline(Integer userId) {
        final boolean[] becameOffline = {false};
        connections.compute(userId, (id, current) -> {
            if (current == null || current <= 1) {
                becameOffline[0] = current != null;
                return null;
            }
            return current - 1;
        });
        return becameOffline[0];
    }

    public boolean isOnline(Integer userId) {
        return connections.containsKey(userId);
    }
}
