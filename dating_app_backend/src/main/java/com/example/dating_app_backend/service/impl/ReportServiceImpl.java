package com.example.dating_app_backend.service.impl;

import com.example.dating_app_backend.entity.Report;
import com.example.dating_app_backend.entity.UserProfile;
import com.example.dating_app_backend.repository.ReportRepository;
import com.example.dating_app_backend.repository.UserProfileRepository;
import com.example.dating_app_backend.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private final ReportRepository repository;
    private final UserProfileRepository userRepo;

    @Override
    @Transactional
    public Report createReport(Integer reporterId, Integer reportedId, String reason) {
        UserProfile reporter = userRepo.findById(reporterId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người báo cáo"));
        UserProfile reported = userRepo.findById(reportedId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người bị báo cáo"));

        Report report = new Report();
        report.setReporter(reporter);
        report.setReported(reported);
        report.setReason(reason);
        report.setStatus(Report.Status.PENDING);
        return repository.save(report);
    }

    @Override
    public List<Report> getReportsByUser(Integer reporterId) {
        return repository.findByReporter_UserId(reporterId);
    }

    @Override
    @Transactional
    public void reviewReport(Integer reportId, String status) {
        Report report = repository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy báo cáo"));
        report.setStatus(Report.Status.valueOf(status.toUpperCase())); // chuyển string thành enum
        repository.save(report);
    }
}
