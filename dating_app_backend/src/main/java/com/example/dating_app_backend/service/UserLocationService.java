package com.example.dating_app_backend.service;

import com.example.dating_app_backend.entity.UserLocation;
import java.util.List;
import java.util.Optional;

public interface UserLocationService {
    UserLocation updateLocation(Integer userId, double latitude, double longitude, String address);
    Optional<UserLocation> getByUserId(Integer userId);
    List<UserLocation> findNearby(double lat, double lon, double radiusKm);
}
