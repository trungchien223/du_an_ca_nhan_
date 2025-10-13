package com.example.dating_app_backend.service.impl;

import com.example.dating_app_backend.entity.UserProfile;
import com.example.dating_app_backend.repository.UserProfileRepository;
import com.example.dating_app_backend.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserProfileServiceImpl implements UserProfileService {

    private final UserProfileRepository repository;

    @Override
    public UserProfile getProfileByAccountId(Integer accountId) {
        return repository.findByAccount_AccountId(accountId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hồ sơ người dùng"));
    }

    @Override
    public UserProfile updateProfile(Integer userId, UserProfile updatedProfile) {
        UserProfile existing = repository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tồn tại user"));

        existing.setFullName(updatedProfile.getFullName());
        existing.setGender(updatedProfile.getGender());
        existing.setBirthDate(updatedProfile.getBirthDate());
        existing.setBio(updatedProfile.getBio());
        existing.setJob(updatedProfile.getJob());
        existing.setAvatarUrl(updatedProfile.getAvatarUrl());
        existing.setInterests(updatedProfile.getInterests());

        return repository.save(existing);
    }

    @Override
    public List<UserProfile> findProfilesNearby(double lat, double lon, int maxDistanceKm) {
        // Có thể implement sau bằng cách inject UserLocationRepository
        // để lọc theo khoảng cách địa lý (Haversine)
        throw new UnsupportedOperationException("Tính năng tìm người gần chưa được triển khai");
    }

    @Override
    public List<UserProfile> findCompatibleProfiles(Integer userId) {
        UserProfile me = repository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        // Gợi ý người khác giới (nếu bạn muốn bao gồm cả 'Other', có thể tùy chỉnh thêm)
        String targetGender;
        if (me.getGender() == UserProfile.Gender.Male) {
            targetGender = "Female";
        } else if (me.getGender() == UserProfile.Gender.Female) {
            targetGender = "Male";
        } else {
            targetGender = "Other";
        }

        return repository.findCompatibleProfiles(userId, targetGender);
    }
}
