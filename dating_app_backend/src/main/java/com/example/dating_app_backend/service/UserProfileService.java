package com.example.dating_app_backend.service;

import com.example.dating_app_backend.entity.Account;
import com.example.dating_app_backend.entity.UserProfile;
import java.util.List;

public interface UserProfileService {
    UserProfile getProfileByAccountId(Integer accountId);
    UserProfile updateProfile(Integer userId, UserProfile updatedProfile);
    List<UserProfile> findProfilesNearby(Integer userId, int maxDistanceKm);
    List<UserProfile> findCompatibleProfiles(Integer userId);
    UserProfile createDefaultProfile(Account account);

}
