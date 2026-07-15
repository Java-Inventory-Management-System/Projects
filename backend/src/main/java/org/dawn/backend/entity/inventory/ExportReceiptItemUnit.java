package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.BaseEntity;

import java.math.BigDecimal;

@Entity
@Table(name = "export_receipt_item_units")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class ExportReceiptItemUnit extends BaseEntity {

    @Column(name = "export_receipt_item_id", nullable = false)
    private Long exportReceiptItemId;

    @Column(name = "product_unit_id", nullable = false)
    private Long productUnitId;

    @Column(name = "quantity", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal quantity = BigDecimal.ONE;

    @Column(name = "sell_price", precision = 15, scale = 2)
    private BigDecimal sellPrice;
}
