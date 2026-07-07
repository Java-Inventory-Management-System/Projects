package org.dawn.backend.service.catalog;

import org.dawn.backend.controller.catalog.response.ProductImageResponse;
import org.dawn.backend.entity.catalog.ProductImage;

public interface ProductImageMappingHelper {

    static ProductImageResponse map(ProductImage img) {
        return ProductImageResponse.builder()
                .id(img.getId())
                .productId(img.getProductId())
                .url(img.getUrl())
                .isPrimary(img.getIsPrimary())
                .sortOrder(img.getSortOrder())
                .createdAt(img.getCreatedAt())
                .build();
    }
}
