package com.example.dating_app_backend.dto;

import lombok.Data;

@Data
public class AuthResponse {
    private String token;
    private Long expiresIn;
    private String refreshToken;
    private Long refreshExpiresIn;
    private AccountDto account;
}

