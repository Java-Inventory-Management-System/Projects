package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.BaseEntity;

import java.math.BigDecimal;

@Entity
@Table(name = "purchase_order_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class PurchaseOrderItem extends BaseEntity {

    @Column(name = "po_id", nullable = false)
    private Long poId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "quantity", nullable = false, precision = 15, scale = 2)
    private BigDecimal quantity;

    @Column(name = "unit_price", precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "serials", columnDefinition = "TEXT")
    private String serials;

    @Column(name = "received_quantity", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal receivedQuantity = BigDecimal.ZERO;
}
