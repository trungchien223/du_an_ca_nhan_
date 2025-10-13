package com.example.dating_app_backend.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "user_profiles")
@Setter
@Getter
public class UserProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer userId;

    @OneToOne
    @JoinColumn(name = "account_id", nullable = false)
    @JsonIgnore
    private Account account;

    @Column(nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    private Gender gender = Gender.Other;

    private LocalDate birthDate;

    @Column(columnDefinition = "TEXT")
    private String bio;

    private String job;
    private String avatarUrl;

    @Column(columnDefinition = "JSON")
    private String interests;

    private LocalDateTime lastOnline = LocalDateTime.now();

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    private UserLocation location;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    private Preference preference;

    @OneToMany(mappedBy = "sender")
    @JsonIgnore
    private List<Like> sentLikes;

    @OneToMany(mappedBy = "receiver")
    @JsonIgnore
    private List<Like> receivedLikes;

    public enum Gender {
        Male, Female, Other
    }

}
