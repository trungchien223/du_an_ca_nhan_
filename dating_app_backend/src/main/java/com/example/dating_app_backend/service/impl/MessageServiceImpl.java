package com.example.dating_app_backend.service.impl;

import com.example.dating_app_backend.entity.Match;
import com.example.dating_app_backend.entity.Message;
import com.example.dating_app_backend.entity.UserProfile;
import com.example.dating_app_backend.repository.MatchRepository;
import com.example.dating_app_backend.repository.MessageRepository;
import com.example.dating_app_backend.repository.UserProfileRepository;
import com.example.dating_app_backend.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageServiceImpl implements MessageService {

    private final MessageRepository repository;
    private final MatchRepository matchRepo;
    private final UserProfileRepository userRepo;

    @Override
    @Transactional
    public Message sendMessage(Integer matchId, Integer senderId, Integer receiverId, String content) {
        Match match = matchRepo.findById(matchId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy match"));
        UserProfile sender = userRepo.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người gửi"));
        UserProfile receiver = userRepo.findById(receiverId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người nhận"));

        Message message = new Message();
        message.setMatch(match);
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent(content);
        message.setMessageType(Message.Type.TEXT); // mặc định TEXT, có thể chỉnh IMAGE/AUDIO
        return repository.save(message);
    }

    @Override
    public List<Message> getMessagesByMatch(Integer matchId) {
        return repository.findByMatch_MatchIdOrderByCreatedAtAsc(matchId);
    }

    @Override
    public void markAsRead(Integer messageId) {
        Message msg = repository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Tin nhắn không tồn tại"));
        msg.setIsRead(true);
        repository.save(msg);
    }
}
