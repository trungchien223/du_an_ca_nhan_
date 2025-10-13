package com.example.dating_app_backend.service;

import com.example.dating_app_backend.entity.Notification;
import java.util.List;

public interface NotificationService {
    void createNotification(Integer userId, String type, String content);
    List<Notification> getUnreadNotifications(Integer userId);
    void markAsRead(Integer notificationId);
}
