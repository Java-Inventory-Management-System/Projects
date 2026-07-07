package org.dawn.backend.entity.catalog;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.AuditableEntity;

import java.math.BigDecimal;

@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true, exclude = {"brand", "category"})
public class Product extends AuditableEntity {

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "sku", nullable = false, unique = true, length = 100)
    private String sku;

    @Column(name = "barcode", length = 100)
    private String barcode;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "brand_id")
    private Brand brand;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "unit", nullable = false, length = 20)
    @Builder.Default
    private String unit = "PIECE";

    @Column(name = "tracking_type", nullable = false, length = 20)
    @Builder.Default
    private String trackingType = "SERIALIZED";

    @Column(name = "sell_price", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal sellPrice = BigDecimal.ZERO;

    @Column(name = "min_stock", nullable = false)
    @Builder.Default
    private Integer minStock = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
