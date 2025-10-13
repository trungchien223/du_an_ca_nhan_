package com.example.dating_app_backend.dto;

import lombok.Data;

@Data
public class PreferenceDto {
    private Integer userId;
    private String genderPreference;
    private Integer ageMin;
    private Integer ageMax;
    private Integer maxDistanceKm;
    private String interestFilter;
}
