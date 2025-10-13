package com.example.dating_app_backend.repository;

import com.example.dating_app_backend.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReportRepository extends JpaRepository<Report, Integer> {
    List<Report> findByReporter_UserId(Integer reporterId);
}
