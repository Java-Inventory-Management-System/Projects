package org.dawn.backend.service.system;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.returns.ReturnReceiptStatus;
import org.dawn.backend.constant.enums.inventory.stockcheck.StockCheckStatus;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.returns.ReturnReceiptRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduledTaskService {

    private final StockCheckRepository stockCheckRepository;
    private final ProductUnitRepository productUnitRepository;
    private final ProductRepository productRepository;
    private final ReturnReceiptRepository returnReceiptRepository;

    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void expireStaleStockChecks() {
        List<StockCheckStatus> activeStatuses = List.of(StockCheckStatus.PENDING, StockCheckStatus.IN_PROGRESS);
        Instant cutoff = Instant.now().minus(Duration.ofDays(1));
        var stale = stockCheckRepository.findByStatusInAndCreatedAtBefore(activeStatuses, cutoff);
        for (var sc : stale) {
            sc.setStatus(StockCheckStatus.EXPIRED);
            stockCheckRepository.save(sc);
            log.warn("Stock check {} auto-expired (created at {}, older than 1 day)", sc.getCheckCode(), sc.getCreatedAt());
        }
        if (!stale.isEmpty()) {
            log.info("Expired {} stale stock check(s)", stale.size());
        }
    }

    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void cancelStaleReturnReceipts() {
        Instant cutoff = Instant.now().minus(Duration.ofDays(30));
        var stale = returnReceiptRepository.findByStatusAndCreatedAtBefore(ReturnReceiptStatus.PENDING_APPROVAL, cutoff);
        for (var receipt : stale) {
            receipt.setStatus(ReturnReceiptStatus.CANCELLED);
            returnReceiptRepository.save(receipt);
            log.warn("Return receipt {} auto-cancelled (created at {}, older than 30 days)",
                    receipt.getReceiptCode(), receipt.getCreatedAt());
        }
        if (!stale.isEmpty()) {
            log.info("Auto-cancelled {} stale return receipt(s)", stale.size());
        }
    }

    @Scheduled(cron = "0 0 6 * * ?")
    public void checkLowStock() {
        List<Product> activeProducts = productRepository.findByIsActiveTrue();
        for (var product : activeProducts) {
            long inStock = productUnitRepository.countByProductIdAndStatus(product.getId(), ProductUnitStatus.IN_STOCK);
            if (product.getMinStock() != null && inStock <= product.getMinStock()) {
                log.warn("Low stock alert: product {} (SKU: {}) — in stock: {}, min_stock: {}",
                        product.getName(), product.getSku(), inStock, product.getMinStock());
            }
        }
    }

    @Scheduled(cron = "0 0 7 * * ?")
    public void checkDeadStock() {
        long configurableDays = 90;
        Instant cutoff = Instant.now().minus(Duration.ofDays(configurableDays));
        List<ProductUnit> deadUnits = productUnitRepository.findDeadStockUnits(cutoff);
        if (!deadUnits.isEmpty()) {
            log.warn("Dead stock alert: {} unit(s) inactive for >{} days", deadUnits.size(), configurableDays);
        }
    }
}
