package org.dawn.backend.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Slf4j
@Component
public class JWTUtils {
    @Value("${app.jwtSecret}")
    private String jwtSecret;

    @Value("${app.jwtExpirationsMs}")
    private int jwtExpirations;

    @Value("${app.jwtRefreshExpirationsMs}")
    private int refreshTokenExpirations;

    @Value("${app.jwtCookieName}")
    private String jwtCookie;

    @Value("${app.jwtRefreshCookieName}")
    private String jwtRefreshCookie;

    private final String endpoint = "/api/v1/auth/refresh-token";

    public ResponseCookie generateJwtRefreshCookie(String refreshToken) {
        return ResponseCookie.from(jwtRefreshCookie, refreshToken)
                .path(endpoint)
                .maxAge(refreshTokenExpirations / 1000)
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .build();
    }

    public ResponseCookie generateCleanJwtRefreshCookie() {
        return ResponseCookie.from(jwtRefreshCookie, "")
                .path(endpoint)
                .maxAge(0)
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .build();
    }

    public Long getUserIdFromToken(String token) {
        return getClaims(token).get("id", Long.class);
    }

    public String getUserNameFromToken(String token) {
        return getClaims(token).get("username", String.class);
    }

    public String getRoleFromToken(String token) {
        return getClaims(token).get("role", String.class);
    }

    private Claims getClaims(String token) {
        return Jwts
                .parser()
                .verifyWith(key())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String generateToken(Long id, String username, String email, String role, String fullName) {
        return Jwts
                .builder()
                .subject(username)
                .issuedAt(new Date())
                .claim("id", id)
                .claim("username", username)
                .claim("email", email)
                .claim("role", role)
                .claim("fullName", fullName)
                .expiration(new Date(new Date().getTime() + jwtExpirations))
                .signWith(key())
                .compact();
    }

    public String generateToken(String username) {
        return Jwts
                .builder()
                .subject(username)
                .issuedAt(new Date())
                .expiration(new Date(new Date().getTime() + jwtExpirations))
                .signWith(key())
                .compact();
    }

    public SecretKey key() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    }

    public boolean validateToken(String authToken) {
        try {
            Jwts.parser()
                    .verifyWith(key())
                    .build()
                    .parseSignedClaims(authToken);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.error("Token validation failed: {}", e.getMessage());
            return false;
        }
    }
}
