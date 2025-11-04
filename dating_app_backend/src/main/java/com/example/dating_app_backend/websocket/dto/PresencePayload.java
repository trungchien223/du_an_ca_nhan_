package com.example.dating_app_backend.websocket.dto;

public record PresencePayload(Integer userId, boolean online) {
}
