package com.example.dating_app_backend.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class NotificationDto {
    private Integer notificationId;
    private String type;
    private String content;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
