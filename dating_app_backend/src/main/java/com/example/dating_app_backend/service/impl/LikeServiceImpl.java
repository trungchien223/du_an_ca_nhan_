package com.example.dating_app_backend.service.impl;

import com.example.dating_app_backend.entity.Like;
import com.example.dating_app_backend.entity.Match;
import com.example.dating_app_backend.entity.UserProfile;
import com.example.dating_app_backend.repository.LikeRepository;
import com.example.dating_app_backend.repository.MatchRepository;
import com.example.dating_app_backend.repository.UserProfileRepository;
import com.example.dating_app_backend.service.LikeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LikeServiceImpl implements LikeService {

    private final LikeRepository likeRepo;
    private final MatchRepository matchRepo;
    private final UserProfileRepository userRepo;

    @Override
    @Transactional
    public Like likeUser(Integer senderId, Integer receiverId) {
        UserProfile sender = userRepo.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người gửi"));
        UserProfile receiver = userRepo.findById(receiverId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người nhận"));

        // Nếu đã tồn tại lượt like, không tạo lại
        Like like = likeRepo.findBySender_UserIdAndReceiver_UserId(senderId, receiverId)
                .orElseGet(() -> {
                    Like l = new Like();
                    l.setSender(sender);
                    l.setReceiver(receiver);
                    l.setStatus(Like.Status.LIKE);
                    return likeRepo.save(l);
                });

        // Kiểm tra nếu người kia cũng like mình thì tạo match
        likeRepo.findBySender_UserIdAndReceiver_UserId(receiverId, senderId)
                .ifPresent(reverse -> {
                    if (reverse.getStatus() == Like.Status.LIKE &&
                            matchRepo.findMatchBetween(senderId, receiverId).isEmpty()) {
                        Match match = new Match();
                        match.setUser1(sender);
                        match.setUser2(receiver);
                        match.setCompatibilityScore(100.0); // hoặc tính toán sau
                        matchRepo.save(match);
                    }
                });

        return like;
    }

    @Override
    public void passUser(Integer senderId, Integer receiverId) {
        UserProfile sender = userRepo.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người gửi"));
        UserProfile receiver = userRepo.findById(receiverId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người nhận"));

        Like pass = new Like();
        pass.setSender(sender);
        pass.setReceiver(receiver);
        pass.setStatus(Like.Status.PASS);
        likeRepo.save(pass);
    }

    @Override
    public boolean hasLiked(Integer senderId, Integer receiverId) {
        return likeRepo.findBySender_UserIdAndReceiver_UserId(senderId, receiverId).isPresent();
    }

    @Override
    public List<Like> getLikesReceived(Integer userId) {
        return likeRepo.findByReceiver_UserId(userId);
    }

    @Override
    public Match checkIfMatch(Integer senderId, Integer receiverId) {
        return matchRepo.findMatchBetween(senderId, receiverId).orElse(null);
    }
}
