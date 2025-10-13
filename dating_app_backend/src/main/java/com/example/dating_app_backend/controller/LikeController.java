package com.example.dating_app_backend.controller;

import com.example.dating_app_backend.dto.LikeDto;
import com.example.dating_app_backend.entity.Like;
import com.example.dating_app_backend.service.LikeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/likes")
@CrossOrigin("*")
@RequiredArgsConstructor
public class LikeController {

    private final LikeService service;

    @PostMapping("/{senderId}/to/{receiverId}")
    public LikeDto likeUser(@PathVariable Integer senderId, @PathVariable Integer receiverId) {
        Like like = service.likeUser(senderId, receiverId);
        return toDto(like);
    }

    @PostMapping("/{senderId}/pass/{receiverId}")
    public void passUser(@PathVariable Integer senderId, @PathVariable Integer receiverId) {
        service.passUser(senderId, receiverId);
    }

    @GetMapping("/received/{userId}")
    public List<LikeDto> getLikesReceived(@PathVariable Integer userId) {
        return service.getLikesReceived(userId)
                .stream().map(this::toDto)
                .collect(Collectors.toList());
    }

    private LikeDto toDto(Like like) {
        LikeDto dto = new LikeDto();
        dto.setLikeId(like.getLikeId());
        dto.setSenderId(like.getSender().getUserId());
        dto.setSenderName(like.getSender().getFullName());
        dto.setReceiverId(like.getReceiver().getUserId());
        dto.setReceiverName(like.getReceiver().getFullName());
        dto.setStatus(like.getStatus().name());
        return dto;
    }
}
