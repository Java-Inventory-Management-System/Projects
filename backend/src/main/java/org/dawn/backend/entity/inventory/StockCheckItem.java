package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.BaseEntity;

import java.math.BigDecimal;

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

    @Column(name = "expected_status", length = 30)
    private String expectedStatus;

    @Column(name = "actual_status", length = 30)
    private String actualStatus;

    @Column(name = "counted_quantity", precision = 15, scale = 2)
    private BigDecimal countedQuantity;

    @Column(name = "difference", length = 20)
    private String difference;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;
}
