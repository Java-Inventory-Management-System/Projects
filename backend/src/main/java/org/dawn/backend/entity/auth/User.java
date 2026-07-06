package org.dawn.backend.entity.auth;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.AuditableEntity;

import java.time.Instant;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@Hidden
@EqualsAndHashCode(callSuper = true, exclude = "role")
@ToString(callSuper = true, exclude = {"password", "role"})
public class User extends AuditableEntity {

    @Column(name = "username", nullable = false, unique = true, length = 100)
    private String username;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "email", unique = true)
    private String email;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "last_login")
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant lastLogin;

    @Column(name = "role_id", nullable = false)
    private Long roleId;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "gender")
    private Integer gender;

    @Column(name = "date_of_birth")
    private Instant dob;

    @Column(name = "phone_number", unique = true, length = 20)
    private String phoneNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", insertable = false, updatable = false)
    private Role role;

    @Column(name = "is_password_reset", nullable = false)
    @Builder.Default
    private Boolean isPasswordReset = false;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;
}
