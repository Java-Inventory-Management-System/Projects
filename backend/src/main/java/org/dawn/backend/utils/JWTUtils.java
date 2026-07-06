package org.dawn.backend.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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

    public Cookie generateJwtRefreshCookie(String refreshCookie) {
        return generateCookie(
                jwtRefreshCookie,
                refreshCookie,
                endpoint);
    }

    public Cookie getCleanJwtRefreshCookie() {
        return generateCookie(
                jwtRefreshCookie,
                "",
                endpoint);
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

    public String generateToken(Long id, String username, String email, String role) {
        return Jwts
                .builder()
                .subject(username)
                .issuedAt(new Date())
                .claim("id", id)
                .claim("username", username)
                .claim("email", email)
                .claim("role", role)
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

    private Cookie generateCookie(String name, String value, String path) {
        Cookie cookie = new Cookie(name, value);
        cookie.setPath(path);
        cookie.setMaxAge(refreshTokenExpirations / 1000);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        return cookie;
    }

    private String getCookieByName(HttpServletRequest req, String name) {
        Cookie[] cookies = req.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (cookie.getName().equals(name)) {
                    return cookie.getValue();

                }
            }
        }
        return null;
    }
}
