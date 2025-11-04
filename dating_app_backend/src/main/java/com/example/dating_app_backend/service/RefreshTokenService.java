package com.example.dating_app_backend.service;

import com.example.dating_app_backend.entity.Account;
import com.example.dating_app_backend.entity.RefreshToken;

public interface RefreshTokenService {
    RefreshToken createToken(Account account);
    RefreshToken rotateToken(String token);
    void revokeToken(String token);
    void revokeAllForAccount(Account account);
}
