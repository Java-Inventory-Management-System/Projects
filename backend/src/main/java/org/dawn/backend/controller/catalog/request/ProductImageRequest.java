package org.dawn.backend.controller.catalog.request;

public record ProductImageRequest(Long productId, String url, Boolean isPrimary, Integer sortOrder) {
}
