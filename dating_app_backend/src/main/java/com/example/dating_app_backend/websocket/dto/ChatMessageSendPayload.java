package com.example.dating_app_backend.websocket.dto;

public record ChatMessageSendPayload(
        Integer matchId,
        Integer receiverId,
        String content,
        String clientMessageId
) {
}
