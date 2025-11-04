package com.example.dating_app_backend.event;

public record MatchCreatedEvent(
        Integer matchId,
        Integer user1Id,
        Integer user2Id
) {
}
