package com.example.dating_app_backend.dto;

import lombok.Data;

@Data
public class AccountDto {
    private Integer accountId;
    private String phone;
    private String email;
    private String role;
    private Boolean status;
}
