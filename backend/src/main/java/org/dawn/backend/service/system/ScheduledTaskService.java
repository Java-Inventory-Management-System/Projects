package org.dawn.backend.service.system;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.constant.enums.auth.URole;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.returns.ReturnReceiptStatus;
import org.dawn.backend.constant.enums.inventory.stockcheck.StockCheckStatus;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ReturnReceipt;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.returns.ReturnReceiptRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduledTaskService {

    private static final String ALERT_TEMPLATE = "system-alert";
    private static final String LOW_STOCK_SUBJECT = "[Cảnh báo] Hàng sắp hết";
    private static final String DEAD_STOCK_SUBJECT = "[Cảnh báo] Hàng tồn lâu";
    private static final String RETURN_AUTO_CANCEL_SUBJECT = "[Hệ thống] Phiếu trả hàng đã bị tự hủy";

    private final StockCheckRepository stockCheckRepository;
    private final ProductUnitRepository productUnitRepository;
    private final ProductRepository productRepository;
    private final ReturnReceiptRepository returnReceiptRepository;
    private final UserRepository userRepository;
    private final MailService mailService;

    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void expireStaleStockChecks() {
        List<StockCheckStatus> activeStatuses = List.of(StockCheckStatus.PENDING, StockCheckStatus.IN_PROGRESS);
        Instant cutoff = Instant.now().minus(Duration.ofDays(1));
        var stale = stockCheckRepository.findByStatusInAndCreatedAtBefore(activeStatuses, cutoff);
        for (var sc : stale) {
            stockCheckRepository.findByIdForUpdate(sc.getId())
                    .filter(s -> activeStatuses.contains(s.getStatus()))
                    .ifPresent(s -> {
                        s.setStatus(StockCheckStatus.EXPIRED);
                        stockCheckRepository.save(s);
                        log.warn("Stock check {} auto-expired (created at {}, older than 1 day)", s.getCheckCode(), s.getCreatedAt());
                    });
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
        List<String> cancelledCodes = new ArrayList<>();
        for (var receipt : stale) {
            returnReceiptRepository.findByIdForUpdate(receipt.getId())
                    .filter(r -> ReturnReceiptStatus.PENDING_APPROVAL == r.getStatus())
                    .ifPresent(r -> {
                        r.setStatus(ReturnReceiptStatus.CANCELLED);
                        returnReceiptRepository.save(r);
                        cancelledCodes.add(r.getReceiptCode());
                        notifyReturnAutoCancelled(r);
                        log.warn("Return receipt {} auto-cancelled (created at {}, older than 30 days)",
                                r.getReceiptCode(), r.getCreatedAt());
                    });
        }
        if (!stale.isEmpty()) {
            log.info("Auto-cancelled {} stale return receipt(s)", stale.size());
        }
    }

    @Scheduled(cron = "0 0 6 * * ?")
    public void checkLowStock() {
        List<Product> activeProducts = productRepository.findByIsActiveTrue();
        List<String> lines = new ArrayList<>();
        for (var product : activeProducts) {
            BigDecimal inStock = productUnitRepository.sumQuantityByProductIdAndStatus(
                    product.getId(), ProductUnitStatus.IN_STOCK);
            if (product.getMinStock() != null && inStock.compareTo(BigDecimal.valueOf(product.getMinStock())) <= 0) {
                lines.add(String.format("Sản phẩm %s (SKU: %s) — còn %s, định mức tối thiểu %d",
                        product.getName(), product.getSku(), inStock.toPlainString(), product.getMinStock()));
                log.warn("Low stock alert: product {} (SKU: {}) - in stock: {}, min_stock: {}",
                        product.getName(), product.getSku(), inStock, product.getMinStock());
            }
        }
        if (!lines.isEmpty()) {
            sendAlertToManagers(LOW_STOCK_SUBJECT, lines);
        }
    }

    @Scheduled(cron = "0 0 7 * * ?")
    public void checkDeadStock() {
        long configurableDays = 90;
        Instant cutoff = Instant.now().minus(Duration.ofDays(configurableDays));
        List<ProductUnit> deadUnits = productUnitRepository.findDeadStockUnits(cutoff);
        if (!deadUnits.isEmpty()) {
            log.warn("Dead stock alert: {} unit(s) inactive for >{} days", deadUnits.size(), configurableDays);
            sendAlertToManagers(DEAD_STOCK_SUBJECT,
                    List.of(String.format("Có %d đơn vị hàng tồn kho không xuất được trong hơn %d ngày.", deadUnits.size(), configurableDays)));
        }
    }

    private void notifyReturnAutoCancelled(ReturnReceipt receipt) {
        Long creatorId = receipt.getCreatedBy();
        if (creatorId == null) return;
        userRepository.findById(creatorId)
                .filter(u -> u.getEmail() != null && !u.getEmail().isBlank())
                .ifPresent(u -> mailService.sendHtmlMail(u.getEmail(), RETURN_AUTO_CANCEL_SUBJECT, ALERT_TEMPLATE,
                        Map.of("title", RETURN_AUTO_CANCEL_SUBJECT,
                                "lines", List.of(String.format(
                                        "Phiếu trả hàng %s đã bị hệ thống tự hủy vì chưa được duyệt trong 30 ngày.",
                                        receipt.getReceiptCode())))));
    }

    private void sendAlertToManagers(String subject, List<String> lines) {
        userRepository.findByRole_Name(URole.MANAGER).stream()
                .filter(u -> u.getEmail() != null && !u.getEmail().isBlank())
                .forEach(u -> mailService.sendHtmlMail(u.getEmail(), subject, ALERT_TEMPLATE,
                        Map.of("title", subject, "lines", lines)));
    }
}
