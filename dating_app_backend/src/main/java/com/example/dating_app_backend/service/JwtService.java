package com.example.dating_app_backend.service;

import com.example.dating_app_backend.entity.Account;
import io.jsonwebtoken.*;
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
            keyBytes = Arrays.copyOf(keyBytes, 32); // HS256 yêu cầu >= 256 bit
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

    /** ✅ Dùng cho WebSocket + API */
    public boolean isTokenValid(String token) {
        try {
            Claims claims = parseClaims(token);
            Date expirationDate = claims.getExpiration();
            boolean notExpired = expirationDate != null && expirationDate.after(new Date());
            if (!notExpired) {
                System.out.println("❌ Token expired at: " + expirationDate);
            }
            return notExpired;
        } catch (ExpiredJwtException e) {
            System.out.println("❌ Token expired: " + e.getMessage());
            return false;
        } catch (JwtException e) {
            System.out.println("❌ Invalid JWT: " + e.getMessage());
            return false;
        } catch (Exception e) {
            System.out.println("❌ Unknown token error: " + e.getMessage());
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

    public long getExpiration() {
        return expiration;
    }

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
