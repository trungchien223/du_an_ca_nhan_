package com.example.dating_app_backend.service.impl;

import com.example.dating_app_backend.entity.Account;
import com.example.dating_app_backend.repository.AccountRepository;
import com.example.dating_app_backend.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final AccountRepository repository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public Optional<Account> findByPhone(String phone) {
        return repository.findByPhone(phone);
    }

    @Override
    public boolean existsByPhone(String phone) {
        return repository.existsByPhone(phone);
    }

    @Override
    public Account register(Account account) {
        account.setPassword(passwordEncoder.encode(account.getPassword()));
        return repository.save(account);
    }

    @Override
    public boolean verifyPassword(Account account, String rawPassword) {
        return passwordEncoder.matches(rawPassword, account.getPassword());
    }

    @Override
    public Optional<Account> findByEmail(String email) {
        return repository.findByEmail(email);
    }

    @Override
    public Account createGoogleAccount(String email, String name, String avatarUrl) {
        Account account = new Account();
        account.setEmail(email);
        account.setPhone(null);
        account.setPassword(passwordEncoder.encode(UUID.randomUUID().toString())); // mật khẩu ngẫu nhiên
        account.setRole(Account.Role.USER);
        account.setStatus(true);
        Account saved = repository.save(account);

        // Nếu bạn có UserProfileService thì tạo hồ sơ mặc định:
        // userProfileService.createGoogleProfile(saved, name, avatarUrl);

        return saved;
    }
}
