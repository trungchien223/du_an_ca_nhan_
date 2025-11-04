package com.example.dating_app_backend.websocket.dto;

public record MessageRecallPayload(
        Integer messageId,
        Integer matchId,
        Integer partnerId
) {
}
