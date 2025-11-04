package com.example.dating_app_backend.dto;

import lombok.Data;

import java.util.List;

@Data
public class NotificationGroupedResponse {
    private List<NotificationDto> unread;
    private List<NotificationDto> read;
}
