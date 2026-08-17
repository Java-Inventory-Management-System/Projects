package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.AuditableEntity;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentStatus;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "stock_adjustments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class StockAdjustment extends AuditableEntity {

    @Column(name = "adjust_code", nullable = false, unique = true, length = 32)
    private String adjustCode;

    @Column(name = "type", nullable = false, length = 20)
    private String type;

    @Column(name = "product_unit_id")
    private Long productUnitId;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "quantity", precision = 15, scale = 2)
    private BigDecimal quantity;

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "serial_number", length = 100)
    private String serialNumber;

    @Column(name = "location_id")
    private Long locationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private AdjustmentStatus status = AdjustmentStatus.PENDING;

    @Column(name = "source_type", length = 20)
    private String sourceType;

    @Column(name = "source_id")
    private Long sourceId;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "approval_note", columnDefinition = "TEXT")
    private String approvalNote;
}
