package com.example.dating_app_backend.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class MatchDto {
    private Integer matchId;
    private Integer user1Id;
    private String user1Name;
    private Integer user2Id;
    private String user2Name;
    private Double compatibilityScore;
    private LocalDateTime matchedAt;
}
