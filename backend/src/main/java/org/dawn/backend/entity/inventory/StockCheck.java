package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.AuditableEntity;
import org.dawn.backend.constant.enums.inventory.stockcheck.StockCheckStatus;

@Entity
@Table(name = "stock_checks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class StockCheck extends AuditableEntity {

    @Column(name = "check_code", nullable = false, unique = true, length = 32)
    private String checkCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private StockCheckStatus status = StockCheckStatus.PENDING;

    @Column(name = "scope_type", length = 20)
    private String scopeType;

    @Column(name = "scope_id")
    private Long scopeId;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "shelf_codes", length = 255)
    private String shelfCodes;

    @Column(name = "checked_by")
    private Long checkedBy;

    @Column(name = "entered_by")
    private Long enteredBy;

    @Column(name = "box_status_snapshot", columnDefinition = "TEXT")
    private String boxStatusSnapshot;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approval_note", columnDefinition = "TEXT")
    private String approvalNote;
}
