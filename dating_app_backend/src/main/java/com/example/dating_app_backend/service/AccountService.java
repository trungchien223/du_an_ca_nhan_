package com.example.dating_app_backend.service;

import com.example.dating_app_backend.entity.Account;
import java.util.Optional;

public interface AccountService {
    Optional<Account> findByPhone(String phone);
    Optional<Account> findByEmail(String email);  // 👈 thêm
    boolean existsByPhone(String phone);
    Account register(Account account);
    boolean verifyPassword(Account account, String rawPassword);

    Account createGoogleAccount(String email, String name, String avatarUrl);  // 👈 thêm
}
