package org.dawn.backend.entity.catalog;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.dawn.backend.entity.base.AuditableEntity;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true, exclude = {"brand", "category", "suppliers"})
@ToString(callSuper = true, exclude = {"brand", "category", "suppliers"})
public class Product extends AuditableEntity {

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "sku", nullable = false, unique = true, length = 100)
    private String sku;

    @Column(name = "barcode", length = 100)
    private String barcode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brand_id")
    private Brand brand;

    @ManyToOne(fetch = FetchType.LAZY)
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

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "product_suppliers",
            joinColumns = @JoinColumn(name = "product_id"),
            inverseJoinColumns = @JoinColumn(name = "supplier_id"))
    @BatchSize(size = 100)
    @Builder.Default
    private Set<Supplier> suppliers = new HashSet<>();
}
