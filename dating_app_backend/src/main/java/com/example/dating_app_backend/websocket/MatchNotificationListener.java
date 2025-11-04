package com.example.dating_app_backend.websocket;

import com.example.dating_app_backend.event.MatchCreatedEvent;
import com.example.dating_app_backend.websocket.dto.MatchNotificationPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MatchNotificationListener {

    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleMatchCreated(MatchCreatedEvent event) {
        messagingTemplate.convertAndSendToUser(
                String.valueOf(event.user1Id()),
                "/queue/match",
                new MatchNotificationPayload(event.matchId(), event.user2Id())
        );

        messagingTemplate.convertAndSendToUser(
                String.valueOf(event.user2Id()),
                "/queue/match",
                new MatchNotificationPayload(event.matchId(), event.user1Id())
        );
    }
}
