package com.example.dating_app_backend.controller;

import com.example.dating_app_backend.dto.AccountDto;
import com.example.dating_app_backend.entity.Account;
import com.example.dating_app_backend.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/accounts")
@CrossOrigin("*")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService service;

    @PostMapping("/register")
    public AccountDto register(@RequestBody Account account) {
        if (service.existsByPhone(account.getPhone())) {
            throw new RuntimeException("Số điện thoại đã tồn tại");
        }
        Account saved = service.register(account);
        return toDto(saved);
    }

    @PostMapping("/login")
    public AccountDto login(@RequestBody Account request) {
        Account account = service.findByPhone(request.getPhone())
                .orElseThrow(() -> new RuntimeException("Số điện thoại không tồn tại"));
        if (!service.verifyPassword(account, request.getPassword())) {
            throw new RuntimeException("Sai mật khẩu");
        }
        return toDto(account);
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
}
