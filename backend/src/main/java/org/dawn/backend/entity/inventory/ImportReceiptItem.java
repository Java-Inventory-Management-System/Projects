package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.BaseEntity;

import java.math.BigDecimal;

@Entity
@Table(name = "import_receipt_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class ImportReceiptItem extends BaseEntity {

    @Column(name = "receipt_id", nullable = false)
    private Long receiptId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "quantity", nullable = false, precision = 15, scale = 2)
    private BigDecimal quantity;

    @Column(name = "unit_price", precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "warranty_months")
    private Integer warrantyMonths;

    @Column(name = "supplier_batch_no", length = 100)
    private String supplierBatchNo;

    @Column(name = "warranty_result_type", length = 20)
    private String warrantyResultType;
}
