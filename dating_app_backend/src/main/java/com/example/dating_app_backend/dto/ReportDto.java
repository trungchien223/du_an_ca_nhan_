package com.example.dating_app_backend.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ReportDto {
    private Integer reportId;
    private Integer reporterId;
    private String reporterName;
    private Integer reportedId;
    private String reportedName;
    private String reason;
    private String status;
    private LocalDateTime createdAt;
}
