package org.dawn.backend.service.inventory;
import org.dawn.backend.constant.shared.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.controller.inventory.response.ProductUnitHistoryResponse;
import org.springframework.data.domain.Page;
import org.dawn.backend.controller.inventory.response.ProductUnitResponse;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.entity.inventory.ImportReceiptItem;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ProductUnitStatusLog;
import org.dawn.backend.entity.inventory.ReturnReceipt;
import org.dawn.backend.entity.inventory.StockAdjustment;
import org.dawn.backend.entity.inventory.StockCheck;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.adjustments.StockAdjustmentRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptItemRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptRepository;
import org.dawn.backend.repository.inventory.returns.ReturnReceiptRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductUnitService {

    private final ProductUnitRepository productUnitRepository;
    private final ProductRepository productRepository;
    private final LocationRepository locationRepository;
    private final ProductUnitStatusLogRepository statusLogRepository;
    private final ImportReceiptItemRepository importReceiptItemRepository;
    private final ImportReceiptRepository importReceiptRepository;
    private final ExportReceiptRepository exportReceiptRepository;
    private final StockCheckRepository stockCheckRepository;
    private final StockAdjustmentRepository stockAdjustmentRepository;
    private final ReturnReceiptRepository returnReceiptRepository;
    private final UserRepository userRepository;

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

    @Transactional(readOnly = true)
    public ProductUnitHistoryResponse findHistory(Long id) {
        var unit = productUnitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_UNIT_NOT_FOUND));
        var logs = statusLogRepository.findByProductUnitIdOrderByCreatedAtDesc(unit.getId());
        var sourceCodes = fetchSourceCodes(logs);
        var userMap = fetchUserMap(logs);
        var events = logs.stream()
                .map(log -> ProductUnitHistoryResponse.Event.builder()
                        .id(log.getId())
                        .fromStatus(log.getFromStatus())
                        .toStatus(log.getToStatus())
                        .sourceType(log.getSourceType())
                        .sourceId(log.getSourceId())
                        .sourceCode(log.getSourceId() != null ? sourceCodes.get(log.getSourceId()) : null)
                        .changedByName(userMap.get(log.getChangedBy()))
                        .createdAt(log.getCreatedAt())
                        .build())
                .toList();

        ProductUnitHistoryResponse.ImportInfo importInfo = null;
        if (unit.getImportReceiptItemId() != null) {
            var item = importReceiptItemRepository.findById(unit.getImportReceiptItemId()).orElse(null);
            var receipt = item != null ? importReceiptRepository.findById(item.getReceiptId()).orElse(null) : null;
            importInfo = ProductUnitHistoryResponse.ImportInfo.builder()
                    .importReceiptItemId(unit.getImportReceiptItemId())
                    .receiptCode(receipt != null ? receipt.getReceiptCode() : null)
                    .receiptDate(receipt != null ? receipt.getCreatedAt() : null)
                    .importedAt(unit.getImportedAt())
                    .build();
        }
        return ProductUnitHistoryResponse.builder()
                .importInfo(importInfo)
                .events(events)
                .build();
    }

    private Map<Long, String> fetchSourceCodes(List<ProductUnitStatusLog> logs) {
        var out = new HashMap<Long, String>();
        importReceiptRepository.findAllById(idsOf(logs, SourceType.IMPORT_RECEIPT))
                .forEach(r -> out.put(r.getId(), r.getReceiptCode()));
        exportReceiptRepository.findAllById(idsOf(logs, SourceType.EXPORT_RECEIPT))
                .forEach(r -> out.put(r.getId(), r.getReceiptCode()));
        stockCheckRepository.findAllById(idsOf(logs, SourceType.STOCK_CHECK))
                .forEach(r -> out.put(r.getId(), r.getCheckCode()));
        stockAdjustmentRepository.findAllById(idsOf(logs, SourceType.STOCK_ADJUSTMENT))
                .forEach(r -> out.put(r.getId(), r.getAdjustCode()));
        returnReceiptRepository.findAllById(idsOf(logs, SourceType.RETURN_RECEIPT))
                .forEach(r -> out.put(r.getId(), r.getReceiptCode()));
        return out;
    }

    private List<Long> idsOf(List<ProductUnitStatusLog> logs, SourceType type) {
        return logs.stream()
                .filter(l -> type.name().equals(l.getSourceType()) && l.getSourceId() != null)
                .map(ProductUnitStatusLog::getSourceId)
                .distinct()
                .toList();
    }

    private Map<Long, String> fetchUserMap(List<ProductUnitStatusLog> logs) {
        var ids = logs.stream().map(ProductUnitStatusLog::getChangedBy).distinct().toList();
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
    }
}
