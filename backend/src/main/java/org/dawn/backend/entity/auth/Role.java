package org.dawn.backend.entity.auth;

import io.swagger.v3.oas.annotations.Hidden;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.constant.auth.URole;
import org.dawn.backend.entity.base.AuditableEntity;

@Entity
@Table(name = "roles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@Hidden
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class Role extends AuditableEntity {
    @Column(name = "name")
    @Enumerated(EnumType.STRING)
    private URole name;

    @Column(name = "description")
    private String description;
}
