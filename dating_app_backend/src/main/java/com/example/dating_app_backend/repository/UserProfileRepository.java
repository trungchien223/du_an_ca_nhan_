package com.example.dating_app_backend.repository;

import com.example.dating_app_backend.entity.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserProfileRepository extends JpaRepository<UserProfile, Integer> {

    Optional<UserProfile> findByAccount_AccountId(Integer accountId);

    // Gợi ý người tương thích (sơ bộ: khác giới tính & chưa bị like)
    @Query("""
        SELECT u FROM UserProfile u
        WHERE u.userId <> :userId
          AND (:gender IS NULL OR u.gender = :gender)
    """)
    List<UserProfile> findCompatibleProfiles(Integer userId, String gender);
}
