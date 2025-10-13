package com.example.dating_app_backend.service.impl;

import com.example.dating_app_backend.entity.Preference;
import com.example.dating_app_backend.entity.UserProfile;
import com.example.dating_app_backend.repository.PreferenceRepository;
import com.example.dating_app_backend.repository.UserProfileRepository;
import com.example.dating_app_backend.service.PreferenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PreferenceServiceImpl implements PreferenceService {

    private final PreferenceRepository repository;
    private final UserProfileRepository userRepo;

    @Override
    public Preference getByUserId(Integer userId) {
        return repository.findByUser_UserId(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bộ lọc người dùng"));
    }

    @Override
    @Transactional
    public Preference updatePreference(Integer userId, Preference preference) {
        UserProfile user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        Preference existing = repository.findByUser_UserId(userId)
                .orElse(new Preference());

        existing.setUser(user);
        existing.setGenderPreference(preference.getGenderPreference());
        existing.setAgeMin(preference.getAgeMin());
        existing.setAgeMax(preference.getAgeMax());
        existing.setMaxDistanceKm(preference.getMaxDistanceKm());
        existing.setInterestFilter(preference.getInterestFilter());

        return repository.save(existing);
    }
}
