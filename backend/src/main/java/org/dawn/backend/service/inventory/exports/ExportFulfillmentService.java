package org.dawn.backend.service.inventory.exports;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.shared.statemachine.StateMachine;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.constant.enums.catalog.TrackingType;
import org.dawn.backend.constant.enums.inventory.exports.ExportReceiptStatus;
import org.dawn.backend.constant.enums.inventory.exports.ExportReason;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.request.FulfillExportRequest;
import org.dawn.backend.controller.inventory.response.ExportReceiptResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ExportReceiptItem;
import org.dawn.backend.entity.inventory.ExportReceiptItemUnit;
import org.dawn.backend.entity.inventory.ExportReceiptStatusHistory;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ProductUnitStatusLog;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
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
    private final ProductRepository productRepository;
    private final ExportReceiptStatusHistoryRepository statusHistoryRepository;
    private final StateMachine<ExportReceiptStatus> exportReceiptStateMachine;
    private final SecurityPolicy securityPolicy;
    private final ExportReceiptService exportReceiptService;

    private static final List<String> BULK_UNITS = List.of(
            org.dawn.backend.constant.enums.catalog.UnitOfMeasure.METER.name(),
            org.dawn.backend.constant.enums.catalog.UnitOfMeasure.KG.name());

    @Transactional
    @AuditLog(action = LogConstant.Action.FULFILL_EXPORT, entity = LogConstant.Entity.EXPORT_RECEIPT)
    public ExportReceiptResponse fulfill(Long id, FulfillExportRequest request) {
        Long userId = securityPolicy.requireAuthenticated();
        ExportReceipt receipt = exportReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.EXPORT_RECEIPT_NOT_FOUND));

        exportReceiptStateMachine.validate(receipt.getStatus(), ExportReceiptStatus.COMPLETED);

        ExportReceiptStatus oldStatus = receipt.getStatus();
        var receiptItems = exportReceiptItemRepository.findByReceiptId(receipt.getId());
        var itemMap = receiptItems.stream().collect(Collectors.toMap(ExportReceiptItem::getId, i -> i));
        var productIds = receiptItems.stream().map(ExportReceiptItem::getProductId).toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        BigDecimal totalCogs = BigDecimal.ZERO;
        String reason = receipt.getReason();
        boolean isSale = ExportReason.SALE.name().equals(reason);
        boolean isReturnSupplier = ExportReason.RETURN_SUPPLIER.name().equals(reason);
        boolean isDispose = ExportReason.DISPOSE.name().equals(reason);

        for (var fulfillItem : request.items()) {
            ExportReceiptItem item = itemMap.get(fulfillItem.itemId());
            if (item == null) {
                throw new InvalidRequestException(Message.format(Message.Inventory.EXPORT_ITEM_NOT_FOUND, fulfillItem.itemId()));
            }

            Product product = products.get(item.getProductId());
            String unit = product.getUnit();
            boolean isBulk = BULK_UNITS.contains(unit);

            if (isBulk) {
                BigDecimal actualQty = fulfillItem.actualQuantity();
                if (actualQty == null || actualQty.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new InvalidRequestException(Message.Inventory.EXPORT_ACTUAL_QTY_REQUIRED_BULK);
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
            } else {
                String trackingType = product.getTrackingType();
                if (TrackingType.SERIALIZED.name().equals(trackingType)) {
                    List<String> serials = fulfillItem.serialNumbers();
                    if (serials == null || serials.isEmpty()) {
                        throw new InvalidRequestException(Message.Inventory.EXPORT_SERIALS_REQUIRED);
                    }

                    for (String sn : serials) {
                        ProductUnit pu = productUnitRepository.findBySerialNumber(sn)
                                .orElseThrow(() -> new InvalidRequestException(
                                        Message.format(Message.Inventory.PRODUCT_UNIT_NOT_FOUND, sn)));

                        if (!pu.getProductId().equals(item.getProductId())) {
                            throw new InvalidRequestException(Message.format(Message.Inventory.EXPORT_SERIAL_WRONG_PRODUCT, sn, product.getName()));
                        }
                        if (ProductUnitStatus.IN_STOCK != pu.getStatus()) {
                            throw new InvalidRequestException(Message.format(Message.Inventory.EXPORT_SERIAL_NOT_AVAILABLE, sn, pu.getStatus()));
                        }
                        if (stockCheckItemRepository.existsByProductUnitIdInActiveCheck(pu.getId())) {
                            throw new InvalidRequestException(Message.format(Message.Inventory.EXPORT_SERIAL_IN_STOCK_CHECK, sn));
                        }

                        ProductUnitStatus oldUnitStatus = pu.getStatus();
                        ProductUnitStatus targetStatus;
                        if (isDispose) {
                            targetStatus = ProductUnitStatus.DISPOSED;
                        } else if (isReturnSupplier) {
                            targetStatus = ProductUnitStatus.RETURNED_TO_SUPPLIER;
                        } else {
                            targetStatus = ProductUnitStatus.EXPORTED;
                        }

                        pu.setStatus(targetStatus);
                        if (isSale) {
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

                        if (isSale || ExportReason.INTERNAL.name().equals(reason)) {
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

    BigDecimal getInStockQuantity(Product product) {
        String unit = product.getUnit();
        boolean isBulk = BULK_UNITS.contains(unit);
        if (isBulk) {
            var units = productUnitRepository.findByProductIdAndStatus(product.getId(), ProductUnitStatus.IN_STOCK);
            return units.stream().map(ProductUnit::getRemainingQuantity)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
        return BigDecimal.valueOf(productUnitRepository.countByProductIdAndStatus(
                product.getId(), ProductUnitStatus.IN_STOCK));
    }
}
