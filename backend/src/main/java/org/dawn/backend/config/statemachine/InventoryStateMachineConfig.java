package org.dawn.backend.config.statemachine;

import org.dawn.backend.shared.statemachine.StateMachine;
import org.dawn.backend.constant.enums.inventory.adjustments.AdjustmentStatus;
import org.dawn.backend.constant.enums.inventory.exports.ExportReceiptStatus;
import org.dawn.backend.constant.enums.inventory.imports.ImportReceiptStatus;
import org.dawn.backend.constant.enums.inventory.returns.ReturnReceiptStatus;
import org.dawn.backend.constant.enums.inventory.stockcheck.StockCheckStatus;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class InventoryStateMachineConfig {

    @Bean
    public StateMachine<ImportReceiptStatus> importReceiptStateMachine() {
        return new StateMachine<>(ImportReceiptStatus.class)
            .allow(ImportReceiptStatus.DRAFT, ImportReceiptStatus.PENDING_APPROVAL, ImportReceiptStatus.CANCELLED)
            .allow(ImportReceiptStatus.PENDING_APPROVAL, ImportReceiptStatus.COMPLETED, ImportReceiptStatus.CANCELLED);
    }

    @Bean
    public StateMachine<ExportReceiptStatus> exportReceiptStateMachine() {
        return new StateMachine<>(ExportReceiptStatus.class)
            // ponytail: APPROVED chỉ còn cho phiếu legacy (tạo trước khi cắt bước duyệt), không sinh mới
            .allow(ExportReceiptStatus.PENDING, ExportReceiptStatus.COMPLETED, ExportReceiptStatus.CANCELLED)
            .allow(ExportReceiptStatus.APPROVED, ExportReceiptStatus.COMPLETED, ExportReceiptStatus.CANCELLED);
    }

    @Bean
    public StateMachine<StockCheckStatus> stockCheckStateMachine() {
        return new StateMachine<>(StockCheckStatus.class)
            .allow(StockCheckStatus.PENDING, StockCheckStatus.IN_PROGRESS, StockCheckStatus.CANCELLED)
            .allow(StockCheckStatus.IN_PROGRESS, StockCheckStatus.COMPLETED, StockCheckStatus.CANCELLED)
            .allow(StockCheckStatus.COMPLETED, StockCheckStatus.APPROVED, StockCheckStatus.IN_PROGRESS);
    }

    @Bean
    public StateMachine<AdjustmentStatus> adjustmentStateMachine() {
        return new StateMachine<>(AdjustmentStatus.class)
            .allow(AdjustmentStatus.PENDING, AdjustmentStatus.APPROVED, AdjustmentStatus.REJECTED, AdjustmentStatus.CANCELLED);
    }

    @Bean
    public StateMachine<ReturnReceiptStatus> returnReceiptStateMachine() {
        return new StateMachine<>(ReturnReceiptStatus.class)
            .allow(ReturnReceiptStatus.PENDING_APPROVAL, ReturnReceiptStatus.COMPLETED, ReturnReceiptStatus.CANCELLED);
    }
}
