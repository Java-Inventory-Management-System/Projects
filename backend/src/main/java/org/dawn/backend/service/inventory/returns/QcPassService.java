package org.dawn.backend.service.inventory.returns;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.constant.shared.ErrorCode;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.controller.inventory.response.QcUnitResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ExportReceiptItem;
import org.dawn.backend.entity.inventory.ExportReceiptItemUnit;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ProductUnitStatusLog;
import org.dawn.backend.entity.inventory.ReturnReceipt;
import org.dawn.backend.entity.inventory.ReturnReceiptItem;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.returns.ReturnReceiptItemRepository;
import org.dawn.backend.repository.inventory.returns.ReturnReceiptRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemUnitRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Single path for a unit to leave the QC processing zone and become sellable.
 * Only units in RETURN_QC_HOLD (shelf 1) or RMA_REPAIRED_RETURNED (shelf 3)
 * can be QC-passed; anything else is rejected.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QcPassService {

    private static final Set<ProductUnitStatus> PASSABLE_STATUSES = Set.of(
            ProductUnitStatus.RETURN_QC_HOLD, ProductUnitStatus.RMA_REPAIRED_RETURNED);

    private final ProductUnitRepository productUnitRepository;
    private final ProductUnitStatusLogRepository statusLogRepository;
    private final ProductRepository productRepository;
    private final LocationRepository locationRepository;
    private final ReturnReceiptItemRepository returnReceiptItemRepository;
    private final ReturnReceiptRepository returnReceiptRepository;
    private final ExportReceiptItemUnitRepository exportReceiptItemUnitRepository;
    private final ExportReceiptItemRepository exportReceiptItemRepository;
    private final ExportReceiptRepository exportReceiptRepository;
    private final SecurityPolicy securityPolicy;
    private final org.dawn.backend.repository.auth.UserRepository userRepository;
    private final org.dawn.backend.service.inventory.box.BoxCapacity boxCapacity;

    @Transactional
    @AuditLog(action = LogConstant.Action.QC_PASS, entity = LogConstant.Entity.PRODUCT_UNIT)
    public List<QcUnitResponse> confirm(List<Long> unitIds) {
        Long userId = securityPolicy.requireAuthenticated();
        if (unitIds == null || unitIds.isEmpty()) {
            throw new InvalidRequestException(ErrorCode.QC_PASS_UNITS_REQUIRED);
        }

        var units = productUnitRepository.findByIdsForUpdate(unitIds);
        var usage = boxCapacity.usageByLocation();
        var returnMap = returnReceiptItemRepository.findByProductUnitIdIn(unitIds).stream()
                .collect(Collectors.toMap(ReturnReceiptItem::getProductUnitId,
                        ReturnReceiptItem::getReturnReceiptId, (a, b) -> a));
        for (var unit : units) {
            if (!PASSABLE_STATUSES.contains(unit.getStatus())) {
                throw new InvalidRequestException(
                        ErrorCode.QC_PASS_UNIT_NOT_PASSABLE.format(unit.getStatus()));
            }
            ProductUnitStatus oldStatus = unit.getStatus();
            unit.setStatus(ProductUnitStatus.IN_STOCK);
            relocateOutOfQcZone(unit, usage);
            productUnitRepository.save(unit);
            statusLogRepository.save(ProductUnitStatusLog.builder()
                    .productUnitId(unit.getId())
                    .fromStatus(oldStatus.name())
                    .toStatus(ProductUnitStatus.IN_STOCK.name())
                    .sourceType(SourceType.QC_PROCESSING.name())
                    .sourceId(returnMap.get(unit.getId()))
                    .changedBy(userId)
                    .build());
        }
        return toResponses(units, null);
    }

    @Transactional(readOnly = true)
    public List<QcUnitResponse> listQcUnits(List<ProductUnitStatus> statuses) {
        var units = productUnitRepository.findByStatusInOrderById(statuses);
        if (units.isEmpty()) return List.of();
        return toResponses(units, null);
    }

    @Transactional(readOnly = true)
    public List<QcUnitResponse> listProcessedUnits() {
        var logs = statusLogRepository.findBySourceTypeOrderByCreatedAtDesc(SourceType.QC_PROCESSING.name());
        Map<Long, ProductUnitStatusLog> latest = new HashMap<>();
        for (var log : logs) {
            latest.putIfAbsent(log.getProductUnitId(), log);
        }
        if (latest.isEmpty()) return List.of();
        var units = productUnitRepository.findAllById(latest.keySet());
        if (units.isEmpty()) return List.of();
        return toResponses(units, latest);
    }

    /**
     * Builds QC unit responses. When qcLogs is provided (processed history), the
     * "processed" metadata comes from the QC log itself; otherwise the latest
     * status log per unit is used.
     */
    private List<QcUnitResponse> toResponses(List<ProductUnit> units, Map<Long, ProductUnitStatusLog> qcLogs) {
        var productIds = units.stream().map(ProductUnit::getProductId).distinct().toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        var locationIds = units.stream().map(ProductUnit::getLocationId)
                .filter(Objects::nonNull).distinct().toList();
        var locations = locationRepository.findAllById(locationIds).stream()
                .collect(Collectors.toMap(Location::getId, l -> l.getFullCode()));
        var unitIds = units.stream().map(ProductUnit::getId).toList();
        var evidence = returnReceiptItemRepository.findByProductUnitIdIn(unitIds).stream()
                .collect(Collectors.toMap(ReturnReceiptItem::getProductUnitId, i -> i, (a, b) -> a));
        var lastLog = new HashMap<Long, ProductUnitStatusLog>();
        List<ProductUnitStatusLog> recentLogs = unitIds.isEmpty() ? List.of()
                : statusLogRepository.findByProductUnitIdInOrderByCreatedAtDesc(unitIds);
        for (var log : recentLogs) {
            lastLog.putIfAbsent(log.getProductUnitId(), log);
        }
        var logByUnit = qcLogs != null ? qcLogs : lastLog;
        var userIds = logByUnit.values().stream().map(ProductUnitStatusLog::getChangedBy)
                .filter(Objects::nonNull).distinct().toList();
        var userNames = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(org.dawn.backend.entity.auth.User::getId,
                        org.dawn.backend.entity.auth.User::getFullName));

        var unitToItem = exportReceiptItemUnitRepository.findByProductUnitIdIn(unitIds).stream()
                .collect(Collectors.toMap(ExportReceiptItemUnit::getProductUnitId,
                        ExportReceiptItemUnit::getExportReceiptItemId, (a, b) -> b));
        var itemToReceipt = exportReceiptItemRepository.findAllById(unitToItem.values()).stream()
                .collect(Collectors.toMap(ExportReceiptItem::getId, ExportReceiptItem::getReceiptId, (a, b) -> a));
        var exportCodeMap = exportReceiptRepository.findAllById(itemToReceipt.values()).stream()
                .collect(Collectors.toMap(ExportReceipt::getId, ExportReceipt::getReceiptCode));
        var returnIds = evidence.values().stream().map(ReturnReceiptItem::getReturnReceiptId)
                .filter(Objects::nonNull).distinct().toList();
        var returnCodeMap = returnReceiptRepository.findAllById(returnIds).stream()
                .collect(Collectors.toMap(ReturnReceipt::getId, ReturnReceipt::getReceiptCode));

        return units.stream().map(u -> {
            var log = logByUnit.get(u.getId());
            var item = evidence.get(u.getId());
            return new QcUnitResponse(
                    u.getId(),
                    u.getSerialNumber(),
                    u.getProductId(),
                    products.get(u.getProductId()) != null ? products.get(u.getProductId()).getName() : null,
                    u.getStatus().name(),
                    u.getLocationId() != null ? locations.get(u.getLocationId()) : null,
                    u.getInitialQuantity(),
                    u.getRemainingQuantity(),
                    item != null ? item.getDescription() : null,
                    item != null ? item.getEvidenceImage() : null,
                    log != null ? log.getCreatedAt() : null,
                    log != null && log.getChangedBy() != null ? userNames.get(log.getChangedBy()) : null,
                    unitToItem.get(u.getId()) != null
                            ? exportCodeMap.get(itemToReceipt.get(unitToItem.get(u.getId())))
                            : null,
                    item != null && item.getReturnReceiptId() != null
                            ? returnCodeMap.get(item.getReturnReceiptId())
                            : null
            );
        }).sorted(Comparator.comparing(
                QcUnitResponse::processedAt,
                Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    /**
     * A unit passing QC must leave the QC processing zone; otherwise it stays
     * "IN_STOCK" on the QC shelf and blocks the zone forever.
     */
    private void relocateOutOfQcZone(ProductUnit unit, Map<Long, java.math.BigDecimal> usage) {
        if (unit.getLocationId() == null) return;
        Location current = locationRepository.findById(unit.getLocationId()).orElse(null);
        if (current == null || !"QC".equals(current.getZoneCode())) return;
        var candidates = locationRepository.findAllByOrderByZoneCodeAscShelfCodeAscBinCodeAsc().stream()
                .filter(l -> !"QC".equals(l.getZoneCode()))
                .filter(l -> Boolean.TRUE.equals(l.getIsActive()))
                .filter(l -> l.getMaxCapacity() == null
                        || usage.getOrDefault(l.getId(), java.math.BigDecimal.ZERO)
                                .compareTo(l.getMaxCapacity()) < 0)
                .toList();
        if (candidates.isEmpty()) {
            throw new InvalidRequestException(ErrorCode.QC_PASS_NO_SELLABLE_LOCATION);
        }
        unit.setLocationId(candidates.get(0).getId());
    }
}