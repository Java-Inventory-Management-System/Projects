package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.AuditableEntity;

import java.math.BigDecimal;
import java.time.Instant;
import org.dawn.backend.constant.inventory.ReturnReceiptStatus;

@Entity
@Table(name = "return_receipts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class ReturnReceipt extends AuditableEntity {

    @Column(name = "receipt_code", nullable = false, unique = true, length = 32)
    private String receiptCode;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "original_export_receipt_id", nullable = false)
    private Long originalExportReceiptId;

    @Column(name = "reason", nullable = false, length = 20)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ReturnReceiptStatus status = ReturnReceiptStatus.PENDING_APPROVAL;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;
}
