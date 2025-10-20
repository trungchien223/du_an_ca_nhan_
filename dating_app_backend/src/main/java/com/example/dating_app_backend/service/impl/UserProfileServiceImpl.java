package com.example.dating_app_backend.service.impl;

import com.example.dating_app_backend.entity.Account;
import com.example.dating_app_backend.entity.UserProfile;
import com.example.dating_app_backend.repository.AccountRepository;
import com.example.dating_app_backend.repository.UserProfileRepository;
import com.example.dating_app_backend.repository.UserLocationRepository;
import com.example.dating_app_backend.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserProfileServiceImpl implements UserProfileService {

    private final UserProfileRepository repository;
    private final AccountRepository accountRepository;
    private final UserLocationRepository locationRepository;

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
    public List<UserProfile> findProfilesNearby(Integer userId, int maxDistanceKm) {
        if (maxDistanceKm <= 0) {
            maxDistanceKm = 10;
        }

        UserProfile me = repository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));

        var location = locationRepository.findByUser_UserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bạn chưa cập nhật vị trí."));

        if (location.getLatitude() == null || location.getLongitude() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vị trí của bạn không hợp lệ.");
        }

        return locationRepository.findNearby(location.getLatitude(), location.getLongitude(), maxDistanceKm)
                .stream()
                .map(l -> l.getUser())
                .filter(Objects::nonNull)
                .filter(user -> !user.getUserId().equals(me.getUserId()))
                .filter(UserProfile::isProfileCompleted)
                .collect(Collectors.toList());
    }

    /**
     * ✅ Tìm người phù hợp (gợi ý khác giới)
     */
    @Override
    public List<UserProfile> findCompatibleProfiles(Integer userId) {
        UserProfile me = repository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));

        UserProfile.Gender targetGender = null;
        if (me.getGender() == UserProfile.Gender.Male) {
            targetGender = UserProfile.Gender.Female;
        } else if (me.getGender() == UserProfile.Gender.Female) {
            targetGender = UserProfile.Gender.Male;
        }

        return repository.findCompatibleProfiles(userId, targetGender);
    }
}
