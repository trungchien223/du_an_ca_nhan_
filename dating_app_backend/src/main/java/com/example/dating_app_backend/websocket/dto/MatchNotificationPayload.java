package com.example.dating_app_backend.websocket.dto;

public record MatchNotificationPayload(
        Integer matchId,
        Integer partnerId
) {
}
