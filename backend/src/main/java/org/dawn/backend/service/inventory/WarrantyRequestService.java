package org.dawn.backend.service.inventory;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.anno.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.inventory.ExportReason;
import org.dawn.backend.constant.inventory.ExportReceiptStatus;
import org.dawn.backend.constant.inventory.ProductUnitStatus;
import org.dawn.backend.constant.inventory.SourceType;
import org.dawn.backend.constant.inventory.WarrantyCompletionResult;
import org.dawn.backend.constant.inventory.WarrantyRequestStatus;
import org.dawn.backend.constant.inventory.WarrantyResolutionType;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.request.CancelWarrantyRequest;
import org.dawn.backend.controller.inventory.request.CompleteWarrantyRequest;
import org.dawn.backend.controller.inventory.request.CreateWarrantyRequest;
import org.dawn.backend.controller.inventory.request.ResolveWarrantyRequest;
import org.dawn.backend.controller.inventory.response.WarrantyLookupResponse;
import org.dawn.backend.controller.inventory.response.WarrantyRequestResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.Customer;
import org.dawn.backend.entity.inventory.ExportReceipt;
import org.dawn.backend.entity.inventory.ExportReceiptItem;
import org.dawn.backend.entity.inventory.ExportReceiptItemUnit;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ProductUnitStatusLog;
import org.dawn.backend.entity.inventory.WarrantyRequest;
import org.dawn.backend.exception.wrapper.InvalidRequestException;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.CustomerRepository;
import org.dawn.backend.repository.inventory.ExportReceiptItemRepository;
import org.dawn.backend.repository.inventory.ExportReceiptItemUnitRepository;
import org.dawn.backend.repository.inventory.ExportReceiptRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.WarrantyRequestRepository;
import org.dawn.backend.utils.ReceiptCodeGenerator;
import org.dawn.backend.utils.SecurityUtils;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WarrantyRequestService {

    private final WarrantyRequestRepository warrantyRequestRepository;
    private final ProductUnitRepository productUnitRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final ProductUnitStatusLogRepository statusLogRepository;
    private final ExportReceiptRepository exportReceiptRepository;
    private final ExportReceiptItemRepository exportReceiptItemRepository;
    private final ExportReceiptItemUnitRepository exportReceiptItemUnitRepository;

    public ResponsePage<WarrantyRequestResponse> findAll(Pageable pageable, String status, String resolutionType) {
        String normalizedStatus = normalize(status);
        String normalizedResolution = normalize(resolutionType);
        var page = normalizedStatus != null && normalizedResolution != null
                ? warrantyRequestRepository.findByStatusAndResolutionType(normalizedStatus, normalizedResolution, pageable)
                : normalizedStatus != null
                    ? warrantyRequestRepository.findByStatus(normalizedStatus, pageable)
                    : normalizedResolution != null
                        ? warrantyRequestRepository.findByResolutionType(normalizedResolution, pageable)
                        : warrantyRequestRepository.findAll(pageable);
        return ResponsePage.of(page.map(this::enrich));
    }

    public ResponsePage<WarrantyRequestResponse> findMyHandled(Pageable pageable) {
        Long userId = requireCurrentUserId();
        return ResponsePage.of(warrantyRequestRepository.findByHandledBy(userId, pageable).map(this::enrich));
    }

    public WarrantyRequestResponse findOne(Long id) {
        return enrich(findRequest(id));
    }

    public WarrantyLookupResponse lookup(String serialNumber) {
        ProductUnit unit = findUnitBySerial(serialNumber);
        Product product = productRepository.findById(unit.getProductId()).orElse(null);
        SaleContext sale = findSaleContext(unit.getId());
        List<WarrantyRequestResponse> history = warrantyRequestRepository
                .findByProductUnitIdOrReplacementUnitIdOrderByCreatedAtDesc(unit.getId(), unit.getId())
                .stream()
                .map(this::enrich)
                .toList();

        String warrantyStatus;
        boolean eligible;
        if (unit.getWarrantyStartDate() == null || unit.getWarrantyExpiresAt() == null) {
            warrantyStatus = "NOT_ACTIVATED";
            eligible = false;
        } else if (unit.getWarrantyExpiresAt().isBefore(Instant.now())) {
            warrantyStatus = "EXPIRED";
            eligible = false;
        } else {
            warrantyStatus = "VALID";
            eligible = ProductUnitStatus.SOLD.name().equals(unit.getStatus());
        }

        return WarrantyLookupResponse.builder()
                .productUnitId(unit.getId())
                .serialNumber(unit.getSerialNumber())
                .productId(unit.getProductId())
                .productName(product != null ? product.getName() : null)
                .productSku(product != null ? product.getSku() : null)
                .productUnitStatus(unit.getStatus())
                .purchaseDate(unit.getWarrantyStartDate())
                .warrantyExpiresAt(unit.getWarrantyExpiresAt())
                .warrantyStatus(warrantyStatus)
                .eligible(eligible)
                .customerId(sale.customer() != null ? sale.customer().getId() : null)
                .customerName(sale.customer() != null ? sale.customer().getName() : null)
                .saleReceiptCode(sale.receipt() != null ? sale.receipt().getReceiptCode() : null)
                .history(history)
                .build();
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_WARRANTY, entity = LogConstant.Entity.WARRANTY_REQUEST)
    public WarrantyRequestResponse create(CreateWarrantyRequest request) {
        Long userId = requireCurrentUserId();
        if (request == null || request.issueDescription() == null || request.issueDescription().isBlank()) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_ISSUE_REQUIRED);
        }

        ProductUnit unit = findUnitBySerial(request.serialNumber());
        if (!"SERIALIZED".equals(unit.getTrackingType())) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_SERIALIZED_ONLY);
        }
        if (!ProductUnitStatus.SOLD.name().equals(unit.getStatus())) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_UNIT_NOT_SOLD);
        }
        if (unit.getWarrantyStartDate() == null || unit.getWarrantyExpiresAt() == null) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_NOT_ACTIVATED);
        }
        boolean expired = unit.getWarrantyExpiresAt().isBefore(Instant.now());
        if (expired && !Boolean.TRUE.equals(request.allowExpired())) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_EXPIRED);
        }
        if (warrantyRequestRepository.existsByProductUnitIdAndStatus(
                unit.getId(), WarrantyRequestStatus.PENDING.name())) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_ALREADY_PENDING);
        }

        Customer customer = null;
        if (request.customerId() != null) {
            customer = customerRepository.findById(request.customerId())
                    .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.CUSTOMER_NOT_FOUND));
        } else {
            customer = findSaleContext(unit.getId()).customer();
        }

        WarrantyRequest warranty = WarrantyRequest.builder()
                .requestCode(generateRequestCode())
                .productUnitId(unit.getId())
                .customerId(customer != null ? customer.getId() : null)
                .issueDescription(request.issueDescription().trim())
                .status(WarrantyRequestStatus.PENDING.name())
                .handledBy(userId)
                .note(request.note())
                .build();
        return enrich(warrantyRequestRepository.save(warranty));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.RESOLVE_WARRANTY, entity = LogConstant.Entity.WARRANTY_REQUEST,
            entityClass = WarrantyRequest.class)
    public WarrantyRequestResponse resolve(Long id, ResolveWarrantyRequest request) {
        Long userId = requireCurrentUserId();
        WarrantyRequest warranty = findRequestForUpdate(id);
        requirePending(warranty);
        if (warranty.getResolutionType() != null) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_RESOLUTION_ALREADY_SELECTED);
        }

        WarrantyResolutionType resolution = parseResolution(request != null ? request.resolutionType() : null);
        ProductUnit original = productUnitRepository.findByIdForUpdate(warranty.getProductUnitId())
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PRODUCT_UNIT_NOT_FOUND));

        warranty.setResolutionType(resolution.name());
        warranty.setHandledBy(userId);
        warranty.setNote(appendNote(warranty.getNote(), request != null ? request.note() : null));

        switch (resolution) {
            case REPLACE -> applyReplacement(warranty, original, request, userId);
            case RMA -> applyRma(warranty, original, request, userId);
            case REPAIR -> transition(original, ProductUnitStatus.SOLD, ProductUnitStatus.UNDER_REPAIR,
                    warranty.getId(), userId);
            case REJECT -> applyReject(warranty, request);
            case RETURN_SUPPLIER -> applyReturnSupplier(warranty, original, userId);
        }

        return enrich(warrantyRequestRepository.save(warranty));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.COMPLETE_WARRANTY, entity = LogConstant.Entity.WARRANTY_REQUEST,
            entityClass = WarrantyRequest.class)
    public WarrantyRequestResponse complete(Long id, CompleteWarrantyRequest request) {
        Long userId = requireCurrentUserId();
        WarrantyRequest warranty = findRequestForUpdate(id);
        requirePending(warranty);

        WarrantyResolutionType resolution = parseExistingResolution(warranty);
        if (resolution != WarrantyResolutionType.REPAIR && resolution != WarrantyResolutionType.RMA) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_CANNOT_COMPLETE);
        }
        WarrantyCompletionResult result = parseCompletionResult(request != null ? request.result() : null);
        if (result == WarrantyCompletionResult.LOST && resolution != WarrantyResolutionType.RMA) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_CANNOT_COMPLETE);
        }

        ProductUnit unit = productUnitRepository.findByIdForUpdate(warranty.getProductUnitId())
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PRODUCT_UNIT_NOT_FOUND));
        ProductUnitStatus expected = resolution == WarrantyResolutionType.REPAIR
                ? ProductUnitStatus.UNDER_REPAIR
                : ProductUnitStatus.SENT_TO_MANUFACTURER;
        ProductUnitStatus target = switch (result) {
            case REPAIRED -> ProductUnitStatus.SOLD;
            case DEFECTIVE -> ProductUnitStatus.DEFECTIVE;
            case LOST -> ProductUnitStatus.LOST;
        };
        transition(unit, expected, target, warranty.getId(), userId);

        warranty.setStatus(WarrantyRequestStatus.COMPLETED.name());
        warranty.setHandledBy(userId);
        warranty.setCompletedAt(Instant.now());
        warranty.setNote(appendNote(warranty.getNote(), request != null ? request.note() : null));
        return enrich(warrantyRequestRepository.save(warranty));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CANCEL_WARRANTY, entity = LogConstant.Entity.WARRANTY_REQUEST,
            entityClass = WarrantyRequest.class)
    public WarrantyRequestResponse cancel(Long id, CancelWarrantyRequest request) {
        Long userId = requireCurrentUserId();
        WarrantyRequest warranty = findRequestForUpdate(id);
        requirePending(warranty);
        if (request == null || request.note() == null || request.note().isBlank()) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_CANCEL_REASON_REQUIRED);
        }

        ProductUnit unit = productUnitRepository.findByIdForUpdate(warranty.getProductUnitId())
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PRODUCT_UNIT_NOT_FOUND));
        if (ProductUnitStatus.UNDER_REPAIR.name().equals(unit.getStatus())) {
            transition(unit, ProductUnitStatus.UNDER_REPAIR, ProductUnitStatus.SOLD, warranty.getId(), userId);
        } else if (ProductUnitStatus.SENT_TO_MANUFACTURER.name().equals(unit.getStatus())) {
            transition(unit, ProductUnitStatus.SENT_TO_MANUFACTURER, ProductUnitStatus.SOLD, warranty.getId(), userId);
        }

        warranty.setStatus(WarrantyRequestStatus.CANCELLED.name());
        warranty.setHandledBy(userId);
        warranty.setCompletedAt(Instant.now());
        warranty.setNote(appendNote(warranty.getNote(), request.note()));
        return enrich(warrantyRequestRepository.save(warranty));
    }

    private void applyReplacement(WarrantyRequest warranty, ProductUnit original,
                                  ResolveWarrantyRequest request, Long userId) {
        if (request == null || request.replacementUnitId() == null) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_REPLACEMENT_REQUIRED);
        }
        if (original.getId().equals(request.replacementUnitId())) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_REPLACEMENT_SAME_UNIT);
        }
        ProductUnit replacement = productUnitRepository.findByIdForUpdate(request.replacementUnitId())
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.PRODUCT_UNIT_NOT_FOUND));
        if (!original.getProductId().equals(replacement.getProductId())) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_REPLACEMENT_PRODUCT_MISMATCH);
        }
        if (!ProductUnitStatus.IN_STOCK.name().equals(replacement.getStatus())
                || !"SERIALIZED".equals(replacement.getTrackingType())) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_REPLACEMENT_NOT_AVAILABLE);
        }

        transition(original, ProductUnitStatus.SOLD, ProductUnitStatus.DEFECTIVE, warranty.getId(), userId);
        transition(replacement, ProductUnitStatus.IN_STOCK, ProductUnitStatus.SOLD, warranty.getId(), userId);
        replacement.setWarrantyStartDate(Instant.now());
        replacement.setWarrantyExpiresAt(original.getWarrantyExpiresAt());
        productUnitRepository.save(replacement);

        warranty.setReplacementUnitId(replacement.getId());
        markCompleted(warranty, userId);
        createSystemExport(warranty, replacement, ExportReason.INTERNAL, userId);
    }

    private void applyRma(WarrantyRequest warranty, ProductUnit original,
                          ResolveWarrantyRequest request, Long userId) {
        if (request == null || request.rmaNumber() == null || request.rmaNumber().isBlank()) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_RMA_NUMBER_REQUIRED);
        }
        transition(original, ProductUnitStatus.SOLD, ProductUnitStatus.SENT_TO_MANUFACTURER,
                warranty.getId(), userId);
        warranty.setRmaNumber(request.rmaNumber().trim());
        warranty.setSentToPartnerAt(Instant.now());
        warranty.setExpectedReturnAt(request.expectedReturnAt());
        warranty.setPartnerNote(request.partnerNote());
    }

    private void applyReject(WarrantyRequest warranty, ResolveWarrantyRequest request) {
        if (request == null || request.note() == null || request.note().isBlank()) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_REJECT_REASON_REQUIRED);
        }
        warranty.setStatus(WarrantyRequestStatus.CANCELLED.name());
        warranty.setCompletedAt(Instant.now());
    }

    private void applyReturnSupplier(WarrantyRequest warranty, ProductUnit original, Long userId) {
        transition(original, ProductUnitStatus.SOLD, ProductUnitStatus.RETURNED_TO_SUPPLIER,
                warranty.getId(), userId);
        markCompleted(warranty, userId);
        createSystemExport(warranty, original, ExportReason.RETURN_SUPPLIER, userId);
    }

    private void createSystemExport(WarrantyRequest warranty, ProductUnit unit,
                                    ExportReason reason, Long userId) {
        String receiptCode = ReceiptCodeGenerator.generate("EXP-", exportReceiptRepository::existsByReceiptCode);
        ExportReceipt receipt = ExportReceipt.builder()
                .receiptCode(receiptCode)
                .reason(reason.name())
                .customerId(warranty.getCustomerId())
                .totalAmount(BigDecimal.ZERO)
                .status(ExportReceiptStatus.COMPLETED.name())
                .note("Warranty " + reason.name().toLowerCase() + " for " + warranty.getRequestCode())
                .createdBy(userId)
                .approvedBy(userId)
                .build();
        receipt = exportReceiptRepository.save(receipt);

        ExportReceiptItem item = ExportReceiptItem.builder()
                .receiptId(receipt.getId())
                .productId(unit.getProductId())
                .quantity(BigDecimal.ONE)
                .unitPrice(BigDecimal.ZERO)
                .totalPrice(BigDecimal.ZERO)
                .build();
        item = exportReceiptItemRepository.save(item);
        exportReceiptItemUnitRepository.save(ExportReceiptItemUnit.builder()
                .exportReceiptItemId(item.getId())
                .productUnitId(unit.getId())
                .quantity(BigDecimal.ONE)
                .sellPrice(BigDecimal.ZERO)
                .build());
    }

    private void transition(ProductUnit unit, ProductUnitStatus expected, ProductUnitStatus target,
                            Long warrantyId, Long userId) {
        if (!expected.name().equals(unit.getStatus())) {
            throw new InvalidRequestException(
                    Message.format(Message.Inventory.WARRANTY_INVALID_UNIT_STATE, unit.getStatus()));
        }
        unit.setStatus(target.name());
        productUnitRepository.save(unit);
        statusLogRepository.save(ProductUnitStatusLog.builder()
                .productUnitId(unit.getId())
                .fromStatus(expected.name())
                .toStatus(target.name())
                .sourceType(SourceType.WARRANTY_REQUEST.name())
                .sourceId(warrantyId)
                .changedBy(userId)
                .build());
    }

    private WarrantyRequestResponse enrich(WarrantyRequest warranty) {
        ProductUnit unit = productUnitRepository.findById(warranty.getProductUnitId()).orElse(null);
        Product product = unit != null
                ? productRepository.findById(unit.getProductId()).orElse(null)
                : null;
        Customer customer = warranty.getCustomerId() != null
                ? customerRepository.findById(warranty.getCustomerId()).orElse(null)
                : null;
        ProductUnit replacement = warranty.getReplacementUnitId() != null
                ? productUnitRepository.findById(warranty.getReplacementUnitId()).orElse(null)
                : null;
        String handledByName = warranty.getHandledBy() != null
                ? userRepository.findById(warranty.getHandledBy()).map(u -> u.getFullName()).orElse(null)
                : null;
        return WarrantyRequestMappingHelper.map(
                warranty, unit, product, customer, replacement, handledByName);
    }

    private ProductUnit findUnitBySerial(String serialNumber) {
        if (serialNumber == null || serialNumber.isBlank()) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_SERIAL_REQUIRED);
        }
        String value = serialNumber.trim();
        var exact = productUnitRepository.findBySerialNumberIgnoreCase(value);
        if (exact.isPresent()) return exact.get();

        List<ProductUnit> matches = productUnitRepository.findByNormalizedSerial(normalizeSerial(value));
        if (matches.isEmpty()) {
            throw new ResourceNotFoundException(Message.Inventory.PRODUCT_UNIT_NOT_FOUND);
        }
        if (matches.size() > 1) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_SERIAL_AMBIGUOUS);
        }
        return matches.getFirst();
    }

    private SaleContext findSaleContext(Long productUnitId) {
        for (var link : exportReceiptItemUnitRepository.findByProductUnitId(productUnitId)) {
            var item = exportReceiptItemRepository.findById(link.getExportReceiptItemId()).orElse(null);
            if (item == null) continue;
            var receipt = exportReceiptRepository.findById(item.getReceiptId()).orElse(null);
            if (receipt == null || !ExportReason.SALE.name().equals(receipt.getReason())
                    || !ExportReceiptStatus.COMPLETED.name().equals(receipt.getStatus())) continue;
            Customer customer = receipt.getCustomerId() != null
                    ? customerRepository.findById(receipt.getCustomerId()).orElse(null)
                    : null;
            return new SaleContext(receipt, customer);
        }
        return new SaleContext(null, null);
    }

    private WarrantyRequest findRequest(Long id) {
        return warrantyRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.WARRANTY_REQUEST_NOT_FOUND));
    }

    private WarrantyRequest findRequestForUpdate(Long id) {
        return warrantyRequestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.WARRANTY_REQUEST_NOT_FOUND));
    }

    private void requirePending(WarrantyRequest warranty) {
        if (!WarrantyRequestStatus.PENDING.name().equals(warranty.getStatus())) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_ONLY_PENDING);
        }
    }

    private WarrantyResolutionType parseResolution(String value) {
        if (value == null || value.isBlank()) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_RESOLUTION_REQUIRED);
        }
        try {
            return WarrantyResolutionType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new InvalidRequestException(
                    Message.format(Message.Inventory.WARRANTY_INVALID_RESOLUTION, value));
        }
    }

    private WarrantyResolutionType parseExistingResolution(WarrantyRequest warranty) {
        if (warranty.getResolutionType() == null) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_RESOLUTION_REQUIRED);
        }
        return WarrantyResolutionType.valueOf(warranty.getResolutionType());
    }

    private WarrantyCompletionResult parseCompletionResult(String value) {
        if (value == null || value.isBlank()) {
            throw new InvalidRequestException(Message.Inventory.WARRANTY_COMPLETION_RESULT_REQUIRED);
        }
        try {
            return WarrantyCompletionResult.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new InvalidRequestException(
                    Message.format(Message.Inventory.WARRANTY_INVALID_COMPLETION_RESULT, value));
        }
    }

    private void markCompleted(WarrantyRequest warranty, Long userId) {
        warranty.setStatus(WarrantyRequestStatus.COMPLETED.name());
        warranty.setHandledBy(userId);
        warranty.setCompletedAt(Instant.now());
    }

    private Long requireCurrentUserId() {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new InvalidRequestException(Message.Auth.USER_NOT_AUTHENTICATED);
        return userId;
    }

    private String generateRequestCode() {
        return ReceiptCodeGenerator.generate("WR-", warrantyRequestRepository::existsByRequestCode);
    }

    private String normalize(String value) {
        return value != null && !value.isBlank() ? value.trim().toUpperCase() : null;
    }

    private String normalizeSerial(String value) {
        return value.trim().toUpperCase()
                .replace('O', '0')
                .replace('I', '1')
                .replace('L', '1');
    }

    private String appendNote(String current, String addition) {
        if (addition == null || addition.isBlank()) return current;
        if (current == null || current.isBlank()) return addition.trim();
        return current + System.lineSeparator() + addition.trim();
    }

    private record SaleContext(ExportReceipt receipt, Customer customer) {}
}
