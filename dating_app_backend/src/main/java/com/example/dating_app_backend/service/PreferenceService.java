package com.example.dating_app_backend.service;

import com.example.dating_app_backend.entity.Preference;

public interface PreferenceService {
    Preference getByUserId(Integer userId);
    Preference updatePreference(Integer userId, Preference preference);
}
