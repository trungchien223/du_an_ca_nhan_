package com.example.dating_app_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_location")
@Setter
@Getter
public class UserLocation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer locationId;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private UserProfile user;

    private Double latitude;
    private Double longitude;
    private String city;

    private LocalDateTime updatedAt = LocalDateTime.now();

}
