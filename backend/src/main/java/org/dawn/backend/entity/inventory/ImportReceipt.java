package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.AuditableEntity;

import java.math.BigDecimal;
import java.time.Instant;
import org.dawn.backend.constant.enums.inventory.imports.ImportReceiptStatus;

@Entity
@Table(name = "import_receipts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class ImportReceipt extends AuditableEntity {

    @Column(name = "receipt_code", nullable = false, unique = true, length = 32)
    private String receiptCode;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Column(name = "total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ImportReceiptStatus status = ImportReceiptStatus.DRAFT;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "purchase_order_id")
    private Long purchaseOrderId;

    @Column(name = "original_warranty_export_id")
    private Long originalWarrantyExportId;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    @Column(name = "rejected_by")
    private Long rejectedBy;

    @Column(name = "rejected_at")
    private Instant rejectedAt;

    @Column(name = "evidence_image", length = 500)
    private String evidenceImage;
    private String resolution;
    private String resolutionNote;
    private Long resolvedBy;
    private Instant resolvedAt;
}
