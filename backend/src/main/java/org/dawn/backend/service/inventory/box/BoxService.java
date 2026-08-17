package org.dawn.backend.service.inventory.box;
import org.dawn.backend.constant.shared.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.constant.enums.catalog.TrackingType;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.box.BoxStatus;
import org.dawn.backend.constant.enums.inventory.box.BoxType;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.controller.inventory.request.MoveBoxRequest;
import org.dawn.backend.controller.inventory.request.SealBoxRequest;
import org.dawn.backend.controller.inventory.response.BoxResponse;
import org.dawn.backend.entity.auth.User;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.Box;
import org.dawn.backend.entity.inventory.ImportReceipt;
import org.dawn.backend.entity.inventory.ImportReceiptItem;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.auth.UserRepository;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.box.BoxRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptItemRepository;
import org.dawn.backend.repository.inventory.imports.ImportReceiptRepository;
import org.dawn.backend.repository.inventory.stockcheck.StockCheckItemRepository;
import org.dawn.backend.service.inventory.LocationCapacityValidator;
import org.dawn.backend.shared.util.ReceiptCodeGenerator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BoxService {

    private final BoxRepository boxRepository;
    private final ProductUnitRepository productUnitRepository;
    private final LocationRepository locationRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final ImportReceiptRepository importReceiptRepository;
    private final ImportReceiptItemRepository importReceiptItemRepository;
    private final StockCheckItemRepository stockCheckItemRepository;
    private final SecurityPolicy securityPolicy;
    private final LocationCapacityValidator capacityValidator;
    private final BoxCapacity boxCapacity;

    @Transactional(readOnly = true)
    public ResponsePage<BoxResponse> findAll(Long locationId, String status, Pageable pageable) {
        Page<Box> page = status != null
                ? (locationId != null
                        ? boxRepository.findByLocationIdAndStatus(locationId, BoxStatus.valueOf(status.toUpperCase()), pageable)
                        : boxRepository.findByStatus(BoxStatus.valueOf(status.toUpperCase()), pageable))
                : (locationId != null ? boxRepository.findByLocationId(locationId, pageable) : boxRepository.findAll(pageable));
        List<Box> boxes = page.getContent();
        if (boxes.isEmpty()) return ResponsePage.of(page.map(b -> toResponse(b, Map.of(), Map.of(), Map.of(), null, 0)));
        Map<Long, Long> counts = productUnitRepository.findByBoxIdInAndStatus(
                        boxes.stream().map(Box::getId).toList(), ProductUnitStatus.IN_STOCK).stream()
                .collect(Collectors.groupingBy(ProductUnit::getBoxId, Collectors.counting()));
        var locationMap = fetchLocations(boxes);
        var userMap = fetchUserNames(boxes);
        var receiptCodeMap = fetchReceiptCodes(boxes);
        return ResponsePage.of(page.map(b -> toResponse(b, locationMap, userMap, receiptCodeMap, null, counts.getOrDefault(b.getId(), 0L).intValue())));
    }

    @Transactional(readOnly = true)
    public BoxResponse findOne(Long id) {
        var box = boxRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BOX_NOT_FOUND));
        var units = productUnitRepository.findByBoxIdAndStatus(id, ProductUnitStatus.IN_STOCK);
        return toResponse(box, fetchLocations(List.of(box)), fetchUserNames(List.of(box)), fetchReceiptCodes(List.of(box)), units, units.size());
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.SEAL_BOX, entity = LogConstant.Entity.BOX)
    public BoxResponse seal(SealBoxRequest request) {
        Long userId = securityPolicy.requireAuthenticated();
        if (request.unitIds() == null || request.unitIds().isEmpty()) {
            throw new InvalidRequestException(ErrorCode.BOX_UNITS_REQUIRED);
        }
        if (request.locationId() == null) {
            throw new InvalidRequestException(ErrorCode.BOX_LOCATION_REQUIRED);
        }
        locationRepository.findById(request.locationId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.LOCATION_NOT_FOUND));

        var unitIds = request.unitIds().stream().distinct().toList();
        var units = productUnitRepository.findByIdsForUpdate(unitIds);
        if (units.size() != unitIds.size()) {
            throw new InvalidRequestException(ErrorCode.BOX_UNIT_NOT_IN_STOCK);
        }
        for (var unit : units) {
            if (unit.getBoxId() != null) {
                throw new InvalidRequestException(ErrorCode.BOX_UNIT_ALREADY_IN_BOX.format( unit.getId()));
            }
            if (unit.getStatus() != ProductUnitStatus.IN_STOCK) {
                throw new InvalidRequestException(ErrorCode.BOX_UNIT_NOT_IN_STOCK.format( unit.getId()));
            }
            if (unit.getImportReceiptItemId() == null) {
                throw new InvalidRequestException(ErrorCode.BOX_UNIT_NO_IMPORT.format( unit.getId()));
            }
        }
        Set<Long> receiptIds = resolveReceiptIds(units);
        if (receiptIds.size() > 1) {
            throw new InvalidRequestException(ErrorCode.BOX_UNIT_MIXED_IMPORT);
        }

        Map<Long, BigDecimal> requestedQty = request.items() == null ? Map.of()
                : request.items().stream()
                        .filter(i -> i.quantity() != null)
                        .collect(Collectors.toMap(SealBoxRequest.SealBoxItem::unitId, SealBoxRequest.SealBoxItem::quantity));

        BigDecimal quantity = BigDecimal.ZERO;
        for (var unit : units) {
            boolean isBulk = TrackingType.BULK.name().equals(unit.getTrackingType());
            BigDecimal unitQty = isBulk
                    ? (unit.getRemainingQuantity() == null ? BigDecimal.ZERO : unit.getRemainingQuantity())
                    : BigDecimal.ONE;
            BigDecimal wanted = requestedQty.get(unit.getId());
            if (wanted != null) {
                if (!isBulk) {
                    wanted = BigDecimal.ONE;
                } else if (wanted.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new InvalidRequestException(ErrorCode.BOX_UNIT_QTY_ZERO.format(unit.getId()));
                } else if (wanted.compareTo(unitQty) > 0) {
                    throw new InvalidRequestException(ErrorCode.BOX_UNIT_QTY_EXCEEDS.format(
                            wanted, unit.getId(), unitQty));
                }
                unitQty = wanted;
            }
            quantity = quantity.add(unitQty);
        }
        if (quantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidRequestException(ErrorCode.BOX_UNITS_REQUIRED);
        }

        BoxType boxType = request.boxType() == null ? BoxType.MEDIUM : request.boxType();
        int maxUnits = boxType.maxUnits();
        if (quantity.compareTo(BigDecimal.valueOf(maxUnits)) > 0) {
            throw new InvalidRequestException(ErrorCode.BOX_MAX_UNITS.format( boxType.name(), maxUnits));
        }

        capacityValidator.assertCapacity(request.locationId(), BigDecimal.valueOf(maxUnits), unitIds);

        Box box = Box.builder()
                .boxCode(ReceiptCodeGenerator.generate("BOX-", boxRepository::existsByBoxCode))
                .importReceiptId(receiptIds.isEmpty() ? null : receiptIds.iterator().next())
                .boxType(boxType)
                .locationId(request.locationId())
                .status(BoxStatus.SEALED)
                .sealedQuantity(quantity)
                .sealedBy(userId)
                .sealedAt(Instant.now())
                .note(request.note())
                .createdBy(userId)
                .build();
        box = boxRepository.save(box);

        List<ProductUnit> boxedUnits = new ArrayList<>();
        for (var unit : units) {
            boolean isBulk = TrackingType.BULK.name().equals(unit.getTrackingType());
            BigDecimal unitQty = requestedQty.get(unit.getId());
            if (isBulk && unitQty != null && unitQty.compareTo(unit.getRemainingQuantity()) < 0) {
                ProductUnit boxed = ProductUnit.builder()
                        .productId(unit.getProductId())
                        .trackingType(TrackingType.BULK.name())
                        .initialQuantity(unitQty)
                        .remainingQuantity(unitQty)
                        .importReceiptItemId(unit.getImportReceiptItemId())
                        .locationId(request.locationId())
                        .status(ProductUnitStatus.IN_STOCK)
                        .importedAt(unit.getImportedAt())
                        .costPrice(unit.getCostPrice())
                        .warrantyMonths(unit.getWarrantyMonths())
                        .warrantyStartDate(unit.getWarrantyStartDate())
                        .warrantyExpiresAt(unit.getWarrantyExpiresAt())
                        .isWarrantyActive(unit.getIsWarrantyActive())
                        .warrantySealCode(unit.getWarrantySealCode())
                        .boxId(box.getId())
                        .build();
                boxed = productUnitRepository.save(boxed);
                unit.setRemainingQuantity(unit.getRemainingQuantity().subtract(unitQty));
                productUnitRepository.save(unit);
                boxedUnits.add(boxed);
            } else {
                unit.setBoxId(box.getId());
                unit.setLocationId(request.locationId());
                productUnitRepository.save(unit);
                boxedUnits.add(unit);
            }
        }
        return toResponse(box, fetchLocations(List.of(box)), fetchUserNames(List.of(box)), fetchReceiptCodes(List.of(box)), boxedUnits, boxedUnits.size());
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.UNSEAL_BOX, entity = LogConstant.Entity.BOX)
    public BoxResponse unseal(Long id) {
        Long userId = securityPolicy.requireAuthenticated();
        var box = boxRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BOX_NOT_FOUND));
        if (box.getStatus() != BoxStatus.SEALED) {
            throw new InvalidRequestException(ErrorCode.BOX_UNSEAL_ALREADY);
        }
        for (var unit : productUnitRepository.findByBoxId(id)) {
            unit.setBoxId(null);
            unit.setLocationId(box.getLocationId());
            productUnitRepository.save(unit);
        }
        box.setStatus(BoxStatus.UNSEALED);
        box.setUnsealedBy(userId);
        box.setUnsealedAt(Instant.now());
        box = boxRepository.save(box);
        return toResponse(box, fetchLocations(List.of(box)), fetchUserNames(List.of(box)), fetchReceiptCodes(List.of(box)), List.of(), 0);
    }

    @Transactional
    public void reclose(Long id) {
        var box = boxRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BOX_NOT_FOUND));
        if (box.getStatus() != BoxStatus.UNSEALED) return;
        box.setStatus(BoxStatus.SEALED);
        box.setSealedBy(box.getUnsealedBy());
        box.setSealedAt(Instant.now());
        boxRepository.save(box);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.MOVE_BOX, entity = LogConstant.Entity.BOX)
    public BoxResponse move(Long id, MoveBoxRequest request) {
        securityPolicy.requireAuthenticated();
        if (request.locationId() == null) {
            throw new InvalidRequestException(ErrorCode.BOX_LOCATION_REQUIRED);
        }
        locationRepository.findById(request.locationId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.LOCATION_NOT_FOUND));
        var box = boxRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BOX_NOT_FOUND));
        if (box.getStatus() != BoxStatus.SEALED) {
            throw new InvalidRequestException(ErrorCode.BOX_MOVE_OPEN);
        }
        var units = productUnitRepository.findByBoxId(id);
        if (!box.getLocationId().equals(request.locationId())) {
            capacityValidator.assertCapacity(request.locationId(),
                    BigDecimal.valueOf(box.getBoxType().maxUnits()));
        }
        box.setLocationId(request.locationId());
        box = boxRepository.save(box);
        for (var unit : units) {
            unit.setLocationId(request.locationId());
            productUnitRepository.save(unit);
        }
        return toResponse(box, fetchLocations(List.of(box)), fetchUserNames(List.of(box)), fetchReceiptCodes(List.of(box)), List.of(), 0);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.DELETE_BOX, entity = LogConstant.Entity.BOX)
    public void delete(Long id) {
        var box = boxRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BOX_NOT_FOUND));
        if (box.getStatus() != BoxStatus.UNSEALED) {
            throw new InvalidRequestException(ErrorCode.BOX_DELETE_SEALED);
        }
        for (var unit : productUnitRepository.findByBoxId(id)) {
            unit.setBoxId(null);
            unit.setLocationId(box.getLocationId());
            productUnitRepository.save(unit);
        }
        boxRepository.delete(box);
    }

    private Set<Long> resolveReceiptIds(List<ProductUnit> units) {
        var itemIds = units.stream().map(ProductUnit::getImportReceiptItemId).collect(Collectors.toSet());
        return importReceiptItemRepository.findAllById(itemIds).stream()
                .map(ImportReceiptItem::getReceiptId)
                .collect(Collectors.toSet());
    }

    private Map<Long, String> fetchReceiptCodes(List<Box> boxes) {
        var ids = boxes.stream().map(Box::getImportReceiptId).filter(java.util.Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) return Map.of();
        return importReceiptRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(ImportReceipt::getId, ImportReceipt::getReceiptCode));
    }

    private Map<Long, String> fetchLocations(List<Box> boxes) {
        var ids = boxes.stream().map(Box::getLocationId).distinct().toList();
        return locationRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(l -> l.getId(), l -> l.getFullCode()));
    }

    private Map<Long, String> fetchUserNames(List<Box> boxes) {
        var ids = new ArrayList<Long>();
        boxes.forEach(b -> {
            if (b.getCreatedBy() != null) ids.add(b.getCreatedBy());
            if (b.getSealedBy() != null) ids.add(b.getSealedBy());
            if (b.getUnsealedBy() != null) ids.add(b.getUnsealedBy());
        });
        return userRepository.findAllById(ids.stream().distinct().toList()).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
    }

    private BoxResponse toResponse(Box box, Map<Long, String> locationMap, Map<Long, String> userMap, Map<Long, String> receiptCodeMap, List<ProductUnit> units, int unitCount) {
        Map<Long, Product> productMap = units == null || units.isEmpty() ? Map.of()
                : productRepository.findAllById(units.stream()
                        .map(ProductUnit::getProductId).distinct().toList()).stream()
                        .collect(Collectors.toMap(Product::getId, p -> p));
        List<BoxResponse.BoxUnitResponse> unitResponses = units == null ? List.of() : units.stream().map(u -> {
            Product p = productMap.get(u.getProductId());
            return BoxResponse.BoxUnitResponse.builder()
                    .productUnitId(u.getId())
                    .serialNumber(u.getSerialNumber())
                    .productId(u.getProductId())
                    .productName(p == null ? null : p.getName())
                    .productSku(p == null ? null : p.getSku())
                    .trackingType(u.getTrackingType())
                    .quantity(TrackingType.BULK.name().equals(u.getTrackingType())
                            ? u.getRemainingQuantity() : BigDecimal.ONE)
                    .build();
        }).toList();
        return BoxResponse.builder()
                .id(box.getId())
                .boxCode(box.getBoxCode())
                .importReceiptId(box.getImportReceiptId())
                .importReceiptCode(getOrNull(receiptCodeMap, box.getImportReceiptId()))
                .boxType(box.getBoxType() == null ? null : box.getBoxType().name())
                .locationId(box.getLocationId())
                .locationCode(locationMap.get(box.getLocationId()))
                .status(box.getStatus().name())
                .sealedQuantity(box.getSealedQuantity())
                .sealedBy(box.getSealedBy())
                .sealedByName(getOrNull(userMap, box.getSealedBy()))
                .sealedAt(box.getSealedAt())
                .unsealedBy(box.getUnsealedBy())
                .unsealedByName(getOrNull(userMap, box.getUnsealedBy()))
                .unsealedAt(box.getUnsealedAt())
                .note(box.getNote())
                .createdBy(box.getCreatedBy())
                .createdByName(getOrNull(userMap, box.getCreatedBy()))
                .createdAt(box.getCreatedAt())
                .unitCount(unitCount)
                .units(unitResponses)
                .build();
    }

    private static <K, V> V getOrNull(Map<K, V> map, K key) {
        return key == null ? null : map.get(key);
    }
}
