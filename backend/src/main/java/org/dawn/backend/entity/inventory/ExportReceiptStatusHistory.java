package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.BaseEntity;

import java.time.Instant;

@Entity
@Table(name = "export_receipt_status_histories")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class ExportReceiptStatusHistory extends BaseEntity {

    @Column(name = "receipt_id", nullable = false)
    private Long receiptId;

    @Column(name = "from_status", nullable = false, length = 20)
    private String fromStatus;

    @Column(name = "to_status", nullable = false, length = 20)
    private String toStatus;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "changed_by", nullable = false)
    private Long changedBy;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
