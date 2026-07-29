package org.dawn.backend.service.inventory.stockcheck;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.shared.statemachine.StateMachine;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.constant.enums.inventory.adjustments.*;
import org.dawn.backend.constant.enums.inventory.stockcheck.DifferenceType;
import org.dawn.backend.constant.enums.inventory.stockcheck.StockCheckStatus;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.request.ApproveStockCheckRequest;
import org.dawn.backend.controller.inventory.response.StockCheckResponse;
import org.dawn.backend.entity.inventory.StockAdjustment;
import org.dawn.backend.entity.inventory.StockCheck;
import org.dawn.backend.entity.inventory.StockCheckItem;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.adjustments.StockAdjustmentRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckItemRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckRepository;
import org.dawn.backend.service.inventory.adjustments.AdjustmentUnitService;
import org.dawn.backend.shared.util.ReceiptCodeGenerator;
import org.dawn.backend.config.security.SecurityPolicy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockCheckAdjustmentService {

    private final StockCheckRepository stockCheckRepository;
    private final StockCheckItemRepository stockCheckItemRepository;
    private final StockAdjustmentRepository adjustmentRepository;
    private final AdjustmentUnitService adjustmentUnitService;
    private final StateMachine<StockCheckStatus> stockCheckStateMachine;
    private final SecurityPolicy securityPolicy;
    private final StockCheckService stockCheckService;

    @Transactional
    @AuditLog(action = LogConstant.Action.APPROVE_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse approve(Long id, ApproveStockCheckRequest request) {
        Long userId = securityPolicy.requireAuthenticated();
        var sc = stockCheckRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.STOCK_CHECK_NOT_FOUND));

        stockCheckStateMachine.validate(sc.getStatus(), StockCheckStatus.APPROVED);

        var items = stockCheckItemRepository.findByStockCheckId(id);

        boolean alreadyProcessed = adjustmentRepository.existsBySourceTypeAndSourceId(AdjustmentSourceType.STOCK_CHECK.name(), id);
        if (alreadyProcessed) {
            throw new InvalidRequestException(Message.Inventory.STOCK_CHECK_ADJUSTMENTS_EXIST);
        }

        for (var item : items) {
            String diff = item.getDifference();
            if (DifferenceType.MATCH.name().equals(diff) || item.getActualStatus() == null) continue;

            AdjustmentType adjType;
            if (DifferenceType.MISSING.name().equals(diff)) {
                adjType = AdjustmentType.LOST;
            } else if (ProductUnitStatus.DAMAGED_IN_STORAGE.name().equals(item.getActualStatus())) {
                adjType = AdjustmentType.DAMAGED;
            } else {
                adjType = AdjustmentType.FOUND;
            }

            StockAdjustment adj = StockAdjustment.builder()
                    .adjustCode(generateAdjustCode())
                    .type(adjType.name())
                    .productUnitId(item.getProductUnitId())
                    .quantity(1)
                    .reason("Auto-generated from stock check #" + sc.getCheckCode())
                    .status(AdjustmentStatus.APPROVED)
                    .sourceType(AdjustmentSourceType.STOCK_CHECK.name())
                    .sourceId(id)
                    .createdBy(userId)
                    .approvedBy(userId)
                    .build();
            adj = adjustmentRepository.save(adj);

            switch (adjType) {
                case DAMAGED:
                    adjustmentUnitService.applyDamaged(item.getProductUnitId(), SourceType.STOCK_ADJUSTMENT.name(), adj.getId(), userId);
                    break;
                case LOST:
                    adjustmentUnitService.applyLost(item.getProductUnitId(), SourceType.STOCK_ADJUSTMENT.name(), adj.getId(), userId);
                    break;
                case FOUND:
                    adjustmentUnitService.applyFoundRestore(item.getProductUnitId(), SourceType.STOCK_ADJUSTMENT.name(), adj.getId(), userId);
                    break;
            }
        }

        sc.setStatus(StockCheckStatus.APPROVED);
        sc.setApprovedBy(userId);
        sc.setApprovalNote(request != null ? request.approvalNote() : null);
        sc = stockCheckRepository.save(sc);
        return stockCheckService.toResponse(sc);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.REJECT_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse reject(Long id, ApproveStockCheckRequest request) {
        Long userId = securityPolicy.requireAuthenticated();
        var sc = stockCheckRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.STOCK_CHECK_NOT_FOUND));

        stockCheckStateMachine.validate(sc.getStatus(), StockCheckStatus.IN_PROGRESS);

        if (request == null || request.approvalNote() == null || request.approvalNote().isBlank()) {
            throw new InvalidRequestException(Message.Inventory.REJECTION_REASON_REQUIRED);
        }

        sc.setStatus(StockCheckStatus.IN_PROGRESS);
        sc.setApprovalNote(request.approvalNote());
        sc = stockCheckRepository.save(sc);
        return stockCheckService.toResponse(sc);
    }

    private String generateAdjustCode() {
        return ReceiptCodeGenerator.generate("ADJ-", adjustmentRepository::existsByAdjustCode);
    }
}
