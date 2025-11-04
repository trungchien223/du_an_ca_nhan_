package com.example.dating_app_backend.websocket.dto;

public record TypingIndicatorEvent(
        Integer matchId,
        Integer userId,
        boolean typing
) {
}
