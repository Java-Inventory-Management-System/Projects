package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.BaseEntity;

import java.time.Instant;

@Entity
@Table(name = "product_unit_status_logs", indexes = {
        @Index(name = "idx_status_log_unit", columnList = "product_unit_id"),
        @Index(name = "idx_status_log_source", columnList = "source_type, source_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class ProductUnitStatusLog extends BaseEntity {

    @Column(name = "product_unit_id", nullable = false)
    private Long productUnitId;

    @Column(name = "from_status", length = 20)
    private String fromStatus;

    @Column(name = "to_status", nullable = false, length = 20)
    private String toStatus;

    @Column(name = "source_type", nullable = false, length = 30)
    private String sourceType;

    @Column(name = "source_id")
    private Long sourceId;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "changed_by", nullable = false)
    private Long changedBy;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
