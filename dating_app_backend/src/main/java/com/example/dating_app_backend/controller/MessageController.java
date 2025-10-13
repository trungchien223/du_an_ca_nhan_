package com.example.dating_app_backend.controller;

import com.example.dating_app_backend.dto.MessageDto;
import com.example.dating_app_backend.entity.Message;
import com.example.dating_app_backend.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin("*")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService service;

    @PostMapping
    public MessageDto sendMessage(
            @RequestParam Integer matchId,
            @RequestParam Integer senderId,
            @RequestParam Integer receiverId,
            @RequestParam String content) {
        return toDto(service.sendMessage(matchId, senderId, receiverId, content));
    }

    @GetMapping("/{matchId}")
    public List<MessageDto> getMessages(@PathVariable Integer matchId) {
        return service.getMessagesByMatch(matchId)
                .stream().map(this::toDto)
                .collect(Collectors.toList());
    }

    private MessageDto toDto(Message m) {
        MessageDto dto = new MessageDto();
        dto.setMessageId(m.getMessageId());
        dto.setMatchId(m.getMatch().getMatchId());
        dto.setSenderId(m.getSender().getUserId());
        dto.setSenderName(m.getSender().getFullName());
        dto.setReceiverId(m.getReceiver().getUserId());
        dto.setContent(m.getContent());
        dto.setMessageType(m.getMessageType().name());
        dto.setIsRead(m.getIsRead());
        dto.setCreatedAt(m.getCreatedAt());
        return dto;
    }
}
