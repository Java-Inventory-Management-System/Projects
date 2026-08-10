package org.dawn.backend.service.inventory;
import org.dawn.backend.constant.shared.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.springframework.data.domain.Page;
import org.dawn.backend.controller.inventory.response.ProductUnitResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductUnitService {

    private final ProductUnitRepository productUnitRepository;
    private final ProductRepository productRepository;
    private final LocationRepository locationRepository;

    @Transactional(readOnly = true)
    public ResponsePage<ProductUnitResponse> findAll(Pageable pageable) {
        var products = productRepository.findAll().stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        var locations = locationRepository.findAll().stream()
                .collect(Collectors.toMap(Location::getId, l -> l));

        return ResponsePage.of(productUnitRepository
                .findAll(pageable)
                .map(unit -> {
                    Product p = products.get(unit.getProductId());
                    Location loc = unit.getLocationId() != null ? locations.get(unit.getLocationId()) : null;
                    return ProductUnitMappingHelper.map(unit,
                            p != null ? p.getName() : null,
                            p != null ? p.getSku() : null,
                            loc != null ? loc.getFullCode() : null);
                }));
    }

    @Transactional(readOnly = true)
    public ResponsePage<ProductUnitResponse> findFiltered(String search, String status, Long productId, Pageable pageable) {
        var products = productRepository.findAll().stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        var locations = locationRepository.findAll().stream()
                .collect(Collectors.toMap(Location::getId, l -> l));
        ProductUnitStatus s = safeParseProductUnitStatus(status);
        boolean empty = s == null && status != null && !status.isBlank();
        Page<ProductUnit> page = !empty
                ? productUnitRepository.findFiltered(search != null && !search.isBlank() ? search : null, s, productId, pageable)
                : Page.empty(pageable);
        return ResponsePage.of(page.map(unit -> {
                    Product p = products.get(unit.getProductId());
                    Location loc = unit.getLocationId() != null ? locations.get(unit.getLocationId()) : null;
                    return ProductUnitMappingHelper.map(unit,
                            p != null ? p.getName() : null,
                            p != null ? p.getSku() : null,
                            loc != null ? loc.getFullCode() : null);
                }));
    }

    @Transactional(readOnly = true)
    public ProductUnitResponse findOne(Long id) {
        var unit = productUnitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_UNIT_NOT_FOUND));
        var p = productRepository.findById(unit.getProductId()).orElse(null);
        var loc = unit.getLocationId() != null ? locationRepository.findById(unit.getLocationId()).orElse(null) : null;
        return ProductUnitMappingHelper.map(unit,
                p != null ? p.getName() : null,
                p != null ? p.getSku() : null,
                loc != null ? loc.getFullCode() : null);
    }

    @Transactional(readOnly = true)
    public ResponsePage<ProductUnitResponse> findByStatus(String status, Pageable pageable) {
        var products = productRepository.findAll().stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        var locations = locationRepository.findAll().stream()
                .collect(Collectors.toMap(Location::getId, l -> l));
        ProductUnitStatus s = safeParseProductUnitStatus(status);
        Page<ProductUnit> page = s != null
                ? productUnitRepository.findByStatus(s, pageable)
                : status != null && !status.isBlank()
                    ? Page.empty(pageable)
                    : productUnitRepository.findAll(pageable);
        return ResponsePage.of(page.map(unit -> {
                    Product p = products.get(unit.getProductId());
                    Location loc = unit.getLocationId() != null ? locations.get(unit.getLocationId()) : null;
                    return ProductUnitMappingHelper.map(unit,
                            p != null ? p.getName() : null,
                            p != null ? p.getSku() : null,
                            loc != null ? loc.getFullCode() : null);
                }));
    }

    @Transactional(readOnly = true)
    public ResponsePage<ProductUnitResponse> findByProduct(Long productId, Pageable pageable) {
        var p = productRepository.findById(productId).orElse(null);
        var locations = locationRepository.findAll().stream()
                .collect(Collectors.toMap(Location::getId, l -> l));
        return ResponsePage.of(productUnitRepository
                .findByProductId(productId, pageable)
                .map(unit -> {
                    Location loc = unit.getLocationId() != null ? locations.get(unit.getLocationId()) : null;
                    return ProductUnitMappingHelper.map(unit,
                            p != null ? p.getName() : null,
                            p != null ? p.getSku() : null,
                            loc != null ? loc.getFullCode() : null);
                }));
    }

    private ProductUnitStatus safeParseProductUnitStatus(String value) {
        if (value == null || value.isBlank()) return null;
        try { return ProductUnitStatus.valueOf(value.toUpperCase()); }
        catch (IllegalArgumentException e) { return null; }
    }
}
