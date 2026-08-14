package org.dawn.backend.service.inventory.stockcheck;
import org.dawn.backend.constant.shared.ErrorCode;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.enums.catalog.TrackingType;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.box.BoxStatus;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentStatus;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentType;
import org.dawn.backend.constant.enums.inventory.stockcheck.DifferenceType;
import org.dawn.backend.constant.enums.inventory.stockcheck.StockCheckScopeType;
import org.dawn.backend.constant.enums.inventory.stockcheck.StockCheckStatus;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.controller.inventory.request.CreateStockCheckRequest;
import org.dawn.backend.controller.inventory.request.StockCheckItemRequest;
import org.dawn.backend.controller.inventory.request.StockCheckScheduleRequest;
import org.dawn.backend.controller.inventory.response.StockCheckResponse;
import org.dawn.backend.controller.inventory.response.StockCheckScheduleResponse;
import org.dawn.backend.controller.inventory.response.StockCheckZoneStatusResponse;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.*;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.adjustments.StockAdjustmentRepository;
import org.dawn.backend.repository.inventory.box.BoxRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckItemHistoryRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckItemRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckScheduleRepository;
import org.dawn.backend.service.inventory.box.BoxService;
import org.dawn.backend.shared.util.ReceiptCodeGenerator;
import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.shared.statemachine.StateMachine;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockCheckService {

    private final StockCheckRepository stockCheckRepository;
    private final StockCheckItemRepository stockCheckItemRepository;
    private final StockCheckItemHistoryRepository itemHistoryRepository;
    private final StockCheckScheduleRepository scheduleRepository;
    private final ProductUnitRepository productUnitRepository;
    private final LocationRepository locationRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final StockAdjustmentRepository adjustmentRepository;
    private final BoxRepository boxRepository;
    private final BoxService boxService;
    private final SecurityPolicy securityPolicy;
    private final StateMachine<StockCheckStatus> stockCheckStateMachine;
    private final ObjectMapper objectMapper;

    private static final List<StockCheckStatus> ACTIVE_STATUSES =
            List.of(StockCheckStatus.PENDING, StockCheckStatus.IN_PROGRESS);

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
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.STOCK_CHECK_NOT_FOUND));
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

    @Transactional(readOnly = true)
    public int countUnitsInScope(String scopeType, Long scopeId, String binFrom, String binTo) {
        var unitIds = resolveUnitIdsByScope(parseScope(scopeType), scopeId, binFrom, binTo);
        return unitIds.size();
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse create(CreateStockCheckRequest request) {
        Long userId = securityPolicy.requireAuthenticated();

        if (request.scopeType() == null || request.scopeId() == null) {
            throw new InvalidRequestException(ErrorCode.STOCK_CHECK_ITEMS_REQUIRED);
        }

        StockCheckScopeType scopeType = parseScope(request.scopeType());
        if (scopeType != StockCheckScopeType.ZONE) {
            throw new InvalidRequestException(ErrorCode.STOCK_CHECK_SCOPE_TYPE_REMOVED.format(scopeType.name()));
        }

        List<Long> unitIds = resolveUnitIdsByScope(scopeType, request.scopeId(), request.binFrom(), request.binTo());
        List<Long> blocked = unitIds.stream()
                .filter(id -> stockCheckItemRepository.existsByProductUnitIdInActiveCheck(id))
                .toList();
        if (!blocked.isEmpty()) {
            throw new InvalidRequestException(ErrorCode.STOCK_CHECK_UNIT_IN_ANOTHER_CHECK.format(blocked.get(0)));
        }
        if (unitIds.isEmpty()) {
            throw new InvalidRequestException(ErrorCode.STOCK_CHECK_NO_UNITS_IN_SCOPE);
        }

        StockCheck sc = StockCheck.builder()
                .checkCode(generateCheckCode())
                .status(StockCheckStatus.IN_PROGRESS)
                .scopeType(scopeType.name())
                .scopeId(request.scopeId())
                .binFrom(request.binFrom())
                .binTo(request.binTo())
                .note(request.note())
                .createdBy(userId)
                .checkedBy(userId)
                .build();
        sc = stockCheckRepository.save(sc);

        snapshot(sc, unitIds);
        return toResponse(sc);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.START_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse start(Long id) {
        Long userId = securityPolicy.requireAuthenticated();
        var sc = stockCheckRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.STOCK_CHECK_NOT_FOUND));

        stockCheckStateMachine.validate(sc.getStatus(), StockCheckStatus.IN_PROGRESS);

        List<Long> unitIds = resolveUnitIdsByScope(
                StockCheckScopeType.valueOf(sc.getScopeType()), sc.getScopeId(), sc.getBinFrom(), sc.getBinTo());
        sc.setStatus(StockCheckStatus.IN_PROGRESS);
        sc.setCheckedBy(userId);
        sc = stockCheckRepository.save(sc);
        snapshot(sc, unitIds);
        return toResponse(sc);
    }

    private void snapshot(StockCheck sc, List<Long> unitIds) {
        if (unitIds.isEmpty()) {
            throw new InvalidRequestException(ErrorCode.STOCK_CHECK_NO_UNITS_IN_SCOPE);
        }
        var units = productUnitRepository.findAllById(unitIds);
        var productIds = units.stream().map(ProductUnit::getProductId).distinct().toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        for (var unit : units) {
            TrackingType tt = unit.getTrackingType() == null ? null : TrackingType.valueOf(unit.getTrackingType());
            if (tt == null) {
                var p = products.get(unit.getProductId());
                tt = p != null ? TrackingType.valueOf(p.getTrackingType()) : TrackingType.SERIALIZED;
            }
            stockCheckItemRepository.save(StockCheckItem.builder()
                    .stockCheckId(sc.getId())
                    .productUnitId(unit.getId())
                    .trackingType(tt.name())
                    .expectedStatus(unit.getStatus().name())
                    .expectedQuantity(tt == TrackingType.BULK ? unit.getRemainingQuantity() : null)
                    .build());
        }
        sc.setBoxStatusSnapshot(boxStatusSnapshotJson(sc));
        stockCheckRepository.save(sc);
    }

    private String boxStatusSnapshotJson(StockCheck sc) {
        if (!"ZONE".equals(sc.getScopeType())) return null;
        var scopeLocations = scopeLocations(sc);
        var boxes = boxRepository.findByLocationIdIn(scopeLocations.stream().map(Location::getId).toList());
        Map<Long, String> statusById = new HashMap<>();
        for (var b : boxes) {
            statusById.put(b.getId(), b.getStatus().name());
        }
        try {
            return objectMapper.writeValueAsString(statusById);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize box status snapshot", e);
        }
    }

    private List<Location> scopeLocations(StockCheck sc) {
        var ref = locationRepository.findById(sc.getScopeId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.LOCATION_NOT_FOUND));
        return locationsInRange(ref.getZoneCode(), sc.getBinFrom(), sc.getBinTo());
    }

    private List<Location> locationsInRange(String zoneCode, String binFrom, String binTo) {
        if (binFrom == null && binTo == null) {
            return locationRepository.findByZoneCode(zoneCode);
        }
        if (binFrom == null || binTo == null) {
            return List.of();
        }
        return locationRepository.findByZoneCodeAndBinCodeBetween(zoneCode, binFrom, binTo);
    }

    StockCheckScopeType parseScope(String raw) {
        try {
            return StockCheckScopeType.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidRequestException(ErrorCode.STOCK_CHECK_INVALID_SCOPE);
        }
    }

    List<Long> resolveUnitIdsByScope(StockCheckScopeType scopeType, Long scopeId, String binFrom, String binTo) {
        if (scopeType == StockCheckScopeType.ZONE) {
            var refLocation = locationRepository.findById(scopeId)
                    .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.LOCATION_NOT_FOUND));
            List<Location> scopeLocations;
            if (binFrom != null || binTo != null) {
                scopeLocations = locationRepository.findByZoneCodeAndBinCodeBetween(
                        refLocation.getZoneCode(), binFrom, binTo);
                if (scopeLocations.isEmpty()) {
                    throw new InvalidRequestException(ErrorCode.STOCK_CHECK_INVALID_BIN_RANGE.format(
                            binFrom, binTo, refLocation.getZoneCode()));
                }
            } else {
                scopeLocations = locationRepository.findByZoneCode(refLocation.getZoneCode());
            }
            var locationIds = scopeLocations.stream().map(Location::getId).toList();
            if (locationIds.isEmpty()) return List.of();
            var unitIds = new ArrayList<>(productUnitRepository.findByLocationIdInAndStatus(
                    locationIds, ProductUnitStatus.IN_STOCK).stream()
                    .map(ProductUnit::getId).toList());
            var boxIds = boxRepository.findByLocationIdInAndStatus(locationIds, BoxStatus.SEALED).stream().map(Box::getId).toList();
            if (!boxIds.isEmpty()) {
                unitIds.addAll(productUnitRepository.findByBoxIdInAndStatus(boxIds, ProductUnitStatus.IN_STOCK)
                        .stream().map(ProductUnit::getId).toList());
            }
            return unitIds.stream().distinct().toList();
        }
        return List.of();
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.RECORD_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse recordItems(Long stockCheckId, StockCheckItemRequest.BatchRequest request) {
        Long userId = securityPolicy.requireAuthenticated();
        var sc = stockCheckRepository.findByIdForUpdate(stockCheckId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.STOCK_CHECK_NOT_FOUND));

        if (StockCheckStatus.IN_PROGRESS != sc.getStatus()) {
            throw new InvalidRequestException(ErrorCode.STOCK_CHECK_MUST_BE_IN_PROGRESS);
        }

        var existingItems = stockCheckItemRepository.findByStockCheckId(stockCheckId);
        Map<Long, StockCheckItem> itemMap = existingItems.stream()
                .collect(Collectors.toMap(StockCheckItem::getProductUnitId, i -> i));

        for (var req : request.items()) {
            var item = itemMap.get(req.productUnitId());
            if (item == null) {
                throw new InvalidRequestException(ErrorCode.STOCK_CHECK_ITEM_NOT_IN_CHECK.format(req.productUnitId()));
            }

            ProductUnitStatus oldActual = item.getActualStatus() == null ? null : ProductUnitStatus.valueOf(item.getActualStatus());
            ProductUnitStatus newActual = null;
            if (req.actualStatus() != null) {
                try {
                    newActual = ProductUnitStatus.valueOf(req.actualStatus().toUpperCase());
                } catch (IllegalArgumentException e) {
                    throw new InvalidRequestException(ErrorCode.STOCK_CHECK_INVALID_STATUS, req.actualStatus());
                }
                if (newActual == ProductUnitStatus.DEFECTIVE) {
                    throw new InvalidRequestException(ErrorCode.STOCK_CHECK_INVALID_STATUS, req.actualStatus());
                }
            }

            if (newActual != null) {

                if (oldActual != null && oldActual != newActual) {
                    itemHistoryRepository.save(StockCheckItemHistory.builder()
                            .stockCheckId(stockCheckId)
                            .productUnitId(req.productUnitId())
                            .oldActualStatus(oldActual.name())
                            .newActualStatus(newActual.name())
                            .oldCountedQuantity(item.getCountedQuantity())
                            .newCountedQuantity(req.countedQuantity())
                            .note("Recorded by user " + userId)
                            .changedBy(userId)
                            .build());
                }

                if (newActual == ProductUnitStatus.DAMAGED_IN_STORAGE && (req.photo() == null || req.photo().isBlank())) {
                    throw new InvalidRequestException(ErrorCode.STOCK_CHECK_PHOTO_REQUIRED_DAMAGED);
                }

                item.setActualStatus(newActual.name());
                item.setCountedQuantity(req.countedQuantity());
                item.setPhoto(req.photo());
                item.setAutoFilled(false);

                ProductUnitStatus expected = item.getExpectedStatus() == null
                        ? ProductUnitStatus.IN_STOCK
                        : ProductUnitStatus.valueOf(item.getExpectedStatus());

                if ("BULK".equals(item.getTrackingType())) {
                    DifferenceType bulkDiff = computeBulkDifference(item, newActual);
                    item.setDifference(bulkDiff != null ? bulkDiff.name() : null);
                } else if (newActual == expected) {
                    item.setDifference(DifferenceType.MATCH.name());
                } else if (newActual == ProductUnitStatus.LOST) {
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
            if (req.suspectSeal() != null) item.setSuspectSeal(req.suspectSeal());
            if (req.damagedPackaging() != null) item.setDamagedPackaging(req.damagedPackaging());
            item.setTouchedAt(Instant.now());
            stockCheckItemRepository.save(item);
        }

        if (sc.getEnteredBy() == null) {
            sc.setEnteredBy(userId);
            sc = stockCheckRepository.save(sc);
        }
        return toResponse(sc);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.COMPLETE_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse complete(Long id, boolean confirmUntouched) {
        Long userId = securityPolicy.requireAuthenticated();
        var sc = stockCheckRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.STOCK_CHECK_NOT_FOUND));

        stockCheckStateMachine.validate(sc.getStatus(), StockCheckStatus.COMPLETED);

        var items = stockCheckItemRepository.findByStockCheckId(id);
        List<String> bulkMissing = items.stream()
                .filter(item -> "BULK".equals(item.getTrackingType()) && item.getCountedQuantity() == null)
                .map(item -> "ProductUnit #" + item.getProductUnitId())
                .toList();
        if (!bulkMissing.isEmpty()) {
            throw new InvalidRequestException(
                    ErrorCode.STOCK_CHECK_BULK_MISSING_QTY.format(bulkMissing.size(), String.join(", ", bulkMissing)));
        }

        List<StockCheckItem> untouched = items.stream()
                .filter(item -> item.getActualStatus() == null)
                .toList();
        if (!untouched.isEmpty() && !confirmUntouched) {
            throw new InvalidRequestException(ErrorCode.STOCK_CHECK_UNTOUCHED_ITEMS.format(
                    untouched.size(), untouched.stream()
                            .map(i -> "ProductUnit #" + i.getProductUnitId())
                            .collect(Collectors.joining(", "))));
        }

        for (var item : untouched) {
            item.setActualStatus(item.getExpectedStatus() == null
                    ? ProductUnitStatus.IN_STOCK.name() : item.getExpectedStatus());
            item.setCountedQuantity(BigDecimal.ONE);
            item.setDifference(DifferenceType.MATCH.name());
            item.setAutoFilled(false);
            item.setTouchedAt(Instant.now());
            stockCheckItemRepository.save(item);
        }

        if (adjustmentRepository.existsBySourceTypeAndSourceId(SourceType.STOCK_CHECK.name(), id)) {
            throw new InvalidRequestException(ErrorCode.STOCK_CHECK_ADJUSTMENTS_EXIST);
        }
        applyAdjustments(sc, items, userId);

        restoreBoxes(sc.getBoxStatusSnapshot());
        touchLocations(sc);
        if (sc.getEnteredBy() == null) {
            sc.setEnteredBy(userId);
        }

        sc.setStatus(StockCheckStatus.COMPLETED);
        sc = stockCheckRepository.save(sc);
        return toResponse(sc);
    }

    private void restoreBoxes(String snapshotJson) {
        if (snapshotJson == null || snapshotJson.isBlank()) return;
        Map<Long, String> statusById;
        try {
            statusById = objectMapper.readValue(snapshotJson,
                    objectMapper.getTypeFactory().constructMapType(HashMap.class, Long.class, String.class));
        } catch (JsonProcessingException e) {
            log.warn("Cannot parse box status snapshot, skipping box restore: {}", e.getMessage());
            return;
        }
        for (var entry : statusById.entrySet()) {
            if (BoxStatus.SEALED.name().equals(entry.getValue())) {
                boxService.reclose(entry.getKey());
            }
        }
    }

    private void touchLocations(StockCheck sc) {
        if (!"ZONE".equals(sc.getScopeType())) return;
        for (var loc : scopeLocations(sc)) {
            loc.setLastCheckedAt(Instant.now());
            locationRepository.save(loc);
        }
    }

    private void applyAdjustments(StockCheck sc, List<StockCheckItem> items, Long userId) {
        for (var item : items) {
            ProductUnitStatus actual = item.getActualStatus() == null ? null : ProductUnitStatus.valueOf(item.getActualStatus());
            DifferenceType diff = item.getDifference() == null ? null : DifferenceType.valueOf(item.getDifference());
            if (actual == null || diff == DifferenceType.MATCH) continue;

            BigDecimal quantity;
            AdjustmentType adjType;
            if ("BULK".equals(item.getTrackingType())) {
                BigDecimal expected = item.getExpectedQuantity() != null ? item.getExpectedQuantity() : BigDecimal.ZERO;
                BigDecimal counted = item.getCountedQuantity() != null ? item.getCountedQuantity() : BigDecimal.ZERO;
                if (actual == ProductUnitStatus.LOST || actual == ProductUnitStatus.DAMAGED_IN_STORAGE) {
                    quantity = expected;
                    adjType = actual == ProductUnitStatus.DAMAGED_IN_STORAGE ? AdjustmentType.DAMAGED : AdjustmentType.LOST;
                } else if (diff == DifferenceType.UNEXPECTED) {
                    quantity = counted.subtract(expected);
                    adjType = AdjustmentType.FOUND;
                } else {
                    quantity = expected.subtract(counted);
                    adjType = AdjustmentType.LOST;
                }
            } else {
                quantity = BigDecimal.ONE;
                adjType = switch (diff) {
                    case MISSING -> AdjustmentType.LOST;
                    default -> actual == ProductUnitStatus.DAMAGED_IN_STORAGE
                            ? AdjustmentType.DAMAGED
                            : AdjustmentType.FOUND;
                };
            }
            if (quantity.signum() <= 0) continue;

            adjustmentRepository.save(StockAdjustment.builder()
                    .adjustCode(ReceiptCodeGenerator.generate("ADJ-", adjustmentRepository::existsByAdjustCode))
                    .type(adjType.name())
                    .productUnitId(item.getProductUnitId())
                    .quantity(quantity)
                    .reason("Auto-generated from stock check #" + sc.getCheckCode())
                    .imageUrl(item.getPhoto())
                    .status(AdjustmentStatus.PENDING)
                    .sourceType(SourceType.STOCK_CHECK.name())
                    .sourceId(sc.getId())
                    .createdBy(userId)
                    .build());
        }
    }

    private DifferenceType computeBulkDifference(StockCheckItem item, ProductUnitStatus actual) {
        if (actual == ProductUnitStatus.LOST || actual == ProductUnitStatus.DAMAGED_IN_STORAGE) {
            return DifferenceType.MISSING;
        }
        BigDecimal expected = item.getExpectedQuantity();
        BigDecimal counted = item.getCountedQuantity();
        if (expected == null || counted == null) return null;
        int cmp = counted.compareTo(expected);
        return cmp < 0 ? DifferenceType.MISSING
                : cmp > 0 ? DifferenceType.UNEXPECTED
                : DifferenceType.MATCH;
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CANCEL_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse cancel(Long id) {
        Long userId = securityPolicy.requireAuthenticated();
        var sc = stockCheckRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.STOCK_CHECK_NOT_FOUND));

        if (!sc.getCreatedBy().equals(userId)) {
            throw new InvalidRequestException(ErrorCode.STOCK_CHECK_CANNOT_CANCEL_OTHERS);
        }
        stockCheckStateMachine.validate(sc.getStatus(), StockCheckStatus.CANCELLED);
        sc.setStatus(StockCheckStatus.CANCELLED);
        sc = stockCheckRepository.save(sc);
        return toResponse(sc);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.START_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse reopen(Long id) {
        Long userId = securityPolicy.requireAuthenticated();
        var sc = stockCheckRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.STOCK_CHECK_NOT_FOUND));

        if (StockCheckStatus.COMPLETED != sc.getStatus() && StockCheckStatus.EXPIRED != sc.getStatus()) {
            throw new InvalidRequestException(ErrorCode.STOCK_CHECK_NOT_COMPLETED);
        }
        var adjustments = adjustmentRepository.findBySourceTypeAndSourceId(SourceType.STOCK_CHECK.name(), id);
        for (var adj : adjustments) {
            if (AdjustmentStatus.APPROVED == adj.getStatus()) {
                throw new InvalidRequestException(ErrorCode.STOCK_CHECK_HAS_APPROVED_ADJUSTMENTS);
            }
        }
        for (var adj : adjustments) {
            if (AdjustmentStatus.PENDING == adj.getStatus()) {
                adjustmentRepository.delete(adj);
            }
        }

        stockCheckStateMachine.validate(sc.getStatus(), StockCheckStatus.IN_PROGRESS);
        sc.setStatus(StockCheckStatus.IN_PROGRESS);
        sc.setCheckedBy(userId);
        sc = stockCheckRepository.save(sc);

        if (stockCheckItemRepository.findByStockCheckId(id).isEmpty()) {
            List<Long> unitIds = resolveUnitIdsByScope(
                    StockCheckScopeType.valueOf(sc.getScopeType()), sc.getScopeId(), sc.getBinFrom(), sc.getBinTo());
            snapshot(sc, unitIds);
        }
        return toResponse(sc);
    }

    @Transactional(readOnly = true)
    public long countPendingChecks() {
        return stockCheckRepository.countByStatus(StockCheckStatus.PENDING);
    }

    @Transactional(readOnly = true)
    public StockCheckZoneStatusResponse zoneStatus() {
        long pendingChecks = stockCheckRepository.countByStatus(StockCheckStatus.PENDING);
        Map<String, int[]> counts = new LinkedHashMap<>();
        for (var schedule : scheduleRepository.findByIsActiveTrue()) {
            int[] acc = counts.computeIfAbsent(schedule.getZoneCode(), z -> new int[2]);
            acc[0]++;
            if (isClusterDue(schedule)) {
                acc[1]++;
            }
        }
        List<StockCheckZoneStatusResponse.ZoneStatus> zones = counts.entrySet().stream()
                .map(e -> new StockCheckZoneStatusResponse.ZoneStatus(e.getKey(), e.getValue()[0], e.getValue()[1]))
                .toList();
        return new StockCheckZoneStatusResponse(pendingChecks, zones);
    }

    @Transactional
    public int generateDueStockChecks() {
        int created = 0;
        for (var schedule : scheduleRepository.findByIsActiveTrue()) {
            if (!isClusterDue(schedule)) continue;
            if (stockCheckRepository.existsByStatusInAndScopeTypeAndScopeIdAndBinFromAndBinTo(
                    ACTIVE_STATUSES, StockCheckScopeType.ZONE.name(),
                    representativeLocationId(schedule), schedule.getBinFrom(), schedule.getBinTo())) {
                continue;
            }
            stockCheckRepository.save(StockCheck.builder()
                    .checkCode(generateCheckCode())
                    .status(StockCheckStatus.PENDING)
                    .scopeType(StockCheckScopeType.ZONE.name())
                    .scopeId(representativeLocationId(schedule))
                    .binFrom(schedule.getBinFrom())
                    .binTo(schedule.getBinTo())
                    .note("Tự động từ lịch kiểm định kỳ")
                    .createdBy(schedule.getDefaultAssigneeId() != null ? schedule.getDefaultAssigneeId() : schedule.getCreatedBy())
                    .build());
            created++;
        }
        if (created > 0) {
            log.info("Auto-created {} PENDING stock check(s) from schedules", created);
        }
        return created;
    }

    private boolean isClusterDue(StockCheckSchedule schedule) {
        var locations = locationsInRange(schedule.getZoneCode(), schedule.getBinFrom(), schedule.getBinTo());
        if (locations.isEmpty()) return false;
        Instant lastChecked = locations.stream()
                .map(Location::getLastCheckedAt)
                .filter(Objects::nonNull)
                .max(Instant::compareTo)
                .orElse(null);
        if (lastChecked == null) return true;
        return !lastChecked.plus(Duration.ofDays(schedule.getFrequencyDays())).isAfter(Instant.now());
    }

    private Long representativeLocationId(StockCheckSchedule schedule) {
        return locationsInRange(schedule.getZoneCode(), schedule.getBinFrom(), schedule.getBinTo()).stream()
                .map(Location::getId)
                .min(Long::compareTo)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<StockCheckScheduleResponse> findSchedules() {
        return scheduleRepository.findAll().stream()
                .map(this::toScheduleResponse)
                .toList();
    }

    @Transactional
    public StockCheckScheduleResponse createSchedule(StockCheckScheduleRequest request) {
        Long userId = securityPolicy.requireAuthenticated();
        validateSchedule(request);
        var saved = scheduleRepository.save(StockCheckSchedule.builder()
                .zoneCode(request.zoneCode())
                .binFrom(request.binFrom())
                .binTo(request.binTo())
                .frequencyDays(request.frequencyDays())
                .isActive(request.isActive() == null ? true : request.isActive())
                .defaultAssigneeId(request.defaultAssigneeId())
                .note(request.note())
                .createdBy(userId)
                .build());
        return toScheduleResponse(saved);
    }

    @Transactional
    public StockCheckScheduleResponse updateSchedule(Long id, StockCheckScheduleRequest request) {
        var schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.STOCK_CHECK_SCHEDULE_NOT_FOUND));
        validateSchedule(request);
        schedule.setZoneCode(request.zoneCode());
        schedule.setBinFrom(request.binFrom());
        schedule.setBinTo(request.binTo());
        schedule.setFrequencyDays(request.frequencyDays());
        schedule.setIsActive(request.isActive() == null ? true : request.isActive());
        schedule.setDefaultAssigneeId(request.defaultAssigneeId());
        schedule.setNote(request.note());
        return toScheduleResponse(scheduleRepository.save(schedule));
    }

    @Transactional
    public void deleteSchedule(Long id) {
        var schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.STOCK_CHECK_SCHEDULE_NOT_FOUND));
        scheduleRepository.delete(schedule);
    }

    private void validateSchedule(StockCheckScheduleRequest request) {
        if (request.zoneCode() == null || request.zoneCode().isBlank()) {
            throw new InvalidRequestException(ErrorCode.STOCK_CHECK_SCHEDULE_ZONE_REQUIRED);
        }
        if (request.frequencyDays() == null || request.frequencyDays() < 1) {
            throw new InvalidRequestException(ErrorCode.STOCK_CHECK_SCHEDULE_FREQUENCY_INVALID);
        }
        var locations = locationsInRange(request.zoneCode(), request.binFrom(), request.binTo());
        if (locations.isEmpty()) {
            throw new InvalidRequestException(ErrorCode.STOCK_CHECK_SCHEDULE_ZONE_NOT_FOUND.format(request.zoneCode()));
        }
    }

    private StockCheckScheduleResponse toScheduleResponse(StockCheckSchedule s) {
        String assigneeName = s.getDefaultAssigneeId() == null ? null
                : userRepository.findById(s.getDefaultAssigneeId()).map(User::getFullName).orElse(null);
        return new StockCheckScheduleResponse(s.getId(), s.getZoneCode(), s.getBinFrom(), s.getBinTo(),
                s.getFrequencyDays(), s.getIsActive(), s.getDefaultAssigneeId(), assigneeName, s.getNote());
    }

    private Map<Long, String> fetchUserNames(List<StockCheck> checks) {
        var userIds = checks.stream().flatMap(sc -> {
            var ids = new ArrayList<Long>();
            ids.add(sc.getCreatedBy());
            if (sc.getApprovedBy() != null) ids.add(sc.getApprovedBy());
            if (sc.getCheckedBy() != null) ids.add(sc.getCheckedBy());
            if (sc.getEnteredBy() != null) ids.add(sc.getEnteredBy());
            return ids.stream();
        }).distinct().toList();
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
    }

    public StockCheckResponse toResponse(StockCheck sc, Map<Long, String> userMap) {
        var items = stockCheckItemRepository.findByStockCheckId(sc.getId());
        var units = productUnitRepository.findAllById(
                items.stream().map(StockCheckItem::getProductUnitId).toList()).stream()
                .collect(Collectors.toMap(ProductUnit::getId, u -> u));
        var productIds = units.values().stream().map(ProductUnit::getProductId).toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        var createdByName = userMap.get(sc.getCreatedBy());
        var approvedByName = sc.getApprovedBy() != null ? userMap.get(sc.getApprovedBy()) : null;
        var checkedByName = sc.getCheckedBy() != null ? userMap.get(sc.getCheckedBy()) : null;
        var enteredByName = sc.getEnteredBy() != null ? userMap.get(sc.getEnteredBy()) : null;
        return StockCheckMappingHelper.map(sc, createdByName, approvedByName, checkedByName, enteredByName,
                items, units, products, boxCodesByUnit(units), 0, resolveScopeName(sc));
    }

    public StockCheckResponse toResponse(StockCheck sc) {
        var items = stockCheckItemRepository.findByStockCheckId(sc.getId());
        var units = productUnitRepository.findAllById(
                items.stream().map(StockCheckItem::getProductUnitId).toList()).stream()
                .collect(Collectors.toMap(ProductUnit::getId, u -> u));
        var productIds = units.values().stream().map(ProductUnit::getProductId).toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        var createdByName = userRepository.findById(sc.getCreatedBy())
                .map(User::getFullName).orElse(null);
        var approvedByName = sc.getApprovedBy() != null
                ? userRepository.findById(sc.getApprovedBy()).map(User::getFullName).orElse(null)
                : null;
        var checkedByName = sc.getCheckedBy() != null
                ? userRepository.findById(sc.getCheckedBy()).map(User::getFullName).orElse(null)
                : null;
        var enteredByName = sc.getEnteredBy() != null
                ? userRepository.findById(sc.getEnteredBy()).map(User::getFullName).orElse(null)
                : null;
        return StockCheckMappingHelper.map(sc, createdByName, approvedByName, checkedByName, enteredByName,
                items, units, products, boxCodesByUnit(units), 0, resolveScopeName(sc));
    }

    private String resolveScopeName(StockCheck sc) {
        if (sc.getScopeId() == null) return null;
        return switch (sc.getScopeType()) {
            case "ZONE" -> locationRepository.findById(sc.getScopeId())
                    .map(Location::getZoneCode).orElse(null);
            case "BOX" -> boxRepository.findById(sc.getScopeId())
                    .map(Box::getBoxCode).orElse(null);
            default -> null;
        };
    }

    private Map<Long, String> boxCodesByUnit(Map<Long, ProductUnit> units) {
        var boxIds = units.values().stream().map(ProductUnit::getBoxId)
                .filter(Objects::nonNull).distinct().toList();
        if (boxIds.isEmpty()) return Map.of();
        return boxRepository.findAllById(boxIds).stream()
                .collect(Collectors.toMap(Box::getId, Box::getBoxCode));
    }

    private String generateCheckCode() {
        return ReceiptCodeGenerator.generate("SC-", stockCheckRepository::existsByCheckCode);
    }
}