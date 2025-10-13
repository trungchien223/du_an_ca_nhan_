package com.example.dating_app_backend.repository;

import com.example.dating_app_backend.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Integer> {
    List<Message> findByMatch_MatchIdOrderByCreatedAtAsc(Integer matchId);
}
