package com.example.dating_app_backend.service;

import com.example.dating_app_backend.entity.Notification;

import java.util.List;

public interface NotificationService {
    void createNotification(Integer userId, String type, String content);
    void createNotification(Integer userId, Notification.Type type, String content, Integer referenceId, String referenceType);
    void markNotificationsAsRead(Integer userId, Notification.Type type, Integer referenceId);
    List<Notification> getUnreadNotifications(Integer userId);
    List<Notification> getNotifications(Integer userId);
    void markAsRead(Integer notificationId);
}
