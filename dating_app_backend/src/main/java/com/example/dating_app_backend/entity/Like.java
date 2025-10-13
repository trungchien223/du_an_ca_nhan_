package com.example.dating_app_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "likes")
@Setter
@Getter
public class Like {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer likeId;

    @ManyToOne
    @JoinColumn(name = "sender_id")
    private UserProfile sender;

    @ManyToOne
    @JoinColumn(name = "receiver_id")
    private UserProfile receiver;

    @Enumerated(EnumType.STRING)
    private Status status = Status.LIKE;

    private LocalDateTime createdAt = LocalDateTime.now();

    public enum Status {
        LIKE, PASS
    }

}
