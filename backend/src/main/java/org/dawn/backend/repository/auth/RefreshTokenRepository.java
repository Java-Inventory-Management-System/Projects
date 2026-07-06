package org.dawn.backend.repository.auth;

import org.dawn.backend.entity.auth.RefreshToken;
import org.dawn.backend.entity.auth.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    void deleteByToken(String token);

    Optional<RefreshToken> findByToken(String token);

    void deleteByUser(User user);
}
