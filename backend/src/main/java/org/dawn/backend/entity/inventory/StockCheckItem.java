package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.BaseEntity;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "stock_check_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class StockCheckItem extends BaseEntity {

    @Column(name = "stock_check_id", nullable = false)
    private Long stockCheckId;

    @Column(name = "product_unit_id", nullable = false)
    private Long productUnitId;

    @Column(name = "tracking_type", length = 20)
    private String trackingType;

    @Column(name = "expected_status", length = 30)
    private String expectedStatus;

    @Column(name = "actual_status", length = 30)
    private String actualStatus;

    @Column(name = "counted_quantity", precision = 15, scale = 2)
    private BigDecimal countedQuantity;

    @Column(name = "expected_quantity", precision = 15, scale = 2)
    private BigDecimal expectedQuantity;

    @Column(name = "difference", length = 20)
    private String difference;

    @Column(name = "photo", length = 500)
    private String photo;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "auto_filled")
    private Boolean autoFilled;

    @Column(name = "touched_at")
    private Instant touchedAt;

    @Column(name = "suspect_seal", nullable = false)
    @Builder.Default
    private Boolean suspectSeal = false;

    @Column(name = "damaged_packaging", nullable = false)
    @Builder.Default
    private Boolean damagedPackaging = false;
}
