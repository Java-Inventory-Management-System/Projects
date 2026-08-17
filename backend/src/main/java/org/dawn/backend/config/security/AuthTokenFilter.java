package org.dawn.backend.config.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.constant.enums.auth.URole;
import org.dawn.backend.constant.enums.shared.ActiveStatus;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.auth.UserDetailsImpl;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.shared.util.JWTUtils;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuthTokenFilter extends OncePerRequestFilter {

    private final JWTUtils jwtUtils;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);
        if (!jwtUtils.validateToken(token)) {
            chain.doFilter(request, response);
            return;
        }

        Long userId = jwtUtils.getUserIdFromToken(token);
        String username = jwtUtils.getUserNameFromToken(token);
        String role = jwtUtils.getRoleFromToken(token);

        User user = userRepository.findById(userId).orElse(null);
        if (user == null || Boolean.TRUE.equals(user.getIsDeleted())
                || ActiveStatus.INACTIVE == user.getStatus()) {
            chain.doFilter(request, response);
            return;
        }

        URole userRole;
        try {
            userRole = URole.valueOf(role);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid role in token: {}", role);
            chain.doFilter(request, response);
            return;
        }

        var userDetails = UserDetailsImpl.builder()
                .id(userId)
                .username(username)
                .email("")
                .password(null)
                .role(userRole)
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + role)))
                .build();

        var auth = new UsernamePasswordAuthenticationToken(
                userDetails, null,
                userDetails.getAuthorities()
        );
        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(auth);

        chain.doFilter(request, response);
    }
}
