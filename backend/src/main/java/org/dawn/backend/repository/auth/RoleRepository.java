package org.dawn.backend.repository.auth;

import org.dawn.backend.constant.auth.URole;
import org.dawn.backend.entity.auth.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(URole name);
}
