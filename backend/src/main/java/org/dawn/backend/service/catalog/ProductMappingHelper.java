package org.dawn.backend.service.catalog;

import org.dawn.backend.controller.catalog.response.ProductResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.catalog.Supplier;

import java.util.stream.Collectors;

public interface ProductMappingHelper {

    static ProductResponse map(Product p) {
        return ProductResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .sku(p.getSku())
                .barcode(p.getBarcode())
                .brandId(p.getBrand() != null ? p.getBrand().getId() : null)
                .brandName(p.getBrand() != null ? p.getBrand().getName() : null)
                .categoryId(p.getCategory() != null ? p.getCategory().getId() : null)
                .categoryName(p.getCategory() != null ? p.getCategory().getName() : null)
                .description(p.getDescription())
                .unit(p.getUnit())
                .trackingType(p.getTrackingType())
                .sellPrice(p.getSellPrice())
                .minStock(p.getMinStock())
                .isActive(p.getIsActive())
                .supplierIds(p.getSuppliers().stream().map(Supplier::getId).sorted().collect(Collectors.toList()))
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
