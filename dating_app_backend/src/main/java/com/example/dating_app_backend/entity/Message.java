package com.example.dating_app_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
@Setter
@Getter
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer messageId;

    @ManyToOne
    @JoinColumn(name = "match_id")
    private Match match;

    @ManyToOne
    @JoinColumn(name = "sender_id")
    private UserProfile sender;

    @ManyToOne
    @JoinColumn(name = "receiver_id")
    private UserProfile receiver;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Enumerated(EnumType.STRING)
    private Type messageType = Type.TEXT;

    private Boolean isRead = false;

    @Column(nullable = false)
    private Boolean isDeleted = false;

    private LocalDateTime deletedAt;

    private LocalDateTime createdAt = LocalDateTime.now();

    public enum Type {
        TEXT, IMAGE, AUDIO
    }

}
