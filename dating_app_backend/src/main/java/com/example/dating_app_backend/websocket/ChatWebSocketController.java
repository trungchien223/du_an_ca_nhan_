package com.example.dating_app_backend.websocket;

import com.example.dating_app_backend.dto.MessageDto;
import com.example.dating_app_backend.entity.Message;
import com.example.dating_app_backend.mapper.MessageMapper;
import com.example.dating_app_backend.service.MessageService;
import com.example.dating_app_backend.websocket.dto.ChatMessageEvent;
import com.example.dating_app_backend.websocket.dto.ChatMessageSendPayload;
import com.example.dating_app_backend.websocket.dto.MessageRecallPayload;
import com.example.dating_app_backend.websocket.dto.MessageStatus;
import com.example.dating_app_backend.websocket.dto.MessageStatusPayload;
import com.example.dating_app_backend.websocket.dto.TypingIndicatorEvent;
import com.example.dating_app_backend.websocket.dto.TypingSignalPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.util.StringUtils;

import java.security.Principal;
import java.util.Map;
import java.util.Objects;

@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final MessageService messageService;
    private final MessageMapper messageMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat/send")
    public void handleSendMessage(ChatMessageSendPayload payload, Principal principal) {
        Integer senderId = requireUserId(principal);
        Objects.requireNonNull(payload.matchId(), "matchId is required");
        Objects.requireNonNull(payload.receiverId(), "receiverId is required");

        if (!StringUtils.hasText(payload.content())) {
            throw new IllegalArgumentException("content must not be empty");
        }

        Message message = messageService.sendMessage(
                payload.matchId(),
                senderId,
                payload.receiverId(),
                payload.content().trim()
        );

        MessageDto dto = messageMapper.toDto(message);

        ChatMessageEvent senderEvent = new ChatMessageEvent(dto, MessageStatus.SENT, payload.clientMessageId());
        ChatMessageEvent receiverEvent = new ChatMessageEvent(dto, MessageStatus.SENT, null);
        MessageStatusPayload delivered = new MessageStatusPayload(
                dto.getMessageId(),
                dto.getMatchId(),
                senderId,
                payload.receiverId(),
                MessageStatus.DELIVERED
        );

        // Notify sender (with client correlation id)
        messagingTemplate.convertAndSendToUser(
                String.valueOf(senderId),
                "/queue/chat",
                senderEvent
        );

        // Forward to receiver
        messagingTemplate.convertAndSendToUser(
                String.valueOf(payload.receiverId()),
                "/queue/chat",
                receiverEvent
        );

        // Optimistically mark as delivered for sender UI
        messagingTemplate.convertAndSendToUser(
                String.valueOf(senderId),
                "/queue/chat-status",
                delivered
        );

        // BE: sau khi đọc hoặc gửi tin nhắn
        long unread = messageService.countUnreadMessages(payload.matchId(), payload.receiverId());
        messagingTemplate.convertAndSendToUser(
                String.valueOf(payload.receiverId()),
                "/queue/unread",
                Map.of("matchId", payload.matchId(), "count", unread)
        );

    }

    @MessageMapping("/chat/typing")
    public void handleTyping(TypingSignalPayload payload, Principal principal) {
        Integer senderId = requireUserId(principal);
        Objects.requireNonNull(payload.receiverId(), "receiverId is required");
        Objects.requireNonNull(payload.matchId(), "matchId is required");

        messagingTemplate.convertAndSendToUser(
                String.valueOf(payload.receiverId()),
                "/queue/typing",
                new TypingIndicatorEvent(payload.matchId(), senderId, payload.typing())
        );
    }

    @MessageMapping("/chat/status")
    public void handleStatusUpdate(MessageStatusPayload payload, Principal principal) {
        Integer userId = requireUserId(principal);
        Objects.requireNonNull(payload.matchId(), "matchId is required");
        Objects.requireNonNull(payload.partnerId(), "partnerId is required");
        Objects.requireNonNull(payload.status(), "status is required");

        // ✅ Nếu là READ toàn bộ conversation
        if (payload.status() == MessageStatus.READ && payload.messageId() == null) {
            messageService.markConversationAsRead(payload.matchId(), userId);
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(userId),
                    "/queue/unread",
                    Map.of("matchId", payload.matchId(), "count", 0)
            );

            // Đồng thời báo cho người bên kia rằng người này đã đọc hết
            MessageStatusPayload outbound = new MessageStatusPayload(
                    null,
                    payload.matchId(),
                    userId,
                    payload.partnerId(),
                    MessageStatus.READ
            );
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(payload.partnerId()),
                    "/queue/chat-status",
                    outbound
            );
            return;
        }

        // ✅ Nếu chỉ là cập nhật READ cho 1 message cụ thể
        Objects.requireNonNull(payload.messageId(), "messageId is required");
        if (payload.status() == MessageStatus.READ) {
            messageService.markAsRead(payload.messageId());
        }

        MessageStatusPayload outbound = new MessageStatusPayload(
                payload.messageId(),
                payload.matchId(),
                userId,
                payload.partnerId(),
                payload.status()
        );

        messagingTemplate.convertAndSendToUser(
                String.valueOf(payload.partnerId()),
                "/queue/chat-status",
                outbound
        );

        messagingTemplate.convertAndSendToUser(
                String.valueOf(userId),
                "/queue/chat-status",
                outbound
        );
    }


    @MessageMapping("/chat/recall")
    public void handleRecall(MessageRecallPayload payload, Principal principal) {
        Integer userId = requireUserId(principal);
        Objects.requireNonNull(payload.messageId(), "messageId is required");
        Objects.requireNonNull(payload.matchId(), "matchId is required");
        Objects.requireNonNull(payload.partnerId(), "partnerId is required");

        Message message = messageService.recallMessage(payload.messageId(), userId);
        MessageDto dto = messageMapper.toDto(message);
        if (!dto.getMatchId().equals(payload.matchId())) {
            throw new IllegalArgumentException("matchId không khớp với tin nhắn");
        }

        ChatMessageEvent event = new ChatMessageEvent(dto, MessageStatus.DELETED, null);
        MessageStatusPayload statusPayload = new MessageStatusPayload(
                dto.getMessageId(),
                dto.getMatchId(),
                userId,
                payload.partnerId(),
                MessageStatus.DELETED
        );

        messagingTemplate.convertAndSendToUser(
                String.valueOf(payload.partnerId()),
                "/queue/chat",
                event
        );

        messagingTemplate.convertAndSendToUser(
                String.valueOf(userId),
                "/queue/chat",
                event
        );

        messagingTemplate.convertAndSendToUser(
                String.valueOf(payload.partnerId()),
                "/queue/chat-status",
                statusPayload
        );

        messagingTemplate.convertAndSendToUser(
                String.valueOf(userId),
                "/queue/chat-status",
                statusPayload
        );
    }

    private Integer requireUserId(Principal principal) {
        if (principal == null) {
            throw new IllegalStateException("Missing authenticated principal for WebSocket frame");
        }
        try {
            return Integer.valueOf(principal.getName());
        } catch (NumberFormatException ex) {
            throw new IllegalStateException("Principal name is not a valid user id: " + principal.getName(), ex);
        }
    }
}
