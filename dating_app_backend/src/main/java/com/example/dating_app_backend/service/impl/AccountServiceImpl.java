package com.example.dating_app_backend.service.impl;

import com.example.dating_app_backend.entity.Account;
import com.example.dating_app_backend.repository.AccountRepository;
import com.example.dating_app_backend.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final AccountRepository repository;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

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
        account.setPassword(encoder.encode(account.getPassword()));
        return repository.save(account);
    }

    @Override
    public boolean verifyPassword(Account account, String rawPassword) {
        return encoder.matches(rawPassword, account.getPassword());
    }
}
