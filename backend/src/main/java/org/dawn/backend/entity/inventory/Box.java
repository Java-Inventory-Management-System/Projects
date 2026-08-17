package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.constant.enums.inventory.box.BoxStatus;
import org.dawn.backend.constant.enums.inventory.box.BoxType;
import org.dawn.backend.entity.base.AuditableEntity;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "boxes", indexes = {
        @Index(name = "idx_boxes_location", columnList = "location_id"),
        @Index(name = "idx_boxes_status", columnList = "status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class Box extends AuditableEntity {

    @Column(name = "box_code", nullable = false, unique = true, length = 32)
    private String boxCode;

    @Column(name = "import_receipt_id")
    private Long importReceiptId;

    @Enumerated(EnumType.STRING)
    @Column(name = "box_type", nullable = false, length = 20)
    @Builder.Default
    private BoxType boxType = BoxType.MEDIUM;

    @Column(name = "location_id", nullable = false)
    private Long locationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private BoxStatus status = BoxStatus.SEALED;

    @Column(name = "sealed_quantity", precision = 15, scale = 2)
    private BigDecimal sealedQuantity;

    @Column(name = "sealed_by")
    private Long sealedBy;

    @Column(name = "sealed_at")
    private Instant sealedAt;

    @Column(name = "unsealed_by")
    private Long unsealedBy;

    @Column(name = "unsealed_at")
    private Instant unsealedAt;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;
}
