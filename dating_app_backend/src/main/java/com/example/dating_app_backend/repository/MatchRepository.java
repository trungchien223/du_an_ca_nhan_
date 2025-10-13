package com.example.dating_app_backend.repository;

import com.example.dating_app_backend.entity.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.List;

public interface MatchRepository extends JpaRepository<Match, Integer> {

    @Query("""
        SELECT m FROM Match m
        WHERE (m.user1.userId = :user1Id AND m.user2.userId = :user2Id)
           OR (m.user1.userId = :user2Id AND m.user2.userId = :user1Id)
    """)
    Optional<Match> findMatchBetween(Integer user1Id, Integer user2Id);

    @Query("""
        SELECT m FROM Match m
        WHERE m.user1.userId = :userId OR m.user2.userId = :userId
    """)
    List<Match> findAllByUser(Integer userId);
}
