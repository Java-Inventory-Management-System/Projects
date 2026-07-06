package org.dawn.backend.repository.auth;

import org.dawn.backend.entity.auth.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByToken(String token);

    void deleteByUserId(Long userId);

    @Modifying
    @Transactional
    @Query(value = "UPDATE PasswordResetToken t SET t.used = true WHERE t.id = :id")
    void markUsed(@Param("id") Long id);
}
