package com.example.dating_app_backend.controller;

import com.example.dating_app_backend.dto.UserLocationDto;
import com.example.dating_app_backend.entity.UserLocation;
import com.example.dating_app_backend.service.UserLocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/locations")
@CrossOrigin("*")
@RequiredArgsConstructor
public class UserLocationController {

    private final UserLocationService service;

    @PutMapping("/{userId}")
    public UserLocationDto updateLocation(
            @PathVariable Integer userId,
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(required = false) String city) {
        UserLocation loc = service.updateLocation(userId, latitude, longitude, city);
        return toDto(loc);
    }

    @GetMapping("/{userId}")
    public UserLocationDto getLocation(@PathVariable Integer userId) {
        Optional<UserLocation> loc = service.getByUserId(userId);
        return loc.map(this::toDto).orElse(null);
    }

    private UserLocationDto toDto(UserLocation l) {
        UserLocationDto dto = new UserLocationDto();
        dto.setUserId(l.getUser().getUserId());
        dto.setLatitude(l.getLatitude());
        dto.setLongitude(l.getLongitude());
        dto.setCity(l.getCity());
        return dto;
    }
}
