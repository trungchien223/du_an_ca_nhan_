package com.example.dating_app_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "preferences")
@Setter
@Getter
public class Preference {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer preferenceId;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private UserProfile user;

    @Enumerated(EnumType.STRING)
    private GenderPreference genderPreference = GenderPreference.All;

    private Integer ageMin = 18;
    private Integer ageMax = 50;
    private Integer maxDistanceKm = 10;

    @Column(columnDefinition = "JSON")
    private String interestFilter;

    public enum GenderPreference {
        Male, Female, Other, All
    }

}
