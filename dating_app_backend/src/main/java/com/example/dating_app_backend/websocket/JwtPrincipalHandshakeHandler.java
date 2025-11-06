package com.example.dating_app_backend.websocket;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;

public class JwtPrincipalHandshakeHandler extends DefaultHandshakeHandler {
    @Override
    protected Principal determineUser(ServerHttpRequest request, WebSocketHandler wsHandler, Map<String, Object> attributes) {
        Integer userId = (Integer) attributes.get("userId");
        if (userId == null) return null;
        return () -> String.valueOf(userId);
    }
}

