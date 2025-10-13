package com.example.dating_app_backend.dto;

import lombok.Data;

@Data
public class UserLocationDto {
    private Integer userId;
    private Double latitude;
    private Double longitude;
    private String city;
}
