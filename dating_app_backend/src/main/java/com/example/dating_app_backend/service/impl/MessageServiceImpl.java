package com.example.dating_app_backend.service.impl;

import com.example.dating_app_backend.entity.Match;
import com.example.dating_app_backend.entity.Message;
import com.example.dating_app_backend.entity.Notification;
import com.example.dating_app_backend.entity.UserProfile;
import com.example.dating_app_backend.repository.MatchRepository;
import com.example.dating_app_backend.repository.MessageRepository;
import com.example.dating_app_backend.repository.UserProfileRepository;
import com.example.dating_app_backend.service.MessageService;
import com.example.dating_app_backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageServiceImpl implements MessageService {

    private final MessageRepository repository;
    private final MatchRepository matchRepo;
    private final UserProfileRepository userRepo;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public Message sendMessage(Integer matchId, Integer senderId, Integer receiverId, String content) {
        Match match = matchRepo.findById(matchId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy match"));
        UserProfile sender = userRepo.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người gửi"));
        UserProfile receiver = userRepo.findById(receiverId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người nhận"));

        ensureParticipant(match, sender, "Người gửi");
        ensureParticipant(match, receiver, "Người nhận");

        if (sender.getUserId().equals(receiver.getUserId())) {
            throw new RuntimeException("Không thể gửi tin nhắn cho chính mình.");
        }

        String normalizedContent = content == null ? "" : content.trim();
        if (normalizedContent.isEmpty()) {
            throw new RuntimeException("Nội dung tin nhắn không được để trống.");
        }

        Message message = new Message();
        message.setMatch(match);
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent(normalizedContent);
        message.setMessageType(Message.Type.TEXT); // mặc định TEXT, có thể chỉnh IMAGE/AUDIO
        Message saved = repository.save(message);

        String preview = normalizedContent.length() > 140
                ? normalizedContent.substring(0, 137) + "..."
                : normalizedContent;

        notificationService.createNotification(
                receiverId,
                Notification.Type.MESSAGE,
                String.format("%s: %s", sender.getFullName(), preview),
                saved.getMessageId(),
                "MESSAGE"
        );

        return saved;
    }

    @Override
    public List<Message> getMessagesByMatch(Integer matchId) {
        return repository.findByMatch_MatchIdOrderByCreatedAtAsc(matchId);
    }

    @Override
    @Transactional
    public void markAsRead(Integer messageId) {
        Message msg = repository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Tin nhắn không tồn tại"));
        if (Boolean.TRUE.equals(msg.getIsDeleted()) || Boolean.TRUE.equals(msg.getIsRead())) {
            return;
        }
        markMessageAsRead(msg);
        repository.save(msg);
    }

    @Override
    @Transactional
    public void markConversationAsRead(Integer matchId, Integer userId) {
        Match match = matchRepo.findById(matchId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cuộc trò chuyện."));
        UserProfile user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng."));

        ensureParticipant(match, user, "Người dùng");

        List<Message> unreadMessages = repository
                .findByMatch_MatchIdAndReceiver_UserIdAndIsReadFalseAndIsDeletedFalse(matchId, userId);
        if (unreadMessages.isEmpty()) {
            return;
        }
        unreadMessages.forEach(this::markMessageAsRead);
        repository.saveAll(unreadMessages);
    }

    private void markMessageAsRead(Message msg) {
        if (Boolean.TRUE.equals(msg.getIsDeleted())) {
            return;
        }
        msg.setIsRead(true);
        notificationService.markNotificationsAsRead(
                msg.getReceiver().getUserId(),
                Notification.Type.MESSAGE,
                msg.getMessageId()
        );
    }

    @Override
    @Transactional
    public Message recallMessage(Integer messageId, Integer requesterId) {
        Message message = repository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Tin nhắn không tồn tại"));

        if (!message.getSender().getUserId().equals(requesterId)) {
            throw new RuntimeException("Bạn chỉ có thể thu hồi tin nhắn của chính mình");
        }

        if (Boolean.TRUE.equals(message.getIsDeleted())) {
            return message;
        }

        message.setIsDeleted(true);
        message.setDeletedAt(LocalDateTime.now());
        return repository.save(message);
    }

    private void ensureParticipant(Match match, UserProfile user, String role) {
        if (!isParticipant(match, user.getUserId())) {
            throw new RuntimeException(role + " không thuộc cuộc trò chuyện này.");
        }
    }

    private boolean isParticipant(Match match, Integer userId) {
        if (userId == null || match == null) {
            return false;
        }
        return (match.getUser1() != null && userId.equals(match.getUser1().getUserId())) ||
               (match.getUser2() != null && userId.equals(match.getUser2().getUserId()));
    }
}
