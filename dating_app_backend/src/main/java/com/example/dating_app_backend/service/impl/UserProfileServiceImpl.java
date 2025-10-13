package com.example.dating_app_backend.service.impl;

import com.example.dating_app_backend.entity.Account;
import com.example.dating_app_backend.entity.UserProfile;
import com.example.dating_app_backend.repository.AccountRepository;
import com.example.dating_app_backend.repository.UserProfileRepository;
import com.example.dating_app_backend.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserProfileServiceImpl implements UserProfileService {

    private final UserProfileRepository repository;
    private final AccountRepository accountRepository;

    /**
     * ✅ Lấy hồ sơ người dùng dựa trên accountId
     */
    @Override
    public UserProfile getProfileByAccountId(Integer accountId) {
        return repository.findByAccount_AccountId(accountId)
                .orElseGet(() -> accountRepository.findById(accountId)
                        .map(this::createDefaultProfile)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ")));
    }

    /**
     * ✅ Cập nhật hồ sơ người dùng
     */
    @Override
    public UserProfile updateProfile(Integer userId, UserProfile updatedProfile) {
        UserProfile existing = repository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tồn tại người dùng"));

        existing.setFullName(updatedProfile.getFullName());
        existing.setGender(updatedProfile.getGender());
        existing.setBirthDate(updatedProfile.getBirthDate());
        existing.setBio(updatedProfile.getBio());
        existing.setJob(updatedProfile.getJob());
        existing.setAvatarUrl(updatedProfile.getAvatarUrl());
        existing.setInterests(updatedProfile.getInterests());
        existing.setProfileCompleted(true);

        return repository.save(existing);
    }

    /**
     * 🆕 ✅ Tạo hồ sơ mặc định ngay sau khi đăng ký tài khoản mới
     */
    @Override
    public UserProfile createDefaultProfile(Account account) {
        UserProfile profile = new UserProfile();
        profile.setAccount(account);
        profile.setFullName("Người dùng mới");
        profile.setGender(UserProfile.Gender.Other);
        profile.setBio("Chưa có mô tả bản thân.");
        profile.setJob("Chưa cập nhật");
        profile.setAvatarUrl("https://i.ibb.co/2qV0QjT/default-avatar.png");
        profile.setProfileCompleted(false);
        return repository.save(profile);
    }


    /**
     * (Tùy chọn) — Tính năng tìm người gần (chưa triển khai)
     */
    @Override
    public List<UserProfile> findProfilesNearby(double lat, double lon, int maxDistanceKm) {
        throw new UnsupportedOperationException("Tính năng tìm người gần chưa được triển khai");
    }

    /**
     * ✅ Tìm người phù hợp (gợi ý khác giới)
     */
    @Override
    public List<UserProfile> findCompatibleProfiles(Integer userId) {
        UserProfile me = repository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));

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
