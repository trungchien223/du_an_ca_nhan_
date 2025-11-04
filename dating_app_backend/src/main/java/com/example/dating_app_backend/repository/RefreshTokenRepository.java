package com.example.dating_app_backend.repository;

import com.example.dating_app_backend.entity.Account;
import com.example.dating_app_backend.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByTokenAndRevokedFalse(String token);
    void deleteByAccount(Account account);
}
