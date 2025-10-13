package com.example.dating_app_backend.repository;

import com.example.dating_app_backend.entity.UserLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.List;

public interface UserLocationRepository extends JpaRepository<UserLocation, Integer> {

    Optional<UserLocation> findByUser_UserId(Integer userId);

    // Tìm người trong bán kính (tính theo Haversine)
    @Query("""
        SELECT l FROM UserLocation l
        WHERE (6371 * acos(
            cos(radians(:lat)) * cos(radians(l.latitude))
            * cos(radians(l.longitude) - radians(:lon))
            + sin(radians(:lat)) * sin(radians(l.latitude))
        )) <= :maxDistanceKm
    """)
    List<UserLocation> findNearby(double lat, double lon, int maxDistanceKm);
}
