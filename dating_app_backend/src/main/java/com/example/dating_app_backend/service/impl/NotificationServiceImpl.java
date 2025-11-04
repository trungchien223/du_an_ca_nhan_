package com.example.dating_app_backend.service.impl;

import com.example.dating_app_backend.entity.Notification;
import com.example.dating_app_backend.entity.UserProfile;
import com.example.dating_app_backend.repository.NotificationRepository;
import com.example.dating_app_backend.repository.UserProfileRepository;
import com.example.dating_app_backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository repository;
    private final UserProfileRepository userRepo;

    @Override
    @Transactional
    public void createNotification(Integer userId, String type, String content) {
        Notification.Type notificationType = Notification.Type.valueOf(type.toUpperCase());
        createNotification(userId, notificationType, content, null, null);
    }

    @Override
    @Transactional
    public void createNotification(Integer userId, Notification.Type type, String content, Integer referenceId, String referenceType) {
        UserProfile user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        Notification n = new Notification();
        n.setUser(user);
        n.setType(type);
        n.setContent(content);
        n.setReferenceId(referenceId);
        n.setReferenceType(referenceType != null ? referenceType : type.name());
        repository.save(n);
    }

    @Override
    @Transactional
    public void markNotificationsAsRead(Integer userId, Notification.Type type, Integer referenceId) {
        if (userId == null || type == null || referenceId == null) {
            return;
        }
        List<Notification> notifications = repository
                .findByUser_UserIdAndTypeAndReferenceIdAndIsReadFalse(userId, type, referenceId);
        if (notifications.isEmpty()) {
            return;
        }
        notifications.forEach(n -> n.setIsRead(true));
        repository.saveAll(notifications);
    }

    @Override
    public List<Notification> getUnreadNotifications(Integer userId) {
        return repository.findByUser_UserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    @Override
    public List<Notification> getNotifications(Integer userId) {
        return repository.findByUser_UserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    public void markAsRead(Integer notificationId) {
        Notification n = repository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Không tồn tại thông báo"));
        n.setIsRead(true);
        repository.save(n);
    }
}
