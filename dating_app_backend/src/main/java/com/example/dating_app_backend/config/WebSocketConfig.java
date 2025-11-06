package com.example.dating_app_backend.config;

import com.example.dating_app_backend.websocket.JwtHandshakeInterceptor;
import com.example.dating_app_backend.websocket.JwtPrincipalHandshakeHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .addInterceptors(jwtHandshakeInterceptor)
                .setHandshakeHandler(jwtPrincipalHandshakeHandler())
                // ❌ .setAllowedOrigins("*")  // bỏ dòng này
                // ✅ dùng patterns để hợp lệ với allowCredentials=true
                .setAllowedOriginPatterns("*")
                .withSockJS(); // ok để nguyên; Spring vẫn nhận websocket native
    }



    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registry) {
        registry.setMessageSizeLimit(2 * 1024 * 1024); // 2MB
        registry.setSendBufferSizeLimit(2 * 1024 * 1024);
        registry.setSendTimeLimit(20 * 1000);
    }


    @Bean
    public JwtPrincipalHandshakeHandler jwtPrincipalHandshakeHandler() {
        return new JwtPrincipalHandshakeHandler();
    }
}
