package com.example.dating_app_backend.websocket.dto;

public record MessageStatusPayload(
        Integer messageId,
        Integer matchId,
        Integer actorId,
        Integer partnerId,
        MessageStatus status
) {
}
