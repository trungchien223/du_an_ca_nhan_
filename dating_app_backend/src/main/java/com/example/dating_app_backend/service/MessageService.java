package com.example.dating_app_backend.service;

import com.example.dating_app_backend.entity.Message;
import java.util.List;

public interface MessageService {
    Message sendMessage(Integer matchId, Integer senderId, Integer receiverId, String content);
    List<Message> getMessagesByMatch(Integer matchId);
    void markAsRead(Integer messageId);
    void markConversationAsRead(Integer matchId, Integer userId);
    Message recallMessage(Integer messageId, Integer requesterId);
}
