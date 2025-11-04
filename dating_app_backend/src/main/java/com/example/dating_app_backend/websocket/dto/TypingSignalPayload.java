package com.example.dating_app_backend.websocket.dto;

public record TypingSignalPayload(
        Integer matchId,
        Integer receiverId,
        boolean typing
) {
}
