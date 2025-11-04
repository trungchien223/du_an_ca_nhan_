package com.example.dating_app_backend.websocket;

import com.example.dating_app_backend.websocket.dto.PresencePayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

@Component
@RequiredArgsConstructor
@Slf4j
public class PresenceEventListener {

    private final PresenceTracker presenceTracker;
    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleSessionConnected(SessionConnectEvent event) {
        Principal principal = event.getUser();
        if (principal == null) {
            log.debug("Session connected without principal, ignoring presence update");
            return;
        }

        Integer userId = parseUserId(principal);
        if (userId != null && presenceTracker.markOnline(userId)) {
            messagingTemplate.convertAndSend("/topic/presence", new PresencePayload(userId, true));
        }
    }

    @EventListener
    public void handleSessionDisconnected(SessionDisconnectEvent event) {
        Principal principal = event.getUser();
        if (principal == null) {
            // Attempt fallback via headers if principal is unavailable
            StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(event.getMessage(), StompHeaderAccessor.class);
            if (accessor != null) {
                principal = accessor.getUser();
            }
        }

        if (principal == null) {
            log.debug("Session disconnected without principal, ignoring presence update");
            return;
        }

        Integer userId = parseUserId(principal);
        if (userId != null && presenceTracker.markOffline(userId)) {
            messagingTemplate.convertAndSend("/topic/presence", new PresencePayload(userId, false));
        }
    }

    private Integer parseUserId(Principal principal) {
        try {
            return Integer.valueOf(principal.getName());
        } catch (NumberFormatException ex) {
            log.warn("Unexpected principal name '{}'", principal.getName());
            return null;
        }
    }
}
