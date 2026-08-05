package org.dawn.backend.service.inventory.exports;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.shared.statemachine.StateMachine;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.constant.enums.inventory.exports.ExportReceiptStatus;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.response.ExportReceiptResponse;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ExportReceiptStatusHistory;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptStatusHistoryRepository;
import org.dawn.backend.config.security.SecurityPolicy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExportWorkflowService {

    private final ExportReceiptRepository exportReceiptRepository;
    private final ExportReceiptStatusHistoryRepository statusHistoryRepository;
    private final StateMachine<ExportReceiptStatus> exportReceiptStateMachine;
    private final SecurityPolicy securityPolicy;
    private final ExportReceiptService exportReceiptService;

    @Transactional
    @AuditLog(action = LogConstant.Action.CANCEL_EXPORT, entity = LogConstant.Entity.EXPORT_RECEIPT)
    public ExportReceiptResponse cancel(Long id) {
        Long userId = securityPolicy.requireAuthenticated();
        ExportReceipt receipt = exportReceiptRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.EXPORT_RECEIPT_NOT_FOUND));

        exportReceiptStateMachine.validate(receipt.getStatus(), ExportReceiptStatus.CANCELLED);

        ExportReceiptStatus oldStatus = receipt.getStatus();
        receipt.setStatus(ExportReceiptStatus.CANCELLED);
        receipt = exportReceiptRepository.save(receipt);

        statusHistoryRepository.save(ExportReceiptStatusHistory.builder()
                .receiptId(receipt.getId())
                .fromStatus(oldStatus.name())
                .toStatus(ExportReceiptStatus.CANCELLED.name())
                .changedBy(userId)
                .build());

        return exportReceiptService.toResponse(receipt);
    }
}
