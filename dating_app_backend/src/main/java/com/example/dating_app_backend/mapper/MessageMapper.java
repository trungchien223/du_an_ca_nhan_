package com.example.dating_app_backend.mapper;

import com.example.dating_app_backend.dto.MessageDto;
import com.example.dating_app_backend.entity.Message;
import org.springframework.stereotype.Component;

@Component
public class MessageMapper {

    public MessageDto toDto(Message message) {
        MessageDto dto = new MessageDto();
        dto.setMessageId(message.getMessageId());
        dto.setMatchId(message.getMatch().getMatchId());
        dto.setSenderId(message.getSender().getUserId());
        dto.setSenderName(message.getSender().getFullName());
        dto.setReceiverId(message.getReceiver().getUserId());
        dto.setContent(Boolean.TRUE.equals(message.getIsDeleted()) ? null : message.getContent());
        dto.setMessageType(message.getMessageType().name());
        dto.setIsRead(message.getIsRead());
        dto.setIsDeleted(message.getIsDeleted());
        dto.setDeletedAt(message.getDeletedAt());
        dto.setCreatedAt(message.getCreatedAt());
        return dto;
    }
}
