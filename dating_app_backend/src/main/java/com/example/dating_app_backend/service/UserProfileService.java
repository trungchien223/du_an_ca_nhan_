package com.example.dating_app_backend.service;

import com.example.dating_app_backend.entity.UserProfile;
import java.util.List;

public interface UserProfileService {
    UserProfile getProfileByAccountId(Integer accountId);
    UserProfile updateProfile(Integer userId, UserProfile updatedProfile);
    List<UserProfile> findProfilesNearby(double lat, double lon, int maxDistanceKm);
    List<UserProfile> findCompatibleProfiles(Integer userId);
}
