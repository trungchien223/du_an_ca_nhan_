package com.example.dating_app_backend.controller;

import com.example.dating_app_backend.dto.NotificationDto;
import com.example.dating_app_backend.dto.NotificationGroupedResponse;
import com.example.dating_app_backend.entity.Notification;
import com.example.dating_app_backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin("*")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService service;

    @GetMapping("/unread/{userId}")
    public List<NotificationDto> getUnread(@PathVariable Integer userId) {
        return service.getUnreadNotifications(userId)
                .stream().map(this::toDto)
                .collect(Collectors.toList());
    }

    @GetMapping("/{userId}")
    public NotificationGroupedResponse getByUser(@PathVariable Integer userId) {
        List<NotificationDto> dtos = service.getNotifications(userId)
                .stream().map(this::toDto)
                .collect(Collectors.toList());

        Map<Boolean, List<NotificationDto>> grouped = dtos.stream()
                .collect(Collectors.partitioningBy(dto -> Boolean.TRUE.equals(dto.getIsRead())));

        NotificationGroupedResponse response = new NotificationGroupedResponse();
        response.setRead(grouped.getOrDefault(true, Collections.emptyList()));
        response.setUnread(grouped.getOrDefault(false, Collections.emptyList()));
        return response;
    }

    private NotificationDto toDto(Notification n) {
        NotificationDto dto = new NotificationDto();
        dto.setNotificationId(n.getNotificationId());
        dto.setType(n.getType().name());
        dto.setContent(n.getContent());
        dto.setReferenceId(n.getReferenceId());
        dto.setReferenceType(n.getReferenceType());
        dto.setIsRead(n.getIsRead());
        dto.setCreatedAt(n.getCreatedAt());
        return dto;
    }
}
