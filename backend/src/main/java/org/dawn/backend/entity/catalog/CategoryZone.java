package org.dawn.backend.entity.catalog;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.AuditableEntity;

@Entity
@Table(name = "category_zones", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"category_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class CategoryZone extends AuditableEntity {

    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Column(name = "zone_code", nullable = false, length = 10)
    private String zoneCode;
}
