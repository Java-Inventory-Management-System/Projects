package org.dawn.backend.entity.inventory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.AuditableEntity;

import java.time.Instant;

@Entity
@Table(name = "warranty_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class WarrantyRequest extends AuditableEntity {

    @Column(name = "request_code", nullable = false, unique = true, length = 50)
    private String requestCode;

    @Column(name = "product_unit_id", nullable = false)
    private Long productUnitId;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "issue_description", nullable = false, columnDefinition = "TEXT")
    private String issueDescription;

    @Column(name = "resolution_type", length = 30)
    private String resolutionType;

    @Column(name = "replacement_unit_id")
    private Long replacementUnitId;

    @Column(name = "rma_number", length = 100)
    private String rmaNumber;

    @Column(name = "sent_to_partner_at")
    private Instant sentToPartnerAt;

    @Column(name = "expected_return_at")
    private Instant expectedReturnAt;

    @Column(name = "partner_note", columnDefinition = "TEXT")
    private String partnerNote;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "handled_by")
    private Long handledBy;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;
}
