package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.AuditableEntity;

import java.math.BigDecimal;
import org.dawn.backend.constant.inventory.ExportReceiptStatus;

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

    @Column(name = "total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ExportReceiptStatus status = ExportReceiptStatus.PENDING_APPROVAL;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "source_import_receipt_id")
    private Long sourceImportReceiptId;

    @Column(name = "total_cogs", precision = 15, scale = 2)
    private BigDecimal totalCogs;
}
