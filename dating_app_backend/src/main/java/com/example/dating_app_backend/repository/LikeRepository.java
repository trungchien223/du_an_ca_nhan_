package com.example.dating_app_backend.repository;

import com.example.dating_app_backend.entity.Like;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LikeRepository extends JpaRepository<Like, Integer> {
    Optional<Like> findBySender_UserIdAndReceiver_UserId(Integer senderId, Integer receiverId);
    List<Like> findByReceiver_UserId(Integer receiverId);
    List<Like> findBySender_UserId(Integer senderId);
}
