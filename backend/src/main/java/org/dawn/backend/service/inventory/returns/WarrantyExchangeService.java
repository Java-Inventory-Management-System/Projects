package org.dawn.backend.service.inventory.returns;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.constant.enums.inventory.exports.ExportReason;
import org.dawn.backend.constant.enums.inventory.exports.ExportReceiptStatus;
import org.dawn.backend.constant.enums.inventory.returns.ReturnCondition;
import org.dawn.backend.constant.enums.inventory.returns.ReturnReceiptStatus;
import org.dawn.backend.constant.shared.ErrorCode;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.controller.inventory.request.WarrantyExchangeRequest;
import org.dawn.backend.controller.inventory.response.WarrantyExchangeInfoResponse;
import org.dawn.backend.controller.inventory.response.WarrantyExchangeResponse;
import org.dawn.backend.entity.catalog.DefectCategory;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ExportReceiptItem;
import org.dawn.backend.entity.inventory.ExportReceiptItemUnit;
import org.dawn.backend.entity.inventory.ExportReceiptStatusHistory;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ProductUnitStatusLog;
import org.dawn.backend.entity.inventory.ReturnReceipt;
import org.dawn.backend.entity.inventory.ReturnReceiptItem;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.DefectCategoryRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.returns.ReturnReceiptItemRepository;
import org.dawn.backend.repository.inventory.returns.ReturnReceiptRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptItemUnitRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.exports.ExportReceiptStatusHistoryRepository;
import org.dawn.backend.shared.util.ReceiptCodeGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Đổi 1:1 bảo hành tại quầy (Phần 4): xác nhận nhanh bằng quyền riêng, xuất ngay
 * 1 sản phẩm thay thế (COMPLETED, liên kết ngược phiếu trả), kế thừa hạn bảo hành
 * từ máy cũ. Phiếu trả vẫn đi tiếp quy trình QC/RMA đầy đủ như bình thường.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WarrantyExchangeService {

    private final ReturnReceiptRepository returnReceiptRepository;
    private final ReturnReceiptItemRepository returnReceiptItemRepository;
    private final DefectCategoryRepository defectCategoryRepository;
    private final ProductUnitRepository productUnitRepository;
    private final ProductUnitStatusLogRepository statusLogRepository;
    private final ProductRepository productRepository;
    private final ExportReceiptRepository exportReceiptRepository;
    private final ExportReceiptItemRepository exportReceiptItemRepository;
    private final ExportReceiptItemUnitRepository exportReceiptItemUnitRepository;
    private final ExportReceiptStatusHistoryRepository exportReceiptStatusHistoryRepository;
    private final SecurityPolicy securityPolicy;

    @Transactional(readOnly = true)
    public WarrantyExchangeInfoResponse info(Long returnReceiptId) {
        ReturnReceipt receipt = returnReceiptRepository.findById(returnReceiptId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.RETURN_RECEIPT_NOT_FOUND));
        ReturnReceiptItem item = findExchangeableItem(receipt);
        var originalUnit = item.getProductUnitId() != null
                ? productUnitRepository.findById(item.getProductUnitId()).orElse(null)
                : null;
        DefectCategory defect = item.getDefectCategoryId() != null
                ? defectCategoryRepository.findById(item.getDefectCategoryId()).orElse(null)
                : null;
        String productName = productRepository.findById(item.getProductId())
                .map(Product::getName).orElse(null);
        return new WarrantyExchangeInfoResponse(
                item.getProductUnitId(),
                originalUnit != null ? originalUnit.getSerialNumber() : null,
                item.getProductId(),
                productName,
                originalUnit != null ? findOriginalPrice(originalUnit.getId()) : BigDecimal.ZERO,
                originalUnit != null ? originalUnit.getWarrantyExpiresAt() : null,
                item.getDefectCategoryId(),
                defect != null ? defect.getName() : null,
                defect != null && Boolean.TRUE.equals(defect.getIsReplaceable()));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.WARRANTY_EXCHANGE, entity = LogConstant.Entity.PRODUCT_UNIT)
    public WarrantyExchangeResponse exchange(Long returnReceiptId, WarrantyExchangeRequest request) {
        Long userId = securityPolicy.requireAuthenticated();
        ReturnReceipt receipt = returnReceiptRepository.findById(returnReceiptId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.RETURN_RECEIPT_NOT_FOUND));
        if (receipt.getStatus() == ReturnReceiptStatus.CANCELLED) {
            throw new InvalidRequestException(ErrorCode.RETURN_ALREADY_CANCELLED);
        }
        if (exportReceiptRepository.existsBySourceReturnReceiptId(returnReceiptId)) {
            throw new InvalidRequestException(ErrorCode.EXCHANGE_ALREADY_PERFORMED);
        }
        if (request.replacementUnitId() == null) {
            throw new InvalidRequestException(ErrorCode.EXCHANGE_REPLACEMENT_UNIT_REQUIRED);
        }
        if (request.discountAmount() != null && request.discountAmount().signum() < 0) {
            throw new InvalidRequestException(ErrorCode.EXCHANGE_DISCOUNT_INVALID);
        }

        ReturnReceiptItem item = findExchangeableItem(receipt);
        ProductUnit originalUnit = productUnitRepository.findById(item.getProductUnitId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_UNIT_NOT_FOUND));
        Instant now = Instant.now();
        if (originalUnit.getWarrantyExpiresAt() == null || originalUnit.getWarrantyExpiresAt().isBefore(now)) {
            throw new InvalidRequestException(ErrorCode.WARRANTY_EXPIRED);
        }

        ProductUnit replacement = productUnitRepository.findByIdInWithLock(List.of(request.replacementUnitId()))
                .stream().filter(u -> u.getId().equals(request.replacementUnitId())).findFirst()
                .orElseThrow(() -> new InvalidRequestException(ErrorCode.EXCHANGE_UNIT_NOT_AVAILABLE));
        if (replacement.getStatus() != ProductUnitStatus.IN_STOCK || replacement.getBoxId() != null) {
            throw new InvalidRequestException(ErrorCode.EXCHANGE_UNIT_NOT_AVAILABLE);
        }
        Product product = productRepository.findById(replacement.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));
        BigDecimal newPrice = product.getSellPrice() != null ? product.getSellPrice() : BigDecimal.ZERO;
        BigDecimal originalPrice = findOriginalPrice(originalUnit.getId());
        BigDecimal charge = newPrice.subtract(originalPrice);
        if (charge.signum() < 0) {
            charge = BigDecimal.ZERO;
        }
        BigDecimal discount = request.discountAmount() != null ? request.discountAmount() : BigDecimal.ZERO;
        BigDecimal chargeAmount = charge.subtract(discount);
        if (chargeAmount.signum() < 0) {
            chargeAmount = BigDecimal.ZERO;
        }

        replacement.setStatus(ProductUnitStatus.EXPORTED);
        replacement.setLocationId(null);
        replacement.setWarrantyStartDate(originalUnit.getWarrantyStartDate() != null
                ? originalUnit.getWarrantyStartDate() : now);
        replacement.setWarrantyExpiresAt(maxExpiry(originalUnit.getWarrantyExpiresAt(), ownExpiry(replacement, now)));
        replacement.setIsWarrantyActive(true);
        productUnitRepository.save(replacement);
        statusLogRepository.save(ProductUnitStatusLog.builder()
                .productUnitId(replacement.getId())
                .fromStatus(ProductUnitStatus.IN_STOCK.name())
                .toStatus(ProductUnitStatus.EXPORTED.name())
                .sourceType(SourceType.EXPORT_RECEIPT.name())
                .sourceId(null)
                .note(request.note() != null && !request.note().isBlank() ? request.note().trim() : null)
                .changedBy(userId)
                .build());

        ExportReceipt export = createAutoExport(replacement, product, receipt, userId, chargeAmount, newPrice);
        return new WarrantyExchangeResponse(export.getReceiptCode(), export.getId(), replacement.getId(),
                replacement.getSerialNumber(), originalPrice, newPrice, chargeAmount,
                replacement.getWarrantyExpiresAt());
    }

    /** Máy trả về: LỖI + danh mục lỗi cho phép đổi 1:1; chỉ hỗ trợ serial (không bulk). */
    private ReturnReceiptItem findExchangeableItem(ReturnReceipt receipt) {
        List<ReturnReceiptItem> items = returnReceiptItemRepository.findByReturnReceiptId(receipt.getId());
        for (ReturnReceiptItem item : items) {
            if (!ReturnCondition.DEFECTIVE.name().equals(item.getCondition())) {
                continue;
            }
            DefectCategory defect = item.getDefectCategoryId() != null
                    ? defectCategoryRepository.findById(item.getDefectCategoryId()).orElse(null)
                    : null;
            if (defect == null || !Boolean.TRUE.equals(defect.getIsReplaceable())) {
                throw new InvalidRequestException(ErrorCode.EXCHANGE_DEFECT_NOT_REPLACEABLE);
            }
            if (item.getProductUnitId() == null) {
                continue;
            }
            return item;
        }
        throw new InvalidRequestException(ErrorCode.EXCHANGE_ITEM_NOT_FOUND);
    }

    /** Giá bán gốc của máy: từ phiếu xuất bán gần nhất chứa serial này. */
    private BigDecimal findOriginalPrice(Long unitId) {
        return exportReceiptItemUnitRepository.findByProductUnitId(unitId).stream()
                .map(ExportReceiptItemUnit::getSellPrice)
                .filter(java.util.Objects::nonNull)
                .findFirst()
                .orElse(BigDecimal.ZERO);
    }

    private Instant ownExpiry(ProductUnit unit, Instant now) {
        if (unit.getWarrantyMonths() == null) {
            return null;
        }
        return now.plusSeconds(unit.getWarrantyMonths() * 30L * 86400L);
    }

    private Instant maxExpiry(Instant inherited, Instant own) {
        if (inherited == null) {
            return own;
        }
        if (own == null) {
            return inherited;
        }
        return inherited.isAfter(own) ? inherited : own;
    }

    private ExportReceipt createAutoExport(ProductUnit replacement, Product product, ReturnReceipt receipt,
                                           Long userId, BigDecimal chargeAmount, BigDecimal newPrice) {
        String receiptCode = ReceiptCodeGenerator.generate("EXP-", exportReceiptRepository::existsByReceiptCode);
        ExportReceipt export = ExportReceipt.builder()
                .receiptCode(receiptCode)
                .reason(ExportReason.WARRANTY_EXCHANGE.name())
                .customerId(receipt.getOriginalExportReceiptId() != null
                        ? exportReceiptRepository.findById(receipt.getOriginalExportReceiptId())
                                .map(ExportReceipt::getCustomerId).orElse(null)
                        : null)
                .totalAmount(chargeAmount)
                .status(ExportReceiptStatus.COMPLETED)
                .createdBy(userId)
                .fulfilledBy(userId)
                .fulfilledAt(Instant.now())
                .sourceReturnReceiptId(receipt.getId())
                .build();
        export = exportReceiptRepository.save(export);
        ExportReceiptItem item = exportReceiptItemRepository.save(ExportReceiptItem.builder()
                .receiptId(export.getId())
                .productId(product.getId())
                .quantity(BigDecimal.ONE)
                .unitPrice(newPrice)
                .totalPrice(newPrice)
                .build());
        exportReceiptItemUnitRepository.save(ExportReceiptItemUnit.builder()
                .exportReceiptItemId(item.getId())
                .productUnitId(replacement.getId())
                .quantity(BigDecimal.ONE)
                .sellPrice(newPrice)
                .build());
        exportReceiptStatusHistoryRepository.save(ExportReceiptStatusHistory.builder()
                .receiptId(export.getId())
                .fromStatus("NEW")
                .toStatus(ExportReceiptStatus.COMPLETED.name())
                .changedBy(userId)
                .build());
        return export;
    }
}