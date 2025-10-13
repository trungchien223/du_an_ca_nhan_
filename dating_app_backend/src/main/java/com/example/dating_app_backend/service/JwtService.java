package com.example.dating_app_backend.service;

import com.example.dating_app_backend.entity.Account;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Arrays;
import java.util.Date;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;

    private Key signingKey;

    @PostConstruct
    void init() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            keyBytes = Arrays.copyOf(keyBytes, 32);
        }
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(Account account) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expiration);

        return Jwts.builder()
                .setSubject(String.valueOf(account.getAccountId()))
                .claim("phone", account.getPhone())
                .claim("role", account.getRole().name())
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    public Integer extractAccountId(String token) {
        Claims claims = parseClaims(token);
        String subject = claims.getSubject();
        return subject != null ? Integer.valueOf(subject) : null;
    }

    public String extractRole(String token) {
        Claims claims = parseClaims(token);
        return claims.get("role", String.class);
    }

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
