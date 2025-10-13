package com.example.dating_app_backend.service;

import com.example.dating_app_backend.entity.Like;
import com.example.dating_app_backend.entity.Match;

import java.util.List;

public interface LikeService {
    Like likeUser(Integer senderId, Integer receiverId);
    void passUser(Integer senderId, Integer receiverId);
    boolean hasLiked(Integer senderId, Integer receiverId);
    List<Like> getLikesReceived(Integer userId);
    Match checkIfMatch(Integer senderId, Integer receiverId);
}
