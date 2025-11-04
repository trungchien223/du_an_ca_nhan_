package com.example.dating_app_backend.security;

import com.example.dating_app_backend.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        // 🔸 Nếu không có header Authorization → bỏ qua (cho phép endpoint public)
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String token = authHeader.substring(7);

        // 🔸 Kiểm tra hợp lệ token
        if (!jwtService.isTokenValid(token)) {
            System.out.println("❌ Invalid or expired JWT in REST request");
            // clear context nếu có user cũ
            SecurityContextHolder.clearContext();
            filterChain.doFilter(request, response);
            return;
        }

        // 🔸 Nếu context chưa có authentication thì set mới
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            Integer accountId = jwtService.extractAccountId(token);
            String role = jwtService.extractRole(token);

            if (accountId != null && role != null) {
                var authority = new SimpleGrantedAuthority("ROLE_" + role);
                var authentication = new UsernamePasswordAuthenticationToken(
                        accountId,
                        null,
                        Collections.singletonList(authority)
                );
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
                System.out.println("✅ Authenticated request from accountId=" + accountId + " with role=" + role);
            }
        }

        filterChain.doFilter(request, response);
    }
}
