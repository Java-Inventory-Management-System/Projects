package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.BaseEntity;

import java.math.BigDecimal;

@Entity
@Table(name = "stock_check_item_histories")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class StockCheckItemHistory extends BaseEntity {

    @Column(name = "stock_check_id", nullable = false)
    private Long stockCheckId;

    @Column(name = "product_unit_id", nullable = false)
    private Long productUnitId;

    @Column(name = "old_actual_status", length = 30)
    private String oldActualStatus;

    @Column(name = "new_actual_status", length = 30)
    private String newActualStatus;

    @Column(name = "old_counted_quantity", precision = 15, scale = 2)
    private BigDecimal oldCountedQuantity;

    @Column(name = "new_counted_quantity", precision = 15, scale = 2)
    private BigDecimal newCountedQuantity;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "changed_by", nullable = false)
    private Long changedBy;
}