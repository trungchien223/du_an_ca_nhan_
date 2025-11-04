package com.example.dating_app_backend.controller;

import com.example.dating_app_backend.dto.MessageDto;
import com.example.dating_app_backend.mapper.MessageMapper;
import com.example.dating_app_backend.repository.UserProfileRepository;
import com.example.dating_app_backend.service.MessageService;
import com.example.dating_app_backend.websocket.dto.ChatMessageEvent;
import com.example.dating_app_backend.websocket.dto.MessageStatus;
import com.example.dating_app_backend.websocket.dto.MessageStatusPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin("*")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService service;
    private final MessageMapper messageMapper;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserProfileRepository userProfileRepository;

    @PostMapping
    public MessageDto sendMessage(
            @RequestParam Integer matchId,
            @RequestParam Integer receiverId,
            @RequestParam(required = false) Integer senderId,
            @RequestParam String content,
            @AuthenticationPrincipal Integer accountId) {
        if (accountId == null) {
            throw new IllegalStateException("Không xác định được tài khoản đang đăng nhập.");
        }

        var senderProfile = userProfileRepository.findByAccount_AccountId(accountId)
                .orElseThrow(() -> new IllegalStateException("Không tìm thấy hồ sơ người dùng tương ứng."));
        Integer actualSenderId = senderProfile.getUserId();

        if (senderId != null && !senderId.equals(actualSenderId)) {
            throw new SecurityException("Bạn không được phép gửi tin nhắn thay người khác.");
        }

        var message = service.sendMessage(matchId, actualSenderId, receiverId, content);
        var dto = messageMapper.toDto(message);

        ChatMessageEvent senderEvent = new ChatMessageEvent(dto, MessageStatus.SENT, null);
        ChatMessageEvent receiverEvent = new ChatMessageEvent(dto, MessageStatus.SENT, null);
        MessageStatusPayload delivered = new MessageStatusPayload(
                dto.getMessageId(),
                dto.getMatchId(),
                actualSenderId,
                receiverId,
                MessageStatus.DELIVERED
        );

        messagingTemplate.convertAndSendToUser(
                String.valueOf(actualSenderId),
                "/queue/chat",
                senderEvent
        );

        messagingTemplate.convertAndSendToUser(
                String.valueOf(receiverId),
                "/queue/chat",
                receiverEvent
        );

        messagingTemplate.convertAndSendToUser(
                String.valueOf(senderId),
                "/queue/chat-status",
                delivered
        );

        return dto;
    }

    @GetMapping("/{matchId}")
    public List<MessageDto> getMessages(@PathVariable Integer matchId) {
        return service.getMessagesByMatch(matchId).stream()
                .map(messageMapper::toDto)
                .toList();
    }

    @PostMapping("/{matchId}/read")
    public void markConversationAsRead(
            @PathVariable Integer matchId,
            @RequestParam(required = false) Integer userId,
            @AuthenticationPrincipal Integer accountId) {
        if (accountId == null) {
            throw new IllegalStateException("Không xác định được tài khoản đang đăng nhập.");
        }

        var profile = userProfileRepository.findByAccount_AccountId(accountId)
                .orElseThrow(() -> new IllegalStateException("Không tìm thấy hồ sơ người dùng tương ứng."));
        Integer actualUserId = profile.getUserId();

        if (userId != null && !userId.equals(actualUserId)) {
            throw new SecurityException("Bạn không thể đánh dấu đã đọc thay người khác.");
        }

        service.markConversationAsRead(matchId, actualUserId);
    }
}
