package org.dawn.backend.service.inventory;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.anno.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.inventory.DifferenceType;
import org.dawn.backend.constant.inventory.ProductUnitStatus;
import org.dawn.backend.constant.inventory.SourceType;
import org.dawn.backend.constant.inventory.StockCheckStatus;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.request.ApproveStockCheckRequest;
import org.dawn.backend.controller.inventory.request.CreateStockCheckRequest;
import org.dawn.backend.controller.inventory.request.StockCheckItemRequest;
import org.dawn.backend.controller.inventory.response.StockCheckResponse;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.*;
import org.dawn.backend.exception.wrapper.InvalidRequestException;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.*;
import org.dawn.backend.utils.ReceiptCodeGenerator;
import org.dawn.backend.utils.SecurityUtils;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockCheckService {

    private final StockCheckRepository stockCheckRepository;
    private final StockCheckItemRepository stockCheckItemRepository;
    private final ProductUnitRepository productUnitRepository;
    private final ProductUnitStatusLogRepository statusLogRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public ResponsePage<StockCheckResponse> findAll(Pageable pageable) {
        var page = stockCheckRepository.findAll(pageable);
        var userMap = fetchUserNames(page.getContent());
        return ResponsePage.of(page.map(sc -> enrich(sc, userMap)));
    }

    @Transactional(readOnly = true)
    public StockCheckResponse findOne(Long id) {
        var sc = stockCheckRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.STOCK_CHECK_NOT_FOUND));
        return enrich(sc);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse create(CreateStockCheckRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new InvalidRequestException(Message.Auth.USER_NOT_AUTHENTICATED);

        if (request.productUnitIds() == null || request.productUnitIds().isEmpty()) {
            throw new InvalidRequestException(Message.Inventory.STOCK_CHECK_ITEMS_REQUIRED);
        }

        String checkCode = generateCheckCode();
        StockCheck sc = StockCheck.builder()
                .checkCode(checkCode)
                .status(StockCheckStatus.PENDING)
                .note(request.note())
                .createdBy(userId)
                .build();
        sc = stockCheckRepository.save(sc);
        Long scId = sc.getId();

        var units = productUnitRepository.findAllById(request.productUnitIds());
        for (var unit : units) {
            stockCheckItemRepository.save(StockCheckItem.builder()
                    .stockCheckId(scId)
                    .productUnitId(unit.getId())
                    .expectedStatus(unit.getStatus().name())
                    .build());
        }

        sc.setStatus(StockCheckStatus.IN_PROGRESS);
        sc = stockCheckRepository.save(sc);
        return enrich(sc);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.RECORD_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse recordItems(Long stockCheckId, StockCheckItemRequest.BatchRequest request) {
        var sc = stockCheckRepository.findById(stockCheckId)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.STOCK_CHECK_NOT_FOUND));

        if (StockCheckStatus.IN_PROGRESS != sc.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.STOCK_CHECK_MUST_BE_IN_PROGRESS);
        }

        var existingItems = stockCheckItemRepository.findByStockCheckId(stockCheckId);
        Map<Long, StockCheckItem> itemMap = existingItems.stream()
                .collect(Collectors.toMap(StockCheckItem::getProductUnitId, i -> i));

        for (var req : request.items()) {
            var item = itemMap.get(req.productUnitId());
            if (item == null) {
                item = StockCheckItem.builder()
                        .stockCheckId(stockCheckId)
                        .productUnitId(req.productUnitId())
                        .build();
            }
            String actual = req.actualStatus() != null ? req.actualStatus().toUpperCase() : ProductUnitStatus.IN_STOCK.name();
            item.setActualStatus(actual);
            item.setCountedQuantity(req.countedQuantity());
            item.setNote(req.note());

            String expected = item.getExpectedStatus();
            if (expected == null) expected = ProductUnitStatus.IN_STOCK.name();

            if (actual.equals(expected)) {
                item.setDifference(DifferenceType.MATCH.name());
            } else if (ProductUnitStatus.LOST.name().equals(actual) || DifferenceType.MISSING.name().equalsIgnoreCase(actual)) {
                item.setDifference(DifferenceType.MISSING.name());
            } else {
                item.setDifference(DifferenceType.UNEXPECTED.name());
            }

            stockCheckItemRepository.save(item);
        }

        return enrich(sc);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.COMPLETE_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse complete(Long id) {
        var sc = stockCheckRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.STOCK_CHECK_NOT_FOUND));

        if (StockCheckStatus.IN_PROGRESS != sc.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.STOCK_CHECK_ALREADY_COMPLETED);
        }
        sc.setStatus(StockCheckStatus.COMPLETED);
        sc = stockCheckRepository.save(sc);
        return enrich(sc);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.APPROVE_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse approve(Long id, ApproveStockCheckRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        var sc = stockCheckRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.STOCK_CHECK_NOT_FOUND));

        if (StockCheckStatus.COMPLETED != sc.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.ONLY_COMPLETED_CAN_APPROVE);
        }
        if (sc.getCreatedBy().equals(userId)) {
            throw new InvalidRequestException(Message.Inventory.CREATOR_CANNOT_APPROVE);
        }

        sc.setStatus(StockCheckStatus.APPROVED);
        sc.setApprovedBy(userId);
        sc.setApprovalNote(request != null ? request.approvalNote() : null);
        sc = stockCheckRepository.save(sc);

        var items = stockCheckItemRepository.findByStockCheckId(id);
        for (var item : items) {
            var unit = productUnitRepository.findById(item.getProductUnitId()).orElse(null);
            if (unit == null) continue;

            String diff = item.getDifference();
            if (DifferenceType.MISSING.name().equals(diff)) {
                ProductUnitStatus oldStatus = unit.getStatus();
                unit.setStatus(ProductUnitStatus.LOST);
                productUnitRepository.save(unit);
                statusLogRepository.save(ProductUnitStatusLog.builder()
                        .productUnitId(unit.getId())
                        .fromStatus(oldStatus.name())
                        .toStatus(ProductUnitStatus.LOST.name())
                        .sourceType(SourceType.STOCK_CHECK.name())
                        .sourceId(id)
                        .changedBy(userId)
                        .build());
            } else if (DifferenceType.UNEXPECTED.name().equals(diff)) {
                ProductUnitStatus oldStatus = unit.getStatus();
                unit.setStatus(ProductUnitStatus.valueOf(item.getActualStatus()));
                productUnitRepository.save(unit);
                statusLogRepository.save(ProductUnitStatusLog.builder()
                        .productUnitId(unit.getId())
                        .fromStatus(oldStatus.name())
                        .toStatus(unit.getStatus().name())
                        .sourceType(SourceType.STOCK_CHECK.name())
                        .sourceId(id)
                        .changedBy(userId)
                        .build());
            }
        }

        return enrich(sc);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.REJECT_STOCK_CHECK, entity = LogConstant.Entity.STOCK_CHECK)
    public StockCheckResponse reject(Long id, ApproveStockCheckRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        var sc = stockCheckRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.STOCK_CHECK_NOT_FOUND));

        if (StockCheckStatus.COMPLETED != sc.getStatus()) {
            throw new InvalidRequestException(Message.Inventory.ONLY_COMPLETED_CAN_REJECT);
        }

        sc.setStatus(StockCheckStatus.REJECTED);
        sc.setApprovedBy(userId);
        sc.setApprovalNote(request != null ? request.approvalNote() : null);
        sc = stockCheckRepository.save(sc);
        return enrich(sc);
    }

    @Transactional(readOnly = true)
    public ResponsePage<StockCheckResponse> findMyChecks(Pageable pageable) {
        Long userId = SecurityUtils.getCurrentUserId();
        var page = stockCheckRepository.findByCreatedBy(userId, pageable);
        var userMap = fetchUserNames(page.getContent());
        return ResponsePage.of(page.map(sc -> enrich(sc, userMap)));
    }

    private Map<Long, String> fetchUserNames(List<StockCheck> checks) {
        var userIds = checks.stream().flatMap(sc -> {
            var ids = new ArrayList<Long>();
            ids.add(sc.getCreatedBy());
            if (sc.getApprovedBy() != null) ids.add(sc.getApprovedBy());
            return ids.stream();
        }).distinct().toList();
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
    }

    private StockCheckResponse enrich(StockCheck sc, Map<Long, String> userMap) {
        var items = stockCheckItemRepository.findByStockCheckId(sc.getId());
        var unitIds = items.stream().map(StockCheckItem::getProductUnitId).toList();
        var units = productUnitRepository.findAllById(unitIds).stream()
                .collect(Collectors.toMap(ProductUnit::getId, u -> u));
        var productIds = units.values().stream().map(ProductUnit::getProductId).toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        var createdByName = userMap.get(sc.getCreatedBy());
        var approvedByName = sc.getApprovedBy() != null ? userMap.get(sc.getApprovedBy()) : null;
        return StockCheckMappingHelper.map(sc, createdByName, approvedByName, items, units, products);
    }

    private StockCheckResponse enrich(StockCheck sc) {
        var items = stockCheckItemRepository.findByStockCheckId(sc.getId());
        var unitIds = items.stream().map(StockCheckItem::getProductUnitId).toList();
        var units = productUnitRepository.findAllById(unitIds).stream()
                .collect(Collectors.toMap(ProductUnit::getId, u -> u));
        var productIds = units.values().stream().map(ProductUnit::getProductId).toList();
        var products = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        var createdByName = userRepository.findById(sc.getCreatedBy())
                .map(User::getFullName).orElse(null);
        var approvedByName = sc.getApprovedBy() != null
                ? userRepository.findById(sc.getApprovedBy()).map(User::getFullName).orElse(null)
                : null;
        return StockCheckMappingHelper.map(sc, createdByName, approvedByName, items, units, products);
    }

    private String generateCheckCode() {
        return ReceiptCodeGenerator.generate("SC-", stockCheckRepository::existsByCheckCode);
    }
}
