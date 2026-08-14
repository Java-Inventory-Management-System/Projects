package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.AuditableEntity;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "locations", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"zone_code", "shelf_code", "bin_code"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class Location extends AuditableEntity {

    @Column(name = "zone_code", nullable = false, length = 10)
    private String zoneCode;

    @Column(name = "shelf_code", nullable = false, length = 10)
    private String shelfCode;

    @Column(name = "bin_code", nullable = false, length = 10)
    private String binCode;

    @Column(name = "full_code", nullable = false, unique = true, length = 32)
    private String fullCode;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "max_capacity", precision = 15, scale = 2)
    private BigDecimal maxCapacity;

    @Column(name = "warehouse_id")
    private Long warehouseId;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "last_checked_at")
    private Instant lastCheckedAt;
}
