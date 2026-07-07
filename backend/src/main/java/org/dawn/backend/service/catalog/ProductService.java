package org.dawn.backend.service.catalog;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.anno.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.catalog.TrackingType;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.catalog.request.ProductRequest;
import org.dawn.backend.controller.catalog.response.ProductResponse;
import org.dawn.backend.entity.catalog.Brand;
import org.dawn.backend.entity.catalog.Category;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.exception.wrapper.InvalidRequestException;
import org.dawn.backend.exception.wrapper.ResourceAlreadyExistedException;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.BrandRepository;
import org.dawn.backend.repository.catalog.CategoryRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final BrandRepository brandRepository;
    private final CategoryRepository categoryRepository;

    private static final List<String> BULK_UNITS = List.of("METER", "KG");
    private static final List<String> SERIALIZED_UNITS = List.of("PIECE", "BOX", "SET");

    public ResponsePage<ProductResponse> findAll(Pageable pageable) {
        return ResponsePage.of(productRepository
                .findAll(pageable)
                .map(ProductMappingHelper::map));
    }

    public ProductResponse findOne(Long id) {
        return productRepository
                .findById(id)
                .map(ProductMappingHelper::map)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.PRODUCT_NOT_FOUND));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_PRODUCT, entity = LogConstant.Entity.PRODUCT)
    public ProductResponse create(ProductRequest request) {
        if (request.name() == null || request.name().isBlank()) {
            throw new InvalidRequestException(Message.Catalog.PRODUCT_NAME_REQUIRED);
        }
        if (request.sku() == null || request.sku().isBlank()) {
            throw new InvalidRequestException(Message.Catalog.SKU_REQUIRED);
        }
        if (productRepository.existsBySku(request.sku().trim())) {
            throw new ResourceAlreadyExistedException(Message.Catalog.SKU_ALREADY_EXISTS);
        }

        String unit = request.unit() != null ? request.unit() : "PIECE";
        String trackingType = request.trackingType() != null ? request.trackingType() : "SERIALIZED";
        validateUnitTracking(unit, trackingType);

        Brand brand = null;
        if (request.brandId() != null) {
            brand = brandRepository.findById(request.brandId())
                    .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.BRAND_NOT_FOUND));
        }
        Category category = null;
        if (request.categoryId() != null) {
            category = categoryRepository.findById(request.categoryId())
                    .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.CATEGORY_NOT_FOUND));
        }

        Product product = Product.builder()
                .name(request.name().trim())
                .sku(request.sku().trim())
                .barcode(request.barcode())
                .brand(brand)
                .category(category)
                .description(request.description())
                .unit(unit)
                .trackingType(trackingType)
                .sellPrice(request.sellPrice() != null ? request.sellPrice() : BigDecimal.ZERO)
                .minStock(request.minStock() != null ? request.minStock() : 0)
                .build();
        return ProductMappingHelper.map(productRepository.save(product));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.UPDATE_PRODUCT, entity = LogConstant.Entity.PRODUCT, entityClass = Product.class)
    public ProductResponse update(Long id, ProductRequest request) {
        Product product = productRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.PRODUCT_NOT_FOUND));

        if (request.name() != null && !request.name().isBlank()) {
            product.setName(request.name().trim());
        }
        if (request.sku() != null && !request.sku().isBlank()) {
            String newSku = request.sku().trim();
            if (!product.getSku().equals(newSku) && productRepository.existsBySku(newSku)) {
                throw new ResourceAlreadyExistedException(Message.Catalog.SKU_ALREADY_EXISTS);
            }
            product.setSku(newSku);
        }
        if (request.barcode() != null) product.setBarcode(request.barcode());
        if (request.brandId() != null) {
            Brand brand = brandRepository.findById(request.brandId())
                    .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.BRAND_NOT_FOUND));
            product.setBrand(brand);
        }
        if (request.categoryId() != null) {
            Category category = categoryRepository.findById(request.categoryId())
                    .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.CATEGORY_NOT_FOUND));
            product.setCategory(category);
        }
        if (request.description() != null) product.setDescription(request.description());
        if (request.unit() != null) product.setUnit(request.unit());
        if (request.trackingType() != null) product.setTrackingType(request.trackingType());
        if (request.sellPrice() != null) product.setSellPrice(request.sellPrice());
        if (request.minStock() != null) product.setMinStock(request.minStock());

        validateUnitTracking(product.getUnit(), product.getTrackingType());
        return ProductMappingHelper.map(productRepository.save(product));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.TOGGLE_PRODUCT, entity = LogConstant.Entity.PRODUCT, entityClass = Product.class)
    public ProductResponse toggleActive(Long id) {
        Product product = productRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Catalog.PRODUCT_NOT_FOUND));
        product.setIsActive(!Boolean.TRUE.equals(product.getIsActive()));
        return ProductMappingHelper.map(productRepository.save(product));
    }

    private void validateUnitTracking(String unit, String trackingType) {
        boolean requiresBulk = BULK_UNITS.contains(unit);
        boolean requiresSerialized = SERIALIZED_UNITS.contains(unit);
        if (requiresBulk && TrackingType.SERIALIZED.name().equals(trackingType)) {
            throw new InvalidRequestException(
                    Message.format(Message.Catalog.INVALID_UNIT_TRACKING, unit, "bulk"));
        }
        if (requiresSerialized && TrackingType.BULK.name().equals(trackingType)) {
            throw new InvalidRequestException(
                    Message.format(Message.Catalog.INVALID_UNIT_TRACKING, unit, "serialized"));
        }
    }
}
