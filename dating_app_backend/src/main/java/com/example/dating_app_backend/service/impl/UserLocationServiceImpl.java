package com.example.dating_app_backend.service.impl;

import com.example.dating_app_backend.entity.UserLocation;
import com.example.dating_app_backend.entity.UserProfile;
import com.example.dating_app_backend.repository.UserLocationRepository;
import com.example.dating_app_backend.repository.UserProfileRepository;
import com.example.dating_app_backend.service.UserLocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserLocationServiceImpl implements UserLocationService {

    private final UserLocationRepository repository;
    private final UserProfileRepository userRepo;

    @Override
    @Transactional
    public UserLocation updateLocation(Integer userId, double latitude, double longitude, String city) {
        UserProfile user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        UserLocation location = repository.findByUser_UserId(userId)
                .orElse(new UserLocation());

        location.setUser(user);
        location.setLatitude(latitude);
        location.setLongitude(longitude);
        location.setCity(city);
        location.setUpdatedAt(LocalDateTime.now());

        return repository.save(location);
    }

    @Override
    public Optional<UserLocation> getByUserId(Integer userId) {
        return repository.findByUser_UserId(userId);
    }
}
