package org.dawn.backend.entity.inventory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.BaseEntity;

import java.math.BigDecimal;

@Entity
@Table(name = "return_receipt_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class ReturnReceiptItem extends BaseEntity {

    @Column(name = "return_receipt_id", nullable = false)
    private Long returnReceiptId;

    @Column(name = "product_unit_id")
    private Long productUnitId;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "quantity", precision = 15, scale = 2)
    private BigDecimal quantity;

    @Column(name = "`condition`", nullable = false, length = 20)
    private String condition;

    @Column(name = "resulting_action", nullable = false, length = 20)
    private String resultingAction;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "evidence_image", length = 255)
    private String evidenceImage;
}
