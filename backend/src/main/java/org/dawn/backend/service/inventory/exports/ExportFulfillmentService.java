package org.dawn.backend.service.inventory.exports;
import org.dawn.backend.constant.shared.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.shared.statemachine.StateMachine;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.constant.enums.catalog.TrackingType;
import org.dawn.backend.constant.enums.inventory.exports.ExportReceiptStatus;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.constant.enums.inventory.box.BoxStatus;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.controller.inventory.request.FulfillExportRequest;
import org.dawn.backend.controller.inventory.response.ExportReceiptResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.Box;
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
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.box.BoxRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemUnitRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptStatusHistoryRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckItemRepository;
import org.dawn.backend.config.security.SecurityPolicy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExportFulfillmentService {

    private final ExportReceiptRepository exportReceiptRepository;
    private final ExportReceiptItemRepository exportReceiptItemRepository;
    private final ExportReceiptItemUnitRepository exportReceiptItemUnitRepository;
    private final ProductUnitRepository productUnitRepository;
    private final ProductUnitStatusLogRepository statusLogRepository;
    private final StockCheckItemRepository stockCheckItemRepository;
    private final BoxRepository boxRepository;
    private final LocationRepository locationRepository;
    private final ProductRepository productRepository;
    private final ExportReceiptStatusHistoryRepository statusHistoryRepository;
    private final StateMachine<ExportReceiptStatus> exportReceiptStateMachine;
    private final SecurityPolicy securityPolicy;
    private final ExportReceiptService exportReceiptService;

    private static final List<String> BULK_UNITS = List.of(
            org.dawn.backend.constant.enums.catalog.UnitOfMeasure.METER.name(),
            org.dawn.backend.constant.enums.catalog.UnitOfMeasure.KG.name(),
            org.dawn.backend.constant.enums.catalog.UnitOfMeasure.TUBE.name());

    @Transactional
    @AuditLog(action = LogConstant.Action.FULFILL_EXPORT, entity = LogConstant.Entity.EXPORT_RECEIPT)
    public ExportReceiptResponse fulfill(Long id, FulfillExportRequest request) {
        Long userId = securityPolicy.requireAuthenticated();
        ExportReceipt receipt = exportReceiptRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.EXPORT_RECEIPT_NOT_FOUND));

        exportReceiptStateMachine.validate(receipt.getStatus(), ExportReceiptStatus.COMPLETED);

        if (request.note() == null || request.note().isBlank()) {
            throw new InvalidRequestException(ErrorCode.EXPORT_NOTE_REQUIRED);
        }
        if (request.evidenceImages() == null || request.evidenceImages().isEmpty()) {
            throw new InvalidRequestException(ErrorCode.EXPORT_EVIDENCE_REQUIRED);
        }

        ExportReceiptStatus oldStatus = receipt.getStatus();
        var receiptItems = exportReceiptItemRepository.findByReceiptId(receipt.getId());
        List<Long> requestedItemIds = request.items() == null
                ? List.of()
                : request.items().stream().map(FulfillExportRequest.FulfillItemRequest::itemId).sorted().toList();
        List<Long> receiptItemIds = receiptItems.stream().map(ExportReceiptItem::getId).sorted().toList();
        if (!requestedItemIds.equals(receiptItemIds)) {
            throw new InvalidRequestException(ErrorCode.EXPORT_FULFILL_ITEMS_MISMATCH);
        }
        var itemMap = receiptItems.stream().collect(Collectors.toMap(ExportReceiptItem::getId, i -> i));
        var productIds = receiptItems.stream().map(ExportReceiptItem::getProductId).toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        BigDecimal totalCogs = BigDecimal.ZERO;
        String reason = receipt.getReason();

        for (var fulfillItem : request.items()) {
            ExportReceiptItem item = itemMap.get(fulfillItem.itemId());
            if (item == null) {
                throw new InvalidRequestException(ErrorCode.EXPORT_ITEM_NOT_FOUND.format( fulfillItem.itemId()));
            }

            Product product = products.get(item.getProductId());
            String unit = product.getUnit();
            boolean isBulk = BULK_UNITS.contains(unit);

            if ("WARRANTY_REPLACEMENT".equals(reason) && isBulk) {
                throw new InvalidRequestException(ErrorCode.WARRANTY_BULK_NOT_ALLOWED);
            }

            if (isBulk) {
                BigDecimal actualQty = fulfillItem.actualQuantity();
                if (actualQty == null || actualQty.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new InvalidRequestException(ErrorCode.EXPORT_ACTUAL_QTY_REQUIRED_BULK);
                }
                if (actualQty.compareTo(item.getQuantity()) != 0) {
                    throw new InvalidRequestException(
                            ErrorCode.EXPORT_QUANTITY_MISMATCH.format( actualQty, item.getQuantity(), product.getName()));
                }

                var bulkUnits = productUnitRepository.findByProductIdAndStatusWithLock(item.getProductId());
                BigDecimal remaining = actualQty;
                for (ProductUnit pu : bulkUnits) {
                    if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;
                    BigDecimal take = pu.getRemainingQuantity().min(remaining);
                    exportReceiptItemUnitRepository.save(ExportReceiptItemUnit.builder()
                            .exportReceiptItemId(item.getId())
                            .productUnitId(pu.getId())
                            .quantity(take)
                            .sellPrice(item.getUnitPrice())
                            .build());
                    pu.setRemainingQuantity(pu.getRemainingQuantity().subtract(take));
                    remaining = remaining.subtract(take);
                }
                if (remaining.compareTo(BigDecimal.ZERO) > 0) {
                    var boxedUnits = productUnitRepository.findByProductIdAndStatusAndBoxIdIsNotNull(
                            item.getProductId(), ProductUnitStatus.IN_STOCK);
                    if (!boxedUnits.isEmpty()) {
                        var sealedBoxes = boxRepository.findAllById(
                                        boxedUnits.stream().map(ProductUnit::getBoxId).distinct().toList())
                                .stream().filter(b -> BoxStatus.SEALED == b.getStatus()).toList();
                        if (!sealedBoxes.isEmpty()) {
                            var sealedBoxIds = sealedBoxes.stream().map(Box::getId).toList();
                            var locationMap = locationRepository.findAllById(
                                            sealedBoxes.stream().map(Box::getLocationId).distinct().toList())
                                    .stream().collect(Collectors.toMap(Location::getId, Location::getFullCode));
                            var perBox = boxedUnits.stream()
                                    .filter(u -> sealedBoxIds.contains(u.getBoxId()))
                                    .collect(Collectors.groupingBy(ProductUnit::getBoxId,
                                            Collectors.reducing(BigDecimal.ZERO, ProductUnit::getRemainingQuantity, BigDecimal::add)));
                            BigDecimal totalInBoxes = perBox.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
                            String summary = sealedBoxes.stream()
                                    .map(b -> b.getBoxCode() + " tại " + locationMap.get(b.getLocationId())
                                            + " (" + perBox.get(b.getId()) + ")")
                                    .collect(Collectors.joining(", "));
                            throw new InvalidRequestException(ErrorCode.EXPORT_NOT_ENOUGH_LOOSE.format( totalInBoxes, summary));
                        }
                    }
                    throw new InvalidRequestException(ErrorCode.INSUFFICIENT_STOCK.format(
                            product.getName(), actualQty.subtract(remaining), actualQty));
                }
            } else {
                TrackingType trackingType = TrackingType.valueOf(product.getTrackingType());
                if (trackingType == TrackingType.SERIALIZED) {
                    List<String> serials = fulfillItem.serialNumbers();
                    if (serials == null || serials.isEmpty()) {
                        throw new InvalidRequestException(ErrorCode.EXPORT_SERIALS_REQUIRED);
                    }
                    if (BigDecimal.valueOf(serials.size()).compareTo(item.getQuantity()) != 0) {
                        throw new InvalidRequestException(
                                ErrorCode.EXPORT_QUANTITY_MISMATCH.format( serials.size(), item.getQuantity(), product.getName()));
                    }

                    for (String sn : serials) {
                        ProductUnit pu = productUnitRepository.findBySerialNumber(sn)
                                .orElseThrow(() -> new InvalidRequestException(
                                        ErrorCode.PRODUCT_UNIT_NOT_FOUND.format( sn)));
                        pu = productUnitRepository.findByIdForUpdate(pu.getId())
                                .orElseThrow(() -> new InvalidRequestException(
                                        ErrorCode.PRODUCT_UNIT_NOT_FOUND.format( sn)));

                        if (!pu.getProductId().equals(item.getProductId())) {
                            throw new InvalidRequestException(ErrorCode.EXPORT_SERIAL_WRONG_PRODUCT.format( sn, product.getName()));
                        }
                        boolean qcHoldAllowed = "WARRANTY_REPLACEMENT".equals(reason)
                                && ProductUnitStatus.WAITING_RMA_EXPORT == pu.getStatus();
                        boolean qcZoneDisposeAllowed = "DISPOSE".equals(reason)
                                && (ProductUnitStatus.PENDING_QC == pu.getStatus()
                                        || ProductUnitStatus.RETURN_QC_HOLD == pu.getStatus());
                        if (ProductUnitStatus.IN_STOCK != pu.getStatus() && !qcHoldAllowed && !qcZoneDisposeAllowed) {
                            throw new InvalidRequestException(ErrorCode.EXPORT_SERIAL_NOT_AVAILABLE.format( sn, pu.getStatus()));
                        }
                        if (stockCheckItemRepository.existsByProductUnitIdInActiveCheck(pu.getId())) {
                            throw new InvalidRequestException(ErrorCode.EXPORT_SERIAL_IN_STOCK_CHECK.format( sn));
                        }
                        if (pu.getBoxId() != null && boxRepository.findById(pu.getBoxId())
                                .map(b -> BoxStatus.SEALED == b.getStatus()).orElse(false)) {
                            throw new InvalidRequestException(ErrorCode.EXPORT_SERIAL_IN_BOX.format( sn));
                        }

                        ProductUnitStatus oldUnitStatus = pu.getStatus();
                        ProductUnitStatus targetStatus = switch (reason) {
                            case "DISPOSE" -> ProductUnitStatus.DISPOSED;
                            case "RETURN_SUPPLIER" -> ProductUnitStatus.RETURNED_TO_SUPPLIER;
                            case "WARRANTY_REPLACEMENT" -> ProductUnitStatus.SENT_TO_MANUFACTURER;
                            default -> ProductUnitStatus.EXPORTED;
                        };

                        pu.setStatus(targetStatus);
                        if (ProductUnitStatus.SENT_TO_MANUFACTURER == targetStatus
                                || ProductUnitStatus.RETURNED_TO_SUPPLIER == targetStatus
                                || ProductUnitStatus.DISPOSED == targetStatus) {
                            pu.setLocationId(null);
                        }
                        if ("SALE".equals(reason)) {
                            Instant now = Instant.now();
                            pu.setWarrantyStartDate(now);
                            if (pu.getWarrantyMonths() != null) {
                                pu.setWarrantyExpiresAt(now.plusSeconds(pu.getWarrantyMonths() * 30L * 24L * 60L * 60L));
                            }
                        }
                        productUnitRepository.save(pu);

                        exportReceiptItemUnitRepository.save(ExportReceiptItemUnit.builder()
                                .exportReceiptItemId(item.getId())
                                .productUnitId(pu.getId())
                                .quantity(BigDecimal.ONE)
                                .sellPrice(item.getUnitPrice())
                                .build());

                        statusLogRepository.save(ProductUnitStatusLog.builder()
                                .productUnitId(pu.getId())
                                .fromStatus(oldUnitStatus.name())
                                .toStatus(pu.getStatus().name())
                                .sourceType(SourceType.EXPORT_RECEIPT.name())
                                .sourceId(receipt.getId())
                                .changedBy(userId)
                                .build());

                        if ("SALE".equals(reason) || "INTERNAL".equals(reason)) {
                            if (pu.getCostPrice() != null) {
                                totalCogs = totalCogs.add(pu.getCostPrice());
                            }
                        }
                    }
                }
            }
        }

        receipt.setStatus(ExportReceiptStatus.COMPLETED);
        receipt.setFulfilledBy(userId);
        receipt.setFulfilledAt(Instant.now());
        receipt.setNote(request.note());
        receipt.setEvidenceImages(String.join(",", request.evidenceImages()));
        receipt.setTotalCogs(totalCogs);
        receipt = exportReceiptRepository.save(receipt);

        statusHistoryRepository.save(ExportReceiptStatusHistory.builder()
                .receiptId(receipt.getId())
                .fromStatus(oldStatus.name())
                .toStatus(ExportReceiptStatus.COMPLETED.name())
                .changedBy(userId)
                .build());

        return exportReceiptService.toResponse(receipt);
    }
}
