package com.example.dating_app_backend.repository;

import com.example.dating_app_backend.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MessageRepository extends JpaRepository<Message, Integer> {
    List<Message> findByMatch_MatchIdOrderByCreatedAtAsc(Integer matchId);
    Optional<Message> findFirstByMatch_MatchIdOrderByCreatedAtDesc(Integer matchId);
    long countByMatch_MatchIdAndReceiver_UserIdAndIsReadFalseAndIsDeletedFalse(Integer matchId, Integer receiverId);
    List<Message> findByMatch_MatchIdAndReceiver_UserIdAndIsReadFalseAndIsDeletedFalse(Integer matchId, Integer receiverId);
    @Query("SELECT COUNT(m) FROM Message m " +
            "WHERE m.match.matchId = :matchId " +
            "AND m.receiver.userId = :userId " +
            "AND m.isRead = false AND m.isDeleted = false")
    long countUnreadMessages(@Param("matchId") Integer matchId, @Param("userId") Integer userId);

}
