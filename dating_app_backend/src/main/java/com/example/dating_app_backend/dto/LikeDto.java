package com.example.dating_app_backend.dto;

import lombok.Data;

@Data
public class LikeDto {
    private Integer likeId;
    private Integer senderId;
    private String senderName;
    private Integer receiverId;
    private String receiverName;
    private String status; // LIKE / PASS
}
