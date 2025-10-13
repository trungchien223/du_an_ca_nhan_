package com.example.dating_app_backend.dto;

import com.example.dating_app_backend.entity.UserProfile;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class UserProfileDto {
    private Integer userId;
    private String fullName;
    private UserProfile.Gender gender;
    private LocalDate birthDate;
    private String bio;
    private String job;
    private String avatarUrl;
    private String interests;
    private LocalDateTime lastOnline;
    private boolean profileCompleted;
}
