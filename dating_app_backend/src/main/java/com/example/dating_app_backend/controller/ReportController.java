package com.example.dating_app_backend.controller;

import com.example.dating_app_backend.dto.ReportDto;
import com.example.dating_app_backend.entity.Report;
import com.example.dating_app_backend.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin("*")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService service;

    @PostMapping
    public ReportDto create(@RequestParam Integer reporterId,
                            @RequestParam Integer reportedId,
                            @RequestParam String reason) {
        return toDto(service.createReport(reporterId, reportedId, reason));
    }

    @GetMapping("/user/{reporterId}")
    public List<ReportDto> getByReporter(@PathVariable Integer reporterId) {
        return service.getReportsByUser(reporterId)
                .stream().map(this::toDto)
                .collect(Collectors.toList());
    }

    private ReportDto toDto(Report r) {
        ReportDto dto = new ReportDto();
        dto.setReportId(r.getReportId());
        dto.setReporterId(r.getReporter().getUserId());
        dto.setReporterName(r.getReporter().getFullName());
        dto.setReportedId(r.getReported().getUserId());
        dto.setReportedName(r.getReported().getFullName());
        dto.setReason(r.getReason());
        dto.setStatus(r.getStatus().name());
        dto.setCreatedAt(r.getCreatedAt());
        return dto;
    }
}
