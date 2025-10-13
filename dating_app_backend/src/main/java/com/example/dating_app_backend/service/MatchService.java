package com.example.dating_app_backend.service;

import com.example.dating_app_backend.entity.Match;
import java.util.List;

public interface MatchService {
    Match createMatch(Integer user1Id, Integer user2Id);
    List<Match> getMatchesByUser(Integer userId);
    boolean existsMatch(Integer user1Id, Integer user2Id);
}
