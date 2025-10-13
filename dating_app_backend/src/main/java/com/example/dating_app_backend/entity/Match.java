package com.example.dating_app_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "matches")
@Setter
@Getter
public class Match {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer matchId;

    @ManyToOne
    @JoinColumn(name = "user1_id")
    private UserProfile user1;

    @ManyToOne
    @JoinColumn(name = "user2_id")
    private UserProfile user2;

    private LocalDateTime matchedAt = LocalDateTime.now();

    private Double compatibilityScore;

    @OneToMany(mappedBy = "match", cascade = CascadeType.ALL)
    private List<Message> messages;

}
