package com.example.dating_app_backend.controller;

import com.example.dating_app_backend.dto.PreferenceDto;
import com.example.dating_app_backend.entity.Preference;
import com.example.dating_app_backend.service.PreferenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/preferences")
@CrossOrigin("*")
@RequiredArgsConstructor
public class PreferenceController {

    private final PreferenceService service;

    @GetMapping("/{userId}")
    public PreferenceDto getByUser(@PathVariable Integer userId) {
        return toDto(service.getByUserId(userId));
    }

    @PutMapping("/{userId}")
    public PreferenceDto updatePreference(@PathVariable Integer userId, @RequestBody Preference pref) {
        return toDto(service.updatePreference(userId, pref));
    }

    private PreferenceDto toDto(Preference p) {
        PreferenceDto dto = new PreferenceDto();
        dto.setUserId(p.getUser().getUserId());
        dto.setGenderPreference(p.getGenderPreference().name());
        dto.setAgeMin(p.getAgeMin());
        dto.setAgeMax(p.getAgeMax());
        dto.setMaxDistanceKm(p.getMaxDistanceKm());
        dto.setInterestFilter(p.getInterestFilter());
        return dto;
    }
}
