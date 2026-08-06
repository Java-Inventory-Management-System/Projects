package org.dawn.backend.service.catalog;
import org.dawn.backend.constant.shared.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.enums.catalog.UnitOfMeasure;
import org.dawn.backend.constant.enums.catalog.TrackingType;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.controller.catalog.request.ProductRequest;
import org.dawn.backend.controller.catalog.response.ProductResponse;
import org.dawn.backend.entity.catalog.Brand;
import org.dawn.backend.entity.catalog.Category;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.catalog.Supplier;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceAlreadyExistedException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.BrandRepository;
import org.dawn.backend.repository.catalog.CategoryRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.catalog.SupplierRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final BrandRepository brandRepository;
    private final CategoryRepository categoryRepository;
    private final SupplierRepository supplierRepository;

    private static final List<String> BULK_UNITS = List.of(UnitOfMeasure.METER.name(), UnitOfMeasure.KG.name(), UnitOfMeasure.TUBE.name());
    private static final List<String> SERIALIZED_UNITS = List.of(UnitOfMeasure.PIECE.name(), UnitOfMeasure.BOX.name(), UnitOfMeasure.SET.name());

    @Transactional(readOnly = true)
    public ResponsePage<ProductResponse> findAll(Pageable pageable, String search, Long brandId, Long categoryId) {
        Page<Product> page;
        if (search != null && !search.isBlank() || brandId != null || categoryId != null) {
            page = productRepository.searchProducts(search, brandId, categoryId, pageable);
        } else {
            page = productRepository.findAll(pageable);
        }
        return ResponsePage.of(page.map(ProductMappingHelper::map));
    }

    @Transactional(readOnly = true)
    public ProductResponse findOne(Long id) {
        return productRepository
                .findById(id)
                .map(ProductMappingHelper::map)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_PRODUCT, entity = LogConstant.Entity.PRODUCT)
    public ProductResponse create(ProductRequest request) {
        if (request.name() == null || request.name().isBlank()) {
            throw new InvalidRequestException(ErrorCode.PRODUCT_NAME_REQUIRED);
        }
        if (request.sku() == null || request.sku().isBlank()) {
            throw new InvalidRequestException(ErrorCode.SKU_REQUIRED);
        }
        if (productRepository.existsBySku(request.sku().trim())) {
            throw new ResourceAlreadyExistedException(ErrorCode.SKU_ALREADY_EXISTS);
        }

        String unit = request.unit() != null ? request.unit() : UnitOfMeasure.PIECE.name();
        TrackingType trackingType = request.trackingType() != null
                ? TrackingType.valueOf(request.trackingType())
                : TrackingType.SERIALIZED;
        validateUnitTracking(unit, trackingType);

        Brand brand = null;
        if (request.brandId() != null) {
            brand = brandRepository.findById(request.brandId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BRAND_NOT_FOUND));
        }
        Category category = null;
        if (request.categoryId() != null) {
            category = categoryRepository.findById(request.categoryId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CATEGORY_NOT_FOUND));
        }

        Set<Supplier> suppliers = resolveRequiredSuppliers(request.supplierIds());

        Product product = Product.builder()
                .name(request.name().trim())
                .sku(request.sku().trim())
                .barcode(request.barcode())
                .brand(brand)
                .category(category)
                .suppliers(suppliers)
                .description(request.description())
                .unit(unit)
                .trackingType(trackingType.name())
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
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));

        if (request.name() != null && !request.name().isBlank()) {
            product.setName(request.name().trim());
        }
        if (request.sku() != null && !request.sku().isBlank()) {
            String newSku = request.sku().trim();
            if (!product.getSku().equals(newSku) && productRepository.existsBySku(newSku)) {
                throw new ResourceAlreadyExistedException(ErrorCode.SKU_ALREADY_EXISTS);
            }
            product.setSku(newSku);
        }
        if (request.barcode() != null) product.setBarcode(request.barcode());
        if (request.brandId() != null) {
            Brand brand = brandRepository.findById(request.brandId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BRAND_NOT_FOUND));
            product.setBrand(brand);
        }
        if (request.categoryId() != null) {
            Category category = categoryRepository.findById(request.categoryId())
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CATEGORY_NOT_FOUND));
            product.setCategory(category);
        }
        if (request.supplierIds() != null) {
            product.setSuppliers(resolveRequiredSuppliers(request.supplierIds()));
        }
        if (request.description() != null) product.setDescription(request.description());
        if (request.unit() != null) product.setUnit(request.unit());
        if (request.trackingType() != null) product.setTrackingType(request.trackingType());
        if (request.sellPrice() != null) product.setSellPrice(request.sellPrice());
        if (request.minStock() != null) product.setMinStock(request.minStock());

                validateUnitTracking(product.getUnit(), TrackingType.valueOf(product.getTrackingType()));
        return ProductMappingHelper.map(productRepository.save(product));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.TOGGLE_PRODUCT, entity = LogConstant.Entity.PRODUCT, entityClass = Product.class)
    public ProductResponse toggleActive(Long id) {
        Product product = productRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));
        product.setIsActive(!Boolean.TRUE.equals(product.getIsActive()));
        return ProductMappingHelper.map(productRepository.save(product));
    }

    private Set<Supplier> resolveRequiredSuppliers(List<Long> supplierIds) {
        if (supplierIds == null || supplierIds.isEmpty()) {
            throw new InvalidRequestException(ErrorCode.PRODUCT_SUPPLIERS_REQUIRED);
        }
        List<Supplier> found = supplierRepository.findAllById(supplierIds);
        if (found.size() != supplierIds.stream().distinct().count()) {
            throw new ResourceNotFoundException(ErrorCode.SUPPLIER_NOT_FOUND);
        }
        return new HashSet<>(found);
    }

    private void validateUnitTracking(String unit, TrackingType trackingType) {
        boolean requiresBulk = BULK_UNITS.contains(unit);
        boolean requiresSerialized = SERIALIZED_UNITS.contains(unit);
        if (requiresBulk && trackingType == TrackingType.SERIALIZED) {
            throw new InvalidRequestException(
                    ErrorCode.INVALID_UNIT_TRACKING.format( unit, "bulk"));
        }
        if (requiresSerialized && trackingType == TrackingType.BULK) {
            throw new InvalidRequestException(
                    ErrorCode.INVALID_UNIT_TRACKING.format( unit, "serialized"));
        }
    }
}
