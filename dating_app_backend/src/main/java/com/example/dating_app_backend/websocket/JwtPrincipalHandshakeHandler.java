package com.example.dating_app_backend.websocket;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;

public class JwtPrincipalHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(ServerHttpRequest request,
                                      WebSocketHandler wsHandler,
                                      Map<String, Object> attributes) {
        Object userId = attributes.get("userId");
        if (userId instanceof Integer id) {
            return new StompPrincipal(String.valueOf(id));
        }
        Object accountId = attributes.get("accountId");
        if (accountId instanceof Integer account) {
            return new StompPrincipal(String.valueOf(account));
        }

        return super.determineUser(request, wsHandler, attributes);
    }
}
