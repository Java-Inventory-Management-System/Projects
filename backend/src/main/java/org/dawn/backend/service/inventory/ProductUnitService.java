package org.dawn.backend.service.inventory;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.response.ProductUnitResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductUnitService {

    private final ProductUnitRepository productUnitRepository;
    private final ProductRepository productRepository;
    private final LocationRepository locationRepository;

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

    public ProductUnitResponse findOne(Long id) {
        var unit = productUnitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PRODUCT_UNIT_NOT_FOUND));
        var p = productRepository.findById(unit.getProductId()).orElse(null);
        var loc = unit.getLocationId() != null ? locationRepository.findById(unit.getLocationId()).orElse(null) : null;
        return ProductUnitMappingHelper.map(unit,
                p != null ? p.getName() : null,
                p != null ? p.getSku() : null,
                loc != null ? loc.getFullCode() : null);
    }

    public ResponsePage<ProductUnitResponse> findByStatus(String status, Pageable pageable) {
        var products = productRepository.findAll().stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        var locations = locationRepository.findAll().stream()
                .collect(Collectors.toMap(Location::getId, l -> l));
        return ResponsePage.of(productUnitRepository
                .findByStatus(status, pageable)
                .map(unit -> {
                    Product p = products.get(unit.getProductId());
                    Location loc = unit.getLocationId() != null ? locations.get(unit.getLocationId()) : null;
                    return ProductUnitMappingHelper.map(unit,
                            p != null ? p.getName() : null,
                            p != null ? p.getSku() : null,
                            loc != null ? loc.getFullCode() : null);
                }));
    }

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
}
