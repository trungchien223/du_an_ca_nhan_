package com.example.dating_app_backend.controller;

import com.example.dating_app_backend.dto.AccountDto;
import com.example.dating_app_backend.dto.AuthResponse;
import com.example.dating_app_backend.dto.LoginRequest;
import com.example.dating_app_backend.dto.RegisterRequest;
import com.example.dating_app_backend.entity.Account;
import com.example.dating_app_backend.service.AccountService;
import com.example.dating_app_backend.service.JwtService;
import com.example.dating_app_backend.service.UserProfileService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import jakarta.validation.Valid;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api/accounts")
@CrossOrigin("*")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService service;
    private final JwtService jwtService;
    private final UserProfileService userProfileService;


    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        String phone = request.getPhone().trim();

        if (service.existsByPhone(phone)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại đã tồn tại");
        }

        Account account = new Account();
        account.setPhone(phone);
        String email = request.getEmail();
        account.setEmail(email != null && !email.isBlank() ? email.trim() : null);
        account.setPassword(request.getPassword());
        account.setRole(Account.Role.USER);
        account.setStatus(true);

        Account saved = service.register(account);
        userProfileService.createDefaultProfile(saved);
        String token = jwtService.generateToken(saved);
        return toAuthResponse(saved, token);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        String phone = request.getPhone().trim();

        Account account = service.findByPhone(phone)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sai tài khoản hoặc mật khẩu"));

        if (!service.verifyPassword(account, request.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sai tài khoản hoặc mật khẩu");
        }

        String token = jwtService.generateToken(account);
        return toAuthResponse(account, token);
    }

    @PostMapping("/google-login")
    public AuthResponse googleLogin(@RequestBody Map<String, String> body) throws IOException, GeneralSecurityException {
        String idTokenString = body.get("idToken");
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), JacksonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList("402424218465-dm02q0vkgakpd2a75as6506i77f1n4qc.apps.googleusercontent.com"))
                .build();

        GoogleIdToken idToken = verifier.verify(idTokenString);
        if (idToken != null) {
            GoogleIdToken.Payload payload = idToken.getPayload();
            String email = payload.getEmail();
            String name = (String) payload.get("name");
            String avatar = (String) payload.get("picture");

            Account account = service.findByEmail(email)
                    .orElseGet(() -> service.createGoogleAccount(email, name, avatar));

            String token = jwtService.generateToken(account);
            return toAuthResponse(account, token);
        } else {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token không hợp lệ");
        }
    }

    private AccountDto toDto(Account a) {
        AccountDto dto = new AccountDto();
        dto.setAccountId(a.getAccountId());
        dto.setPhone(a.getPhone());
        dto.setEmail(a.getEmail());
        dto.setRole(a.getRole().name());
        dto.setStatus(a.getStatus());
        return dto;
    }

    private AuthResponse toAuthResponse(Account account, String token) {
        AuthResponse response = new AuthResponse();
        response.setToken(token);
        response.setAccount(toDto(account));
        return response;
    }
}
