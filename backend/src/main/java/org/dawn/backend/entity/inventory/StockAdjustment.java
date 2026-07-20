package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.AuditableEntity;

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

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approval_note", columnDefinition = "TEXT")
    private String approvalNote;
}
