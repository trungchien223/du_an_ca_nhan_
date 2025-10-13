package com.example.dating_app_backend.service;

import com.example.dating_app_backend.entity.Report;
import java.util.List;

public interface ReportService {
    Report createReport(Integer reporterId, Integer reportedId, String reason);
    List<Report> getReportsByUser(Integer reporterId);
    void reviewReport(Integer reportId, String status);
}
