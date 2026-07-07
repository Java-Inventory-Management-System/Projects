package org.dawn.backend.service.catalog;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.controller.catalog.request.ProductImageRequest;
import org.dawn.backend.controller.catalog.response.ProductImageResponse;
import org.dawn.backend.entity.catalog.ProductImage;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.ProductImageRepository;
import org.dawn.backend.constant.shared.Message;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductImageService {

    private final ProductImageRepository productImageRepository;

    public List<ProductImageResponse> findByProductId(Long productId) {
        return productImageRepository.findByProductId(productId)
                .stream()
                .map(ProductImageMappingHelper::map)
                .toList();
    }

    @Transactional
    public ProductImageResponse create(ProductImageRequest request) {
        ProductImage image = ProductImage.builder()
                .productId(request.productId())
                .url(request.url())
                .isPrimary(request.isPrimary() != null && request.isPrimary())
                .sortOrder(request.sortOrder() != null ? request.sortOrder() : 0)
                .build();
        return ProductImageMappingHelper.map(productImageRepository.save(image));
    }

    @Transactional
    public void delete(Long id) {
        ProductImage image = productImageRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.IMAGE_NOT_FOUND));
        productImageRepository.delete(image);
    }

    @Transactional
    public void deleteByProductId(Long productId) {
        productImageRepository.deleteByProductId(productId);
    }
}
