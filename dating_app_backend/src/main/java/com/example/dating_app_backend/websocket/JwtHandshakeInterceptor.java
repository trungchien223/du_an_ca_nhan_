package com.example.dating_app_backend.websocket;

import com.example.dating_app_backend.repository.UserProfileRepository;
import com.example.dating_app_backend.service.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtService jwtService;
    private final UserProfileRepository userProfileRepository;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                   ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {
        if (!(request instanceof ServletServerHttpRequest servletRequest)) {
            System.out.println("❌ Invalid handshake request type");
            return false;
        }

        HttpServletRequest httpRequest = servletRequest.getServletRequest();
        String token = resolveToken(httpRequest);

        if (token == null || token.isBlank()) {
            System.out.println("❌ Missing WebSocket token");
            return false;
        }

        // ✅ Kiểm tra hợp lệ và còn hạn
        if (!jwtService.isTokenValid(token)) {
            System.out.println("❌ Invalid or expired JWT in WebSocket handshake");
            return false;
        }

        Integer accountId = jwtService.extractAccountId(token);
        if (accountId == null) {
            System.out.println("❌ Cannot extract accountId from token");
            return false;
        }

        var profileOpt = userProfileRepository.findByAccount_AccountId(accountId);
        if (profileOpt.isEmpty()) {
            System.out.println("❌ Không tìm thấy hồ sơ người dùng cho accountId=" + accountId);
            return false;
        }

        Integer userId = profileOpt.get().getUserId();

        // ✅ Gắn vào attributes để JwtPrincipalHandshakeHandler nhận
        attributes.put("accountId", accountId);
        attributes.put("userId", userId);
        System.out.println("✅ WebSocket handshake OK for accountId=" + accountId + ", userId=" + userId);
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               Exception exception) {
        // no-op
    }

    private String resolveToken(HttpServletRequest request) {
        // Ưu tiên header Authorization
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }

        // Hoặc query param token
        String tokenParam = request.getParameter("token");
        if (tokenParam != null && !tokenParam.isBlank()) {
            return tokenParam;
        }

        // Hoặc query string thủ công
        String queryString = request.getQueryString();
        if (queryString != null) {
            return Arrays.stream(queryString.split("&"))
                    .map(pair -> pair.split("=", 2))
                    .filter(parts -> parts.length == 2 && "token".equals(parts[0]))
                    .map(parts -> URLDecoder.decode(parts[1], StandardCharsets.UTF_8))
                    .findFirst()
                    .orElse(null);
        }

        return null;
    }
}
