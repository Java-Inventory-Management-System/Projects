package org.dawn.backend.service.inventory;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.enums.catalog.TrackingType;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.controller.inventory.response.InventoryItemResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryService {

    private final ProductRepository productRepository;
    private final ProductUnitRepository productUnitRepository;
    private final LocationRepository locationRepository;

    public ResponsePage<InventoryItemResponse> getInventory(Pageable pageable, String search) {
        Page<Product> productPage;
        if (search != null && !search.isBlank()) {
            productPage = productRepository.findByNameContainingIgnoreCaseAndIsActiveTrue(search, pageable);
        } else {
            productPage = productRepository.findByIsActiveTrue(pageable);
        }

        List<Long> productIds = productPage.getContent().stream().map(Product::getId).toList();

        Map<Long, List<ProductUnit>> unitsByProduct = productUnitRepository
                .findByProductIdInAndStatus(productIds, ProductUnitStatus.IN_STOCK)

                .stream()
                .collect(Collectors.groupingBy(ProductUnit::getProductId));

        Map<Long, Location> locations = locationRepository.findAll().stream()
                .collect(Collectors.toMap(Location::getId, l -> l));

        return ResponsePage.of(productPage.map(product -> {
            List<ProductUnit> units = unitsByProduct.getOrDefault(product.getId(), List.of());

            int quantity;
            if (TrackingType.BULK.name().equals(product.getTrackingType())) {

                quantity = units.stream()
                        .mapToInt(u -> u.getRemainingQuantity() != null ? u.getRemainingQuantity().intValue() : 0)
                        .sum();
            } else {
                quantity = units.size();
            }

            String location = units.stream()
                    .filter(u -> u.getLocationId() != null)
                    .max(Comparator.comparing(ProductUnit::getImportedAt))
                    .map(u -> {
                        Location loc = locations.get(u.getLocationId());
                        return loc != null ? loc.getFullCode() : null;
                    })
                    .orElse(null);

            return InventoryItemResponse.builder()
                    .productId(product.getId())
                    .productName(product.getName())
                    .productSku(product.getSku())
                    .quantity(quantity)
                    .minStock(product.getMinStock() != null ? product.getMinStock() : 0)
                    .location(location)
                    .updatedAt(product.getUpdatedAt())
                    .build();
        }));
    }
}
