package com.example.dating_app_backend.repository;

import com.example.dating_app_backend.entity.Preference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PreferenceRepository extends JpaRepository<Preference, Integer> {
    Optional<Preference> findByUser_UserId(Integer userId);
}
