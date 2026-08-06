package org.dawn.backend.config.security;

import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Component
public class CorsConfig {
    public final List<String> ALLOWED_DOMAINS = Arrays.asList(
            "http://localhost",
            "http://localhost:3000",
            "http://localhost:4200",
            "http://localhost:5173");


    private final List<String> ALLOWED_HEADERS = Arrays.asList(
            "Authorization", "Cache-Control", "Content-Type", "X-Requested-With", "Accept", "Origin"
    );


    private final List<String> ALLOWED_METHODS = Arrays.asList(
            "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
    );

    public UrlBasedCorsConfigurationSource configuration() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOrigins(ALLOWED_DOMAINS);
        config.setAllowedHeaders(ALLOWED_HEADERS);
        config.setAllowedMethods(ALLOWED_METHODS);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
