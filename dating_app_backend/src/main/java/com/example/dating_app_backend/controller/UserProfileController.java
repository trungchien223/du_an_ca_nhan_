package com.example.dating_app_backend.controller;

import com.example.dating_app_backend.dto.UserProfileDto;
import com.example.dating_app_backend.entity.UserProfile;
import com.example.dating_app_backend.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/profiles")
@CrossOrigin("*")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService service;

    @GetMapping("/account/{accountId}")
    public UserProfileDto getByAccountId(@PathVariable Integer accountId) {
        return toDto(service.getProfileByAccountId(accountId));
    }

    @PutMapping("/{userId}")
    public UserProfileDto updateProfile(@PathVariable Integer userId, @RequestBody UserProfile profile) {
        return toDto(service.updateProfile(userId, profile));
    }

    @GetMapping("/{userId}/compatible")
    public List<UserProfileDto> getCompatible(@PathVariable Integer userId) {
        return service.findCompatibleProfiles(userId)
                .stream().map(this::toDto)
                .collect(Collectors.toList());
    }

    private UserProfileDto toDto(UserProfile u) {
        UserProfileDto dto = new UserProfileDto();
        dto.setUserId(u.getUserId());
        dto.setFullName(u.getFullName());
        dto.setGender(u.getGender());
        dto.setBirthDate(u.getBirthDate());
        dto.setBio(u.getBio());
        dto.setJob(u.getJob());
        dto.setAvatarUrl(u.getAvatarUrl());
        dto.setInterests(u.getInterests());
        dto.setLastOnline(u.getLastOnline());
        return dto;
    }
}
