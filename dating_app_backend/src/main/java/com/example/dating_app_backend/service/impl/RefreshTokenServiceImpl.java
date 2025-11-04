package com.example.dating_app_backend.service.impl;

import com.example.dating_app_backend.entity.Account;
import com.example.dating_app_backend.entity.RefreshToken;
import com.example.dating_app_backend.repository.RefreshTokenRepository;
import com.example.dating_app_backend.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenServiceImpl implements RefreshTokenService {

    private final RefreshTokenRepository repository;

    @Value("${jwt.refresh-expiration:604800000}")
    private long refreshExpirationMs;

    @Override
    @Transactional
    public RefreshToken createToken(Account account) {
        RefreshToken token = new RefreshToken();
        token.setAccount(account);
        token.setToken(UUID.randomUUID().toString());
        LocalDateTime expiresAt = LocalDateTime.now()
                .plusSeconds(refreshExpirationMs / 1000)
                .plusNanos((refreshExpirationMs % 1000) * 1_000_000L);
        token.setExpiresAt(expiresAt);
        token.setRevoked(false);
        return repository.save(token);
    }

    @Override
    @Transactional
    public RefreshToken rotateToken(String tokenValue) {
        RefreshToken token = repository.findByTokenAndRevokedFalse(tokenValue)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token không hợp lệ"));

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            token.setRevoked(true);
            repository.save(token);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token đã hết hạn");
        }

        token.setRevoked(true);
        repository.save(token);

        return createToken(token.getAccount());
    }

    @Override
    @Transactional
    public void revokeToken(String tokenValue) {
        repository.findByTokenAndRevokedFalse(tokenValue)
                .ifPresent(token -> {
                    token.setRevoked(true);
                    repository.save(token);
                });
    }

    @Override
    @Transactional
    public void revokeAllForAccount(Account account) {
        repository.deleteByAccount(account);
    }
}
