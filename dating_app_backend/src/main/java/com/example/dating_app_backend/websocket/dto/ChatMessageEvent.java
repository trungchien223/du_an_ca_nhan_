package com.example.dating_app_backend.websocket.dto;

import com.example.dating_app_backend.dto.MessageDto;

public record ChatMessageEvent(
        MessageDto message,
        MessageStatus status,
        String clientMessageId
) {
}
