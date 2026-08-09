package org.dawn.backend.service.catalog;
import org.dawn.backend.constant.shared.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.controller.catalog.request.ProductImageRequest;
import org.dawn.backend.controller.catalog.response.ProductImageResponse;
import org.dawn.backend.entity.catalog.ProductImage;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.ProductImageRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.constant.shared.LogConstant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.dawn.backend.aspect.AuditLog;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductImageService {

    private final ProductImageRepository productImageRepository;
    private final ProductRepository productRepository;

    private static final int MAX_IMAGES_PER_PRODUCT = 5;

    public List<ProductImageResponse> findByProductId(Long productId) {
        return productImageRepository.findByProductId(productId)
                .stream()
                .map(ProductImageMappingHelper::map)
                .toList();
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_PRODUCT_IMAGE, entity = LogConstant.Entity.PRODUCT_IMAGE)
    public ProductImageResponse create(ProductImageRequest request) {
        if (!productRepository.existsById(request.productId())) {
            throw new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND);
        }
        if (productImageRepository.countByProductId(request.productId()) >= MAX_IMAGES_PER_PRODUCT) {
            throw new InvalidRequestException(ErrorCode.IMAGE_LIMIT_REACHED.format(MAX_IMAGES_PER_PRODUCT));
        }
        if (Boolean.TRUE.equals(request.isPrimary())) {
            productImageRepository.findByProductId(request.productId())
                    .forEach(img -> {
                        img.setIsPrimary(false);
                        productImageRepository.save(img);
                    });
        }
        ProductImage image = ProductImage.builder()
                .productId(request.productId())
                .url(request.url())
                .isPrimary(request.isPrimary() != null && request.isPrimary())
                .sortOrder(request.sortOrder() != null ? request.sortOrder() : 0)
                .build();
        return ProductImageMappingHelper.map(productImageRepository.save(image));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.DELETE_PRODUCT_IMAGE, entity = LogConstant.Entity.PRODUCT_IMAGE)
    public void delete(Long id) {
        ProductImage image = productImageRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.IMAGE_NOT_FOUND));
        productImageRepository.delete(image);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.DELETE_PRODUCT_IMAGE, entity = LogConstant.Entity.PRODUCT_IMAGE)
    public void deleteByProductId(Long productId) {
        productImageRepository.deleteByProductId(productId);
    }
}
