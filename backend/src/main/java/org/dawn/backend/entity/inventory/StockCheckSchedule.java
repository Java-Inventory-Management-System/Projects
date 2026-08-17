package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.AuditableEntity;

@Entity
@Table(name = "stock_check_schedules", indexes = {
        @Index(name = "idx_scs_zone", columnList = "zone_code")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class StockCheckSchedule extends AuditableEntity {

    @Column(name = "zone_code", nullable = false, length = 10)
    private String zoneCode;

    @Column(name = "shelf_from", length = 10)
    private String shelfFrom;

    @Column(name = "shelf_to", length = 10)
    private String shelfTo;

    @Column(name = "frequency_days", nullable = false)
    private Integer frequencyDays;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "default_assignee_id")
    private Long defaultAssigneeId;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;
}