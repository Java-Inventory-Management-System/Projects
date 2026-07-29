package org.dawn.backend.service.inventory.stockcheck;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.enums.catalog.TrackingType;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.stockcheck.StockCheckStatus;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.request.CreateStockCheckRequest;
import org.dawn.backend.controller.inventory.request.ImportSerialsRequest;
import org.dawn.backend.controller.inventory.request.StockCheckItemRequest;
import org.dawn.backend.controller.inventory.response.StockCheckResponse;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.*;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckItemHistoryRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckItemRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckRepository;
import org.dawn.backend.shared.util.ReceiptCodeGenerator;
import org.dawn.backend.config.security.SecurityPolicy;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockCheckService {

    private final StockCheckRepository stockCheckRepository;
    private final StockCheckItemRepository stockCheckItemRepository;
    private final StockCheckItemHistoryRepository itemHistoryRepository;
    private final ProductUnitRepository productUnitRepository;
    private final LocationRepository locationRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final SecurityPolicy securityPolicy;

    @Transactional(readOnly = true)
    public ResponsePage<StockCheckResponse> findAll(Pageable pageable, String status) {
        var page = status != null
                ? stockCheckRepository.findByStatus(StockCheckStatus.valueOf(status.toUpperCase()), pageable)
                : stockCheckRepository.findAll(pageable);
        var userMap = fetchUserNames(page.getContent());
        return ResponsePage.of(page.map(sc -> toResponse(sc, userMap)));
    }

    @Transactional(readOnly = true)
    public StockCheckResponse findOne(Long id) {
        var sc = stockCheckRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.STOCK_CHECK_NOT_FOUND));
        return toResponse(sc);
    }

    @Transactional(readOnly = true)
    public ResponsePage<StockCheckResponse> findMyChecks(Pageable pageable, String status) {
        Long userId = securityPolicy.requireAuthenticated();
        var page = status != null
                ? stockCheckRepository.findByCreatedByAndStatus(userId, StockCheckStatus.valueOf(status.toUpperCase()), pageable)
                : stockCheckRepository.findByCreatedBy(userId, pageable);
        var userMap = fetchUserNames(page.getContent());
        return ResponsePage.of(page.map(sc -> toResponse(sc, userMap)));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse create(CreateStockCheckRequest request) {
        Long userId = securityPolicy.requireAuthenticated();

        if (request.scopeType() == null || request.scopeId() == null) {
            throw new InvalidRequestException(Message.Inventory.STOCK_CHECK_ITEMS_REQUIRED);
        }

        String scopeType = request.scopeType().toUpperCase();
        if (!Set.of("ZONE", "CATEGORY").contains(scopeType)) {
            throw new InvalidRequestException(Message.Inventory.STOCK_CHECK_INVALID_SCOPE);
        }

        List<Long> unitIds = resolveUnitIdsByScope(scopeType, request.scopeId());
        if (unitIds.isEmpty()) {
            throw new InvalidRequestException(Message.Inventory.STOCK_CHECK_NO_UNITS_IN_SCOPE);
        }

        String checkCode = generateCheckCode();
        StockCheck sc = StockCheck.builder()
                .checkCode(checkCode)
                .status(StockCheckStatus.PENDING)
                .scopeType(scopeType)
                .scopeId(request.scopeId())
                .note(request.note())
                .createdBy(userId)
                .build();
        sc = stockCheckRepository.save(sc);
        Long scId = sc.getId();

        var units = productUnitRepository.findAllById(unitIds);
        var productIds = units.stream().map(ProductUnit::getProductId).distinct().toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        for (var unit : units) {
            String tt = unit.getTrackingType();
            if (tt == null) {
                var p = products.get(unit.getProductId());
                tt = p != null ? p.getTrackingType() : TrackingType.SERIALIZED.name();
            }
            stockCheckItemRepository.save(StockCheckItem.builder()
                    .stockCheckId(scId)
                    .productUnitId(unit.getId())
                    .trackingType(tt)
                    .expectedStatus(unit.getStatus().name())
                    .build());
        }

        sc.setStatus(StockCheckStatus.IN_PROGRESS);
        sc = stockCheckRepository.save(sc);
        return toResponse(sc);
    }

    private List<Long> resolveUnitIdsByScope(String scopeType, Long scopeId) {
        if ("ZONE".equals(scopeType)) {
            var refLocation = locationRepository.findById(scopeId)
                    .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.LOCATION_NOT_FOUND));
            var locationIds = locationRepository.findByZoneCode(refLocation.getZoneCode())
                    .stream().map(Location::getId).toList();
            if (locationIds.isEmpty()) return List.of();
            return productUnitRepository.findByLocationIdInAndStatus(
                    locationIds, ProductUnitStatus.IN_STOCK).stream()
                    .map(ProductUnit::getId).toList();
        }
        return productUnitRepository.findByProductIdInAndStatus(
                List.of(scopeId), ProductUnitStatus.IN_STOCK).stream()
                .map(ProductUnit::getId).toList();
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.RECORD_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse recordItems(Long stockCheckId, StockCheckItemRequest.BatchRequest request) {
        Long userId = securityPolicy.requireAuthenticated();
        var sc = stockCheckRepository.findById(stockCheckId)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.STOCK_CHECK_NOT_FOUND));

        if (StockCheckStatus.IN_PROGRESS != sc.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.STOCK_CHECK_MUST_BE_IN_PROGRESS);
        }

        var existingItems = stockCheckItemRepository.findByStockCheckId(stockCheckId);
        Map<Long, StockCheckItem> itemMap = existingItems.stream()
                .collect(Collectors.toMap(StockCheckItem::getProductUnitId, i -> i));

        for (var req : request.items()) {
            var item = itemMap.get(req.productUnitId());
            if (item == null) {
                throw new InvalidRequestException(Message.format(Message.Inventory.STOCK_CHECK_ITEM_NOT_IN_CHECK, req.productUnitId()));
            }

            String oldActual = item.getActualStatus();
            String newActual = req.actualStatus();

            if (newActual != null) {
                newActual = newActual.toUpperCase();

                if (oldActual != null && !oldActual.equals(newActual)) {
                    itemHistoryRepository.save(StockCheckItemHistory.builder()
                            .stockCheckId(stockCheckId)
                            .productUnitId(req.productUnitId())
                            .oldActualStatus(oldActual)
                            .newActualStatus(newActual)
                            .oldCountedQuantity(item.getCountedQuantity())
                            .newCountedQuantity(req.countedQuantity())
                            .note("Recorded by user " + userId)
                            .changedBy(userId)
                            .build());
                }

                if (ProductUnitStatus.DAMAGED_IN_STORAGE.name().equals(newActual) && (req.photo() == null || req.photo().isBlank())) {
                    throw new InvalidRequestException(Message.Inventory.STOCK_CHECK_PHOTO_REQUIRED_DAMAGED);
                }

                item.setActualStatus(newActual);
                item.setCountedQuantity(req.countedQuantity());
                item.setPhoto(req.photo());
                item.setAutoFilled(false);

                String expected = item.getExpectedStatus();
                if (expected == null) expected = ProductUnitStatus.IN_STOCK.name();

                if (newActual.equals(expected)) {
                    item.setDifference(org.dawn.backend.constant.enums.inventory.stockcheck.DifferenceType.MATCH.name());
                } else if (ProductUnitStatus.LOST.name().equals(newActual) || org.dawn.backend.constant.enums.inventory.stockcheck.DifferenceType.MISSING.name().equalsIgnoreCase(newActual)) {
                    item.setDifference(org.dawn.backend.constant.enums.inventory.stockcheck.DifferenceType.MISSING.name());
                } else {
                    item.setDifference(org.dawn.backend.constant.enums.inventory.stockcheck.DifferenceType.UNEXPECTED.name());
                }
            } else {
                item.setActualStatus(null);
                item.setCountedQuantity(null);
                item.setPhoto(null);
                item.setDifference(null);
            }

            item.setNote(req.note());
            stockCheckItemRepository.save(item);
        }

        return toResponse(sc);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.COMPLETE_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse complete(Long id) {
        var sc = stockCheckRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.STOCK_CHECK_NOT_FOUND));

        var items = stockCheckItemRepository.findByStockCheckId(id);
        int autoFilledCount = 0;
        List<String> bulkMissing = new ArrayList<>();

        for (var item : items) {
            if (item.getActualStatus() != null) continue;

            String tt = item.getTrackingType();
            boolean isBulk = tt != null && TrackingType.BULK.name().equals(tt);

            if (isBulk) {
                if (item.getCountedQuantity() == null) {
                    bulkMissing.add("ProductUnit #" + item.getProductUnitId());
                }
            } else {
                item.setActualStatus(ProductUnitStatus.IN_STOCK.name());
                item.setCountedQuantity(BigDecimal.ONE);
                item.setAutoFilled(true);
                item.setDifference(org.dawn.backend.constant.enums.inventory.stockcheck.DifferenceType.MATCH.name());
                stockCheckItemRepository.save(item);
                autoFilledCount++;
            }
        }

        if (!bulkMissing.isEmpty()) {
throw new InvalidRequestException(
                    Message.format(Message.Inventory.STOCK_CHECK_BULK_MISSING_QTY, bulkMissing.size(), String.join(", ", bulkMissing)));
        }

        sc.setStatus(StockCheckStatus.COMPLETED);
        sc = stockCheckRepository.save(sc);
        return toResponse(sc, autoFilledCount);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.RECORD_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse importSerials(Long stockCheckId, ImportSerialsRequest request) {
        var sc = stockCheckRepository.findById(stockCheckId)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.STOCK_CHECK_NOT_FOUND));

        var serials = Arrays.stream(request.fileContent().split("[\\n\\r]+"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        var items = stockCheckItemRepository.findByStockCheckId(stockCheckId);
        var unitIds = items.stream().map(StockCheckItem::getProductUnitId).toList();
        var units = productUnitRepository.findAllById(unitIds).stream()
                .collect(Collectors.toMap(ProductUnit::getId, u -> u));

        int matched = 0;
        List<String> invalidSerials = new ArrayList<>();
        var importedSet = new HashSet<>(serials);

        for (var item : items) {
            var pu = units.get(item.getProductUnitId());
            String sn = pu != null ? pu.getSerialNumber() : null;
            if (sn == null || !importedSet.contains(sn)) continue;
            matched++;
            item.setActualStatus(ProductUnitStatus.IN_STOCK.name());
            item.setCountedQuantity(BigDecimal.ONE);
            item.setAutoFilled(false);
            item.setDifference(org.dawn.backend.constant.enums.inventory.stockcheck.DifferenceType.MATCH.name());
            stockCheckItemRepository.save(item);
        }

        return toResponse(sc);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.START_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse start(Long id) {
        var sc = stockCheckRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.STOCK_CHECK_NOT_FOUND));

        sc.setStatus(StockCheckStatus.IN_PROGRESS);
        sc = stockCheckRepository.save(sc);
        return toResponse(sc);
    }

    @Transactional(readOnly = true)
    public long countItemsInProgressByUnitId(Long productUnitId) {
        var inProgressIds = stockCheckRepository.findByStatus(StockCheckStatus.IN_PROGRESS)
                .stream().map(StockCheck::getId).toList();
        if (inProgressIds.isEmpty()) return 0;
        return stockCheckItemRepository.findByStockCheckIdInAndProductUnitId(inProgressIds, productUnitId).size();
    }

    private Map<Long, String> fetchUserNames(List<StockCheck> checks) {
        var userIds = checks.stream().flatMap(sc -> {
            var ids = new ArrayList<Long>();
            ids.add(sc.getCreatedBy());
            if (sc.getApprovedBy() != null) ids.add(sc.getApprovedBy());
            return ids.stream();
        }).distinct().toList();
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
    }

    public StockCheckResponse toResponse(StockCheck sc, Map<Long, String> userMap) {
        var items = stockCheckItemRepository.findByStockCheckId(sc.getId());
        var unitIds = items.stream().map(StockCheckItem::getProductUnitId).toList();
        var units = productUnitRepository.findAllById(unitIds).stream()
                .collect(Collectors.toMap(ProductUnit::getId, u -> u));
        var productIds = units.values().stream().map(ProductUnit::getProductId).toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        var createdByName = userMap.get(sc.getCreatedBy());
        var approvedByName = sc.getApprovedBy() != null ? userMap.get(sc.getApprovedBy()) : null;
        return StockCheckMappingHelper.map(sc, createdByName, approvedByName, items, units, products);
    }

    public StockCheckResponse toResponse(StockCheck sc) {
        var items = stockCheckItemRepository.findByStockCheckId(sc.getId());
        var unitIds = items.stream().map(StockCheckItem::getProductUnitId).toList();
        var units = productUnitRepository.findAllById(unitIds).stream()
                .collect(Collectors.toMap(ProductUnit::getId, u -> u));
        var productIds = units.values().stream().map(ProductUnit::getProductId).toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        var createdByName = userRepository.findById(sc.getCreatedBy())
                .map(User::getFullName).orElse(null);
        var approvedByName = sc.getApprovedBy() != null
                ? userRepository.findById(sc.getApprovedBy()).map(User::getFullName).orElse(null)
                : null;
        return StockCheckMappingHelper.map(sc, createdByName, approvedByName, items, units, products);
    }

    private StockCheckResponse toResponse(StockCheck sc, int autoFilledCount) {
        var items = stockCheckItemRepository.findByStockCheckId(sc.getId());
        var unitIds = items.stream().map(StockCheckItem::getProductUnitId).toList();
        var units = productUnitRepository.findAllById(unitIds).stream()
                .collect(Collectors.toMap(ProductUnit::getId, u -> u));
        var productIds = units.values().stream().map(ProductUnit::getProductId).toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        var createdByName = userRepository.findById(sc.getCreatedBy())
                .map(User::getFullName).orElse(null);
        var approvedByName = sc.getApprovedBy() != null
                ? userRepository.findById(sc.getApprovedBy()).map(User::getFullName).orElse(null)
                : null;
        return StockCheckMappingHelper.map(sc, createdByName, approvedByName, items, units, products, autoFilledCount);
    }

    private String generateCheckCode() {
        return ReceiptCodeGenerator.generate("SC-", stockCheckRepository::existsByCheckCode);
    }
}
