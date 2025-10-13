package com.example.dating_app_backend.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class MessageDto {
    private Integer messageId;
    private Integer matchId;
    private Integer senderId;
    private String senderName;
    private Integer receiverId;
    private String content;
    private String messageType;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
