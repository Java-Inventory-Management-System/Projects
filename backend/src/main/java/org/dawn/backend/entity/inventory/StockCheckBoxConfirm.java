package org.dawn.backend.entity.inventory;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.BaseEntity;

@Entity
@Table(name = "stock_check_box_confirms", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"stock_check_id", "box_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
public class StockCheckBoxConfirm extends BaseEntity {

    @Column(name = "stock_check_id", nullable = false)
    private Long stockCheckId;

    @Column(name = "box_id", nullable = false)
    private Long boxId;

    @Column(name = "confirmed_by", nullable = false)
    private Long confirmedBy;
}
