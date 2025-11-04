package com.example.dating_app_backend.service.impl;

import com.example.dating_app_backend.entity.Match;
import com.example.dating_app_backend.entity.UserProfile;
import com.example.dating_app_backend.event.MatchCreatedEvent;
import com.example.dating_app_backend.repository.MatchRepository;
import com.example.dating_app_backend.repository.UserProfileRepository;
import com.example.dating_app_backend.service.MatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MatchServiceImpl implements MatchService {

    private final MatchRepository repository;
    private final UserProfileRepository userRepo;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public Match createMatch(Integer user1Id, Integer user2Id) {
        // kiểm tra nếu đã tồn tại
        if (repository.findMatchBetween(user1Id, user2Id).isPresent()) {
            throw new RuntimeException("Match đã tồn tại");
        }

        // Lấy 2 user thực tế từ DB
        UserProfile user1 = userRepo.findById(user1Id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user1"));
        UserProfile user2 = userRepo.findById(user2Id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy user2"));

        Match match = new Match();
        match.setUser1(user1);
        match.setUser2(user2);
        match.setCompatibilityScore(100.0); // hoặc tính toán thực tế
        Match saved = repository.save(match);
        eventPublisher.publishEvent(new MatchCreatedEvent(
                saved.getMatchId(),
                user1Id,
                user2Id
        ));
        return saved;
    }

    @Override
    public List<Match> getMatchesByUser(Integer userId) {
        return repository.findAllByUser(userId);
    }

    @Override
    public boolean existsMatch(Integer user1Id, Integer user2Id) {
        return repository.findMatchBetween(user1Id, user2Id).isPresent();
    }
}
