package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.AuditableEntity;

import java.math.BigDecimal;
import java.time.Instant;
import org.dawn.backend.constant.enums.inventory.exports.ExportReceiptStatus;

@Entity
@Table(name = "export_receipts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class ExportReceipt extends AuditableEntity {

    @Column(name = "receipt_code", nullable = false, unique = true, length = 32)
    private String receiptCode;

    @Column(name = "reason", nullable = false, length = 30)
    private String reason;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "supplier_id")
    private Long supplierId;

    @Column(name = "total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ExportReceiptStatus status = ExportReceiptStatus.PENDING;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "fulfilled_by")
    private Long fulfilledBy;

    @Column(name = "fulfilled_at")
    private Instant fulfilledAt;

    @Column(name = "rejected_by")
    private Long rejectedBy;

    @Column(name = "rejected_at")
    private Instant rejectedAt;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    @Column(name = "source_import_receipt_id")
    private Long sourceImportReceiptId;

    @Column(name = "total_cogs", precision = 15, scale = 2)
    private BigDecimal totalCogs;

    @Column(name = "external_reference", length = 100)
    private String externalReference;
}
