package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.AuditableEntity;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "product_units", indexes = {
        @Index(name = "idx_product_unit_status", columnList = "status"),
        @Index(name = "idx_product_unit_serial", columnList = "serial_number"),
        @Index(name = "idx_product_unit_imported_at", columnList = "imported_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class ProductUnit extends AuditableEntity {

    @Column(name = "serial_number", unique = true, length = 100)
    private String serialNumber;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "tracking_type", nullable = false, length = 20)
    private String trackingType;

    @Column(name = "initial_quantity", precision = 15, scale = 2)
    private BigDecimal initialQuantity;

    @Column(name = "remaining_quantity", precision = 15, scale = 2)
    private BigDecimal remainingQuantity;

    @Column(name = "import_receipt_item_id")
    private Long importReceiptItemId;

    @Column(name = "location_id")
    private Long locationId;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "IN_STOCK";

    @Column(name = "imported_at", nullable = false)
    private Instant importedAt;

    @Column(name = "warranty_months")
    private Integer warrantyMonths;

    @Column(name = "warranty_start_date")
    private Instant warrantyStartDate;

    @Column(name = "warranty_expires_at")
    private Instant warrantyExpiresAt;

    @Column(name = "reserved_quantity", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal reservedQuantity = BigDecimal.ZERO;

    @Column(name = "is_warranty_active")
    @Builder.Default
    private Boolean isWarrantyActive = true;

    @Column(name = "warranty_seal_code", length = 50)
    private String warrantySealCode;

    @Column(name = "cost_price", precision = 15, scale = 2)
    private BigDecimal costPrice;

    @Version
    @Column(name = "version")
    @Builder.Default
    private Long version = 0L;
}
