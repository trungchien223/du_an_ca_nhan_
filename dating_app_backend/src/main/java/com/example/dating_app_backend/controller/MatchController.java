package com.example.dating_app_backend.controller;

import com.example.dating_app_backend.dto.MatchDto;
import com.example.dating_app_backend.entity.Match;
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

    @GetMapping("/user/{userId}")
    public List<MatchDto> getMatchesByUser(@PathVariable Integer userId) {
        return service.getMatchesByUser(userId)
                .stream().map(this::toDto)
                .collect(Collectors.toList());
    }

    private MatchDto toDto(Match m) {
        MatchDto dto = new MatchDto();
        dto.setMatchId(m.getMatchId());
        dto.setUser1Id(m.getUser1().getUserId());
        dto.setUser1Name(m.getUser1().getFullName());
        dto.setUser2Id(m.getUser2().getUserId());
        dto.setUser2Name(m.getUser2().getFullName());
        dto.setCompatibilityScore(m.getCompatibilityScore());
        dto.setMatchedAt(m.getMatchedAt());
        return dto;
    }
}
