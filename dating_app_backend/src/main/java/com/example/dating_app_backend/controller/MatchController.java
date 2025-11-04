package com.example.dating_app_backend.controller;

import com.example.dating_app_backend.dto.MatchDto;
import com.example.dating_app_backend.entity.Match;
import com.example.dating_app_backend.mapper.MessageMapper;
import com.example.dating_app_backend.repository.MessageRepository;
import com.example.dating_app_backend.service.MatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/matches")
@CrossOrigin("*")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService service;
    private final MessageRepository messageRepository;
    private final MessageMapper messageMapper;

    @GetMapping("/user/{userId}")
    public List<MatchDto> getMatchesByUser(@PathVariable Integer userId) {
        return service.getMatchesByUser(userId)
                .stream().map(match -> toDto(match, userId))
                .collect(Collectors.toList());
    }

    private MatchDto toDto(Match m, Integer currentUserId) {
        MatchDto dto = new MatchDto();
        dto.setMatchId(m.getMatchId());
        dto.setUser1Id(m.getUser1().getUserId());
        dto.setUser1Name(m.getUser1().getFullName());
        dto.setUser1AvatarUrl(m.getUser1().getAvatarUrl());
        dto.setUser2Id(m.getUser2().getUserId());
        dto.setUser2Name(m.getUser2().getFullName());
        dto.setUser2AvatarUrl(m.getUser2().getAvatarUrl());
        dto.setCompatibilityScore(m.getCompatibilityScore());
        dto.setMatchedAt(m.getMatchedAt());

        messageRepository.findFirstByMatch_MatchIdOrderByCreatedAtDesc(m.getMatchId())
                .map(messageMapper::toDto)
                .ifPresent(dto::setLastMessage);

        long unread = messageRepository.countByMatch_MatchIdAndReceiver_UserIdAndIsReadFalseAndIsDeletedFalse(
                m.getMatchId(),
                currentUserId
        );
        dto.setUnreadCount(unread);
        return dto;
    }
}
