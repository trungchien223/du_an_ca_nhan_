package com.example.dating_app_backend.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UserLocationDto {
    private Integer userId;       // ID người dùng
    private Double latitude;      // Vĩ độ
    private Double longitude;     // Kinh độ
    private String address;       //  Địa chỉ mô tả
    private LocalDateTime updatedAt; //  Thời gian cập nhật gần nhất
}
