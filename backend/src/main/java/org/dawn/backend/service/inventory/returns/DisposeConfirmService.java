package org.dawn.backend.service.inventory.returns;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.constant.enums.inventory.exports.ExportReceiptStatus;
import org.dawn.backend.constant.shared.ErrorCode;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.controller.inventory.response.DisposeConfirmResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.catalog.Supplier;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ExportReceiptItem;
import org.dawn.backend.entity.inventory.ExportReceiptItemUnit;
import org.dawn.backend.entity.inventory.ExportReceiptStatusHistory;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ProductUnitStatusLog;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.catalog.SupplierRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemUnitRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptStatusHistoryRepository;
import org.dawn.backend.shared.util.ReceiptCodeGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Confirms actual disposal / permanent return of units waiting on QC shelf 4.
 * Allowed (status, action) pairs:
 *   PENDING_DISPOSAL    -> DISPOSED | REJECTED_RETURN
 *   RMA_UNREPAIRABLE    -> DISPOSED | RETURNED_TO_SUPPLIER
 *
 * RETURNED_TO_SUPPLIER also creates a COMPLETED export receipt (reason RETURN_SUPPLIER)
 * as the shipping document; units can later be received back via warranty import.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DisposeConfirmService {

    private static final Map<ProductUnitStatus, Set<ProductUnitStatus>> ALLOWED_ACTIONS = new EnumMap<>(ProductUnitStatus.class);

    static {
        ALLOWED_ACTIONS.put(ProductUnitStatus.PENDING_DISPOSAL, Set.of(
                ProductUnitStatus.DISPOSED, ProductUnitStatus.REJECTED_RETURN));
        ALLOWED_ACTIONS.put(ProductUnitStatus.REJECTED_RETURN, Set.of(
                ProductUnitStatus.RETURN_QC_HOLD, ProductUnitStatus.PENDING_DISPOSAL));
        ALLOWED_ACTIONS.put(ProductUnitStatus.RMA_UNREPAIRABLE, Set.of(
                ProductUnitStatus.DISPOSED, ProductUnitStatus.RETURNED_TO_SUPPLIER));
        ALLOWED_ACTIONS.put(ProductUnitStatus.WAITING_RMA_EXPORT, Set.of(
                ProductUnitStatus.SENT_TO_MANUFACTURER));
    }

    private final ProductUnitRepository productUnitRepository;
    private final ProductUnitStatusLogRepository statusLogRepository;
    private final ProductRepository productRepository;
    private final org.dawn.backend.repository.inventory.LocationRepository locationRepository;
    private final ExportReceiptRepository exportReceiptRepository;
    private final ExportReceiptItemRepository exportReceiptItemRepository;
    private final ExportReceiptItemUnitRepository exportReceiptItemUnitRepository;
    private final ExportReceiptStatusHistoryRepository exportReceiptStatusHistoryRepository;
    private final SupplierRepository supplierRepository;
    private final SecurityPolicy securityPolicy;

    @Transactional
    @AuditLog(action = LogConstant.Action.DISPOSE_CONFIRM, entity = LogConstant.Entity.PRODUCT_UNIT)
    public DisposeConfirmResponse confirm(List<Long> unitIds, String action, Long supplierId, String note) {
        Long userId = securityPolicy.requireAuthenticated();
        if (unitIds == null || unitIds.isEmpty()) {
            throw new InvalidRequestException(ErrorCode.DISPOSE_CONFIRM_UNITS_REQUIRED);
        }
        if (supplierId != null && !supplierRepository.existsById(supplierId)) {
            throw new ResourceNotFoundException(ErrorCode.SUPPLIER_NOT_FOUND);
        }
        ProductUnitStatus targetStatus;
        try {
            targetStatus = ProductUnitStatus.valueOf(action);
        } catch (IllegalArgumentException e) {
            throw new InvalidRequestException(
                    ErrorCode.DISPOSE_CONFIRM_UNIT_NOT_PENDING.format("?", action));
        }

        var units = productUnitRepository.findByIdsForUpdate(unitIds);
        for (var unit : units) {
            Set<ProductUnitStatus> allowed = ALLOWED_ACTIONS.getOrDefault(unit.getStatus(), Set.of());
            if (!allowed.contains(targetStatus)) {
                throw new InvalidRequestException(
                        ErrorCode.DISPOSE_CONFIRM_UNIT_NOT_PENDING.format(unit.getStatus(), action));
            }
            ProductUnitStatus oldStatus = unit.getStatus();
            unit.setStatus(targetStatus);
            unit.setLocationId(targetShelfLocation(targetStatus));
            productUnitRepository.save(unit);
            statusLogRepository.save(ProductUnitStatusLog.builder()
                    .productUnitId(unit.getId())
                    .fromStatus(oldStatus.name())
                    .toStatus(targetStatus.name())
                    .sourceType(SourceType.QC_PROCESSING.name())
                    .sourceId(null)
                    .note(note != null && !note.isBlank() ? note.trim() : null)
                    .changedBy(userId)
                    .build());
        }

        if (targetStatus == ProductUnitStatus.RETURNED_TO_SUPPLIER) {
            ExportReceipt receipt = createAutoExport(units, userId, "RETURN_SUPPLIER", supplierId);
            return new DisposeConfirmResponse(receipt.getReceiptCode(), receipt.getId());
        } else if (targetStatus == ProductUnitStatus.SENT_TO_MANUFACTURER) {
            ExportReceipt receipt = createAutoExport(units, userId, "WARRANTY_REPLACEMENT", supplierId);
            return new DisposeConfirmResponse(receipt.getReceiptCode(), receipt.getId());
        }
        return new DisposeConfirmResponse(null, null);
    }

    /** QC-processing zone shelf for a unit that stays in the zone; null when it leaves the warehouse. */
    private Long targetShelfLocation(ProductUnitStatus status) {
        if (status == ProductUnitStatus.RETURN_QC_HOLD) {
            return locationRepository.findByFullCode(
                    org.dawn.backend.constant.shared.QcProcessingLocations.QC_SHELF_1_NEW_RETURNS)
                    .map(Location::getId).orElse(null);
        }
        if (status == ProductUnitStatus.PENDING_DISPOSAL) {
            return locationRepository.findByFullCode(
                    org.dawn.backend.constant.shared.QcProcessingLocations.QC_SHELF_4_DEAD)
                    .map(Location::getId).orElse(null);
        }
        return null;
    }

    private ExportReceipt createAutoExport(List<ProductUnit> units, Long userId, String reason, Long supplierId) {
        var unitsByProduct = units.stream().collect(Collectors.groupingBy(ProductUnit::getProductId));
        var products = productRepository.findAllById(unitsByProduct.keySet()).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        Long effectiveSupplierId = supplierId != null
                ? supplierId
                : products.values().stream()
                        .filter(p -> p.getSuppliers() != null && !p.getSuppliers().isEmpty())
                        .flatMap(p -> p.getSuppliers().stream())
                        .map(Supplier::getId)
                        .min(Comparator.naturalOrder())
                        .orElse(null);

        String receiptCode = ReceiptCodeGenerator.generate("EXP-", exportReceiptRepository::existsByReceiptCode);

        ExportReceipt receipt = ExportReceipt.builder()
                .receiptCode(receiptCode)
                .reason(reason)
                .supplierId(effectiveSupplierId)
                .totalAmount(BigDecimal.ZERO)
                .status(ExportReceiptStatus.COMPLETED)
                .createdBy(userId)
                .fulfilledBy(userId)
                .fulfilledAt(Instant.now())
                .build();
        receipt = exportReceiptRepository.save(receipt);
        Long receiptId = receipt.getId();

        for (var entry : unitsByProduct.entrySet()) {
            Product product = products.get(entry.getKey());
            BigDecimal quantity = entry.getValue().stream()
                    .map(ProductUnit::getRemainingQuantity)
                    .filter(java.util.Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (quantity.compareTo(BigDecimal.ZERO) <= 0) {
                quantity = BigDecimal.valueOf(entry.getValue().size());
            }
            ExportReceiptItem item = exportReceiptItemRepository.save(ExportReceiptItem.builder()
                    .receiptId(receiptId)
                    .productId(product != null ? product.getId() : entry.getKey())
                    .quantity(quantity)
                    .build());
            for (var unit : entry.getValue()) {
                exportReceiptItemUnitRepository.save(ExportReceiptItemUnit.builder()
                        .exportReceiptItemId(item.getId())
                        .productUnitId(unit.getId())
                        .quantity(BigDecimal.ONE)
                        .build());
            }
        }

        exportReceiptStatusHistoryRepository.save(ExportReceiptStatusHistory.builder()
                .receiptId(receiptId)
                .fromStatus("NEW")
                .toStatus(ExportReceiptStatus.COMPLETED.name())
                .changedBy(userId)
                .build());

        return receipt;
    }
}
