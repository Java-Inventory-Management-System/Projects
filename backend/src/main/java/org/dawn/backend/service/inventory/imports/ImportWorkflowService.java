package org.dawn.backend.service.inventory.imports;
import org.dawn.backend.constant.shared.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.shared.statemachine.StateMachine;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.PurchaseOrderStatus;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.constant.enums.inventory.imports.ImportReceiptStatus;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.controller.inventory.response.ImportReceiptResponse;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.entity.inventory.ImportReceiptItem;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ProductUnitStatusLog;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptItemRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptRepository;
import org.dawn.backend.repository.inventory.PurchaseOrderItemRepository;
import org.dawn.backend.repository.inventory.PurchaseOrderRepository;
import org.dawn.backend.config.security.SecurityPolicy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImportWorkflowService {

    private final ImportReceiptRepository importReceiptRepository;
    private final ImportReceiptItemRepository importReceiptItemRepository;
    private final ProductUnitRepository productUnitRepository;
    private final ProductUnitStatusLogRepository statusLogRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository;
    private final StateMachine<ImportReceiptStatus> importReceiptStateMachine;
    private final SecurityPolicy securityPolicy;
    private final ImportReceiptService importReceiptService;

    @Transactional
    @AuditLog(action = LogConstant.Action.APPROVE_IMPORT, entity = LogConstant.Entity.IMPORT_RECEIPT)
    public ImportReceiptResponse approve(Long id) {
        Long userId = securityPolicy.requireAuthenticated();
        ImportReceipt receipt = importReceiptRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.IMPORT_RECEIPT_NOT_FOUND));

        securityPolicy.requireNotCreator(receipt.getCreatedBy());
        importReceiptStateMachine.validate(receipt.getStatus(), ImportReceiptStatus.COMPLETED);

        receipt.setStatus(ImportReceiptStatus.COMPLETED);
        receipt.setApprovedBy(userId);
        receipt = importReceiptRepository.save(receipt);

        if (receipt.getPurchaseOrderId() != null) {
            updatePOProgress(receipt.getPurchaseOrderId());
        }

        return importReceiptService.toResponse(receipt);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CANCEL_IMPORT, entity = LogConstant.Entity.IMPORT_RECEIPT)
    public ImportReceiptResponse cancel(Long id) {
        ImportReceipt receipt = importReceiptRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.IMPORT_RECEIPT_NOT_FOUND));

        importReceiptStateMachine.validate(receipt.getStatus(), ImportReceiptStatus.CANCELLED);

        var items = importReceiptItemRepository.findByReceiptId(id);
        for (var item : items) {
            var units = productUnitRepository.findByImportReceiptItemId(item.getId());
            for (var unit : units) {
                if (ProductUnitStatus.IN_STOCK != unit.getStatus()) {
                    throw new InvalidRequestException(ErrorCode.IMPORT_CANNOT_CANCEL_UNITS_EXPORTED);
                }
                boolean isBulk = unit.getInitialQuantity() != null;
                if (isBulk && unit.getRemainingQuantity().compareTo(unit.getInitialQuantity()) != 0) {
                    throw new InvalidRequestException(ErrorCode.IMPORT_CANNOT_CANCEL_UNITS_EXPORTED);
                }
            }
        }

        Long userId = securityPolicy.requireAuthenticated();
        for (var item : items) {
            var units = productUnitRepository.findByImportReceiptItemId(item.getId());
            for (var unit : units) {
                ProductUnitStatus oldStatus = unit.getStatus();
                unit.setStatus(ProductUnitStatus.REMOVED);
                productUnitRepository.save(unit);
                statusLogRepository.save(ProductUnitStatusLog.builder()
                        .productUnitId(unit.getId())
                        .fromStatus(oldStatus.name())
                        .toStatus(ProductUnitStatus.REMOVED.name())
                        .sourceType(SourceType.IMPORT_RECEIPT.name())
                        .sourceId(id)
                        .changedBy(userId)
                        .build());
            }
        }

        receipt.setStatus(ImportReceiptStatus.CANCELLED);
        receipt = importReceiptRepository.save(receipt);
        return importReceiptService.toResponse(receipt);
    }

    private void updatePOProgress(Long poId) {
        var po = purchaseOrderRepository.findByIdForUpdate(poId).orElse(null);
        if (po == null) return;

        var items = purchaseOrderItemRepository.findByPoId(poId);
        var completedReceipts = importReceiptRepository.findByPurchaseOrderId(poId).stream()
                .filter(r -> ImportReceiptStatus.COMPLETED == r.getStatus())
                .toList();
        if (completedReceipts.isEmpty()) return;

        var receiptItemIds = completedReceipts.stream()
                .flatMap(r -> importReceiptItemRepository.findByReceiptId(r.getId()).stream())
                .toList();

        for (var poItem : items) {
            BigDecimal received = receiptItemIds.stream()
                    .filter(ri -> ri.getProductId().equals(poItem.getProductId()))
                    .map(ImportReceiptItem::getQuantity)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            poItem.setReceivedQuantity(received);
        }
        purchaseOrderItemRepository.saveAll(items);

        boolean anyReceived = items.stream()
                .anyMatch(i -> i.getReceivedQuantity().compareTo(BigDecimal.ZERO) > 0);
        boolean allFullyReceived = items.stream()
                .allMatch(i -> i.getReceivedQuantity().compareTo(i.getQuantity()) >= 0);

        if (allFullyReceived) {
            po.setStatus(PurchaseOrderStatus.COMPLETED);
        } else if (anyReceived) {
            po.setStatus(PurchaseOrderStatus.PARTIAL);
        }
        purchaseOrderRepository.save(po);
    }
}
