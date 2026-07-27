package org.dawn.backend.service.inventory;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.anno.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.catalog.TrackingType;
import org.dawn.backend.constant.inventory.*;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.request.ApproveStockCheckRequest;
import org.dawn.backend.controller.inventory.request.CreateStockCheckRequest;
import org.dawn.backend.controller.inventory.request.ImportSerialsRequest;
import org.dawn.backend.controller.inventory.request.StockCheckItemRequest;
import org.dawn.backend.controller.inventory.response.StockCheckResponse;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.*;
import org.dawn.backend.exception.wrapper.InvalidRequestException;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.*;
import org.dawn.backend.utils.ReceiptCodeGenerator;
import org.dawn.backend.utils.SecurityUtils;
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
    private final StockAdjustmentRepository adjustmentRepository;
    private final ProductUnitRepository productUnitRepository;
    private final ProductUnitStatusLogRepository statusLogRepository;
    private final LocationRepository locationRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public ResponsePage<StockCheckResponse> findAll(Pageable pageable, String status) {
        var page = status != null
                ? stockCheckRepository.findByStatus(StockCheckStatus.valueOf(status.toUpperCase()), pageable)
                : stockCheckRepository.findAll(pageable);
        var userMap = fetchUserNames(page.getContent());
        return ResponsePage.of(page.map(sc -> enrich(sc, userMap)));
    }

    @Transactional(readOnly = true)
    public StockCheckResponse findOne(Long id) {
        var sc = stockCheckRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.STOCK_CHECK_NOT_FOUND));
        return enrich(sc);
    }

    @Transactional(readOnly = true)
    public ResponsePage<StockCheckResponse> findMyChecks(Pageable pageable, String status) {
        Long userId = SecurityUtils.getCurrentUserId();
        var page = status != null
                ? stockCheckRepository.findByCreatedByAndStatus(userId, StockCheckStatus.valueOf(status.toUpperCase()), pageable)
                : stockCheckRepository.findByCreatedBy(userId, pageable);
        var userMap = fetchUserNames(page.getContent());
        return ResponsePage.of(page.map(sc -> enrich(sc, userMap)));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse create(CreateStockCheckRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new InvalidRequestException(Message.Auth.USER_NOT_AUTHENTICATED);

        if (request.scopeType() == null || request.scopeId() == null) {
            throw new InvalidRequestException(Message.Inventory.STOCK_CHECK_ITEMS_REQUIRED);
        }

        String scopeType = request.scopeType().toUpperCase();
        if (!Set.of("ZONE", "CATEGORY").contains(scopeType)) {
            throw new InvalidRequestException("Invalid scope type. Must be ZONE or CATEGORY");
        }

        List<Long> unitIds = resolveUnitIdsByScope(scopeType, request.scopeId());
        if (unitIds.isEmpty()) {
            throw new InvalidRequestException("No in-stock units found in the selected scope");
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
        return enrich(sc);
    }

    private List<Long> resolveUnitIdsByScope(String scopeType, Long scopeId) {
        if ("ZONE".equals(scopeType)) {
            var refLocation = locationRepository.findById(scopeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Location not found"));
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
        Long userId = SecurityUtils.getCurrentUserId();
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
                throw new InvalidRequestException("Product unit " + req.productUnitId() + " is not part of this stock check");
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
                    throw new InvalidRequestException("Photo is required when reporting DAMAGED status");
                }

                item.setActualStatus(newActual);
                item.setCountedQuantity(req.countedQuantity());
                item.setPhoto(req.photo());
                item.setAutoFilled(false);

                String expected = item.getExpectedStatus();
                if (expected == null) expected = ProductUnitStatus.IN_STOCK.name();

                if (newActual.equals(expected)) {
                    item.setDifference(DifferenceType.MATCH.name());
                } else if (ProductUnitStatus.LOST.name().equals(newActual) || DifferenceType.MISSING.name().equalsIgnoreCase(newActual)) {
                    item.setDifference(DifferenceType.MISSING.name());
                } else {
                    item.setDifference(DifferenceType.UNEXPECTED.name());
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

        return enrich(sc);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.COMPLETE_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse complete(Long id) {
        var sc = stockCheckRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.STOCK_CHECK_NOT_FOUND));

        if (StockCheckStatus.IN_PROGRESS != sc.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.STOCK_CHECK_ALREADY_COMPLETED);
        }

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
                item.setDifference(DifferenceType.MATCH.name());
                stockCheckItemRepository.save(item);
                autoFilledCount++;
            }
        }

        if (!bulkMissing.isEmpty()) {
            throw new InvalidRequestException(
                    "Cannot complete: " + bulkMissing.size() + " bulk item(s) missing counted quantity: "
                            + String.join(", ", bulkMissing));
        }

        sc.setStatus(StockCheckStatus.COMPLETED);
        sc = stockCheckRepository.save(sc);
        return enrich(sc, autoFilledCount);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.RECORD_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse importSerials(Long stockCheckId, ImportSerialsRequest request) {
        var sc = stockCheckRepository.findById(stockCheckId)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.STOCK_CHECK_NOT_FOUND));

        if (StockCheckStatus.IN_PROGRESS != sc.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.STOCK_CHECK_MUST_BE_IN_PROGRESS);
        }

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
            item.setDifference(DifferenceType.MATCH.name());
            stockCheckItemRepository.save(item);
        }

        // report invalid — serials in file not matching any item
        var allSerials = items.stream()
                .map(i -> units.get(i.getProductUnitId()))
                .filter(Objects::nonNull)
                .map(ProductUnit::getSerialNumber)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        for (var s : serials) {
            if (!allSerials.contains(s)) invalidSerials.add(s);
        }

        return enrich(sc);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.START_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse start(Long id) {
        var sc = stockCheckRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.STOCK_CHECK_NOT_FOUND));

        if (StockCheckStatus.PENDING != sc.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.STOCK_CHECK_ALREADY_STARTED);
        }

        sc.setStatus(StockCheckStatus.IN_PROGRESS);
        sc = stockCheckRepository.save(sc);
        return enrich(sc);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.APPROVE_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse approve(Long id, ApproveStockCheckRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        var sc = stockCheckRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.STOCK_CHECK_NOT_FOUND));

        if (StockCheckStatus.COMPLETED != sc.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.ONLY_COMPLETED_CAN_APPROVE);
        }
        // if (sc.getCreatedBy().equals(userId)) {
        //     throw new InvalidRequestException(Message.Inventory.CREATOR_CANNOT_APPROVE);
        // }

        var items = stockCheckItemRepository.findByStockCheckId(id);
        for (var item : items) {
            String diff = item.getDifference();
            if (DifferenceType.MATCH.name().equals(diff) || item.getActualStatus() == null) continue;

            AdjustmentType adjType;
            if (DifferenceType.MISSING.name().equals(diff)) {
                adjType = AdjustmentType.LOST;
            } else {
                adjType = AdjustmentType.FOUND;
            }

            StockAdjustment adj = StockAdjustment.builder()
                    .adjustCode(generateAdjustCode())
                    .type(adjType.name())
                    .productUnitId(item.getProductUnitId())
                    .reason("Auto-generated from stock check #" + sc.getCheckCode())
                    .status(AdjustmentStatus.APPROVED)
                    .sourceType(AdjustmentSourceType.STOCK_CHECK.name())
                    .sourceId(id)
                    .createdBy(userId)
                    .approvedBy(userId)
                    .build();
            adj = adjustmentRepository.save(adj);

            var unit = productUnitRepository.findById(item.getProductUnitId()).orElse(null);
            if (unit == null) continue;

            ProductUnitStatus oldStatus = unit.getStatus();
            ProductUnitStatus newStatus;
            if (DifferenceType.MISSING.name().equals(diff)) {
                newStatus = ProductUnitStatus.LOST;
            } else {
                try {
                    newStatus = ProductUnitStatus.valueOf(item.getActualStatus());
                } catch (IllegalArgumentException e) {
                    newStatus = ProductUnitStatus.LOST;
                }
            }

            unit.setStatus(newStatus);
            productUnitRepository.save(unit);
            statusLogRepository.save(ProductUnitStatusLog.builder()
                    .productUnitId(unit.getId())
                    .fromStatus(oldStatus.name())
                    .toStatus(newStatus.name())
                    .sourceType(SourceType.STOCK_CHECK.name())
                    .sourceId(id)
                    .changedBy(userId)
                    .build());
        }

        sc.setStatus(StockCheckStatus.APPROVED);
        sc.setApprovedBy(userId);
        sc.setApprovalNote(request != null ? request.approvalNote() : null);
        sc = stockCheckRepository.save(sc);
        return enrich(sc);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.REJECT_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse reject(Long id, ApproveStockCheckRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        var sc = stockCheckRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.STOCK_CHECK_NOT_FOUND));

        if (StockCheckStatus.COMPLETED != sc.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.ONLY_COMPLETED_CAN_REJECT);
        }
        // if (sc.getCreatedBy().equals(userId)) {
        //     throw new InvalidRequestException(Message.Inventory.CREATOR_CANNOT_APPROVE);
        // }

        if (request == null || request.approvalNote() == null || request.approvalNote().isBlank()) {
            throw new InvalidRequestException("Rejection reason is required");
        }

        sc.setStatus(StockCheckStatus.IN_PROGRESS);
        sc.setApprovalNote(request.approvalNote());
        sc = stockCheckRepository.save(sc);
        return enrich(sc);
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

    private StockCheckResponse enrich(StockCheck sc, Map<Long, String> userMap) {
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

    private StockCheckResponse enrich(StockCheck sc) {
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

    private StockCheckResponse enrich(StockCheck sc, int autoFilledCount) {
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

    private String generateAdjustCode() {
        return ReceiptCodeGenerator.generate("ADJ-", adjustmentRepository::existsByAdjustCode);
    }
}