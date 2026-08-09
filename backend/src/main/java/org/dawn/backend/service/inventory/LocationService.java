package org.dawn.backend.service.inventory;
import org.dawn.backend.constant.shared.ErrorCode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.aspect.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.enums.inventory.SourceType;
import org.dawn.backend.constant.enums.inventory.box.BoxStatus;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.controller.inventory.request.LocationRequest;
import org.dawn.backend.controller.inventory.request.RelocateRequest;
import org.dawn.backend.controller.inventory.response.LocationMapResponse;
import org.dawn.backend.controller.inventory.response.LocationMapResponse.ZoneData;
import org.dawn.backend.controller.inventory.response.LocationMapResponse.ShelfData;
import org.dawn.backend.controller.inventory.response.LocationMapResponse.BinData;
import org.dawn.backend.controller.inventory.response.LocationMapResponse.BinProduct;
import org.dawn.backend.controller.inventory.response.LocationResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.ProductUnitStatusLog;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.exception.type.ResourceAlreadyExistedException;
import org.dawn.backend.exception.type.ResourceNotFoundException;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.ProductUnitStatusLogRepository;
import org.dawn.backend.repository.inventory.box.BoxRepository;
import org.dawn.backend.entity.inventory.Box;
import org.dawn.backend.config.security.SecurityPolicy;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LocationService {

    private final LocationRepository locationRepository;
    private final ProductUnitRepository productUnitRepository;
    private final ProductRepository productRepository;
    private final ProductUnitStatusLogRepository productUnitStatusLogRepository;
    private final SecurityPolicy securityPolicy;
    private final LocationCapacityValidator capacityValidator;
    private final BoxRepository boxRepository;

    @Transactional(readOnly = true)
    public LocationMapResponse getMap() {
        var locations = locationRepository.findAllByOrderByZoneCodeAscShelfCodeAscBinCodeAsc();
        var counts = productUnitRepository.usageByLocation();
        var skuMap = productUnitRepository.findSkuByLocationId();
        var sealedBoxes = boxRepository.findByLocationIdInAndStatus(locations.stream().map(Location::getId).toList(), BoxStatus.SEALED);
        var boxMap = sealedBoxes.stream()
                .collect(Collectors.groupingBy(Box::getLocationId, LinkedHashMap::new, Collectors.toList()));
        var boxById = sealedBoxes.stream().collect(Collectors.toMap(Box::getId, b -> b, (a, b) -> a));

        var units = productUnitRepository.findInStockUnitsByLocationIdIn(locations.stream().map(Location::getId).toList());
        var products = productRepository.findAllById(units.stream().map(ProductUnit::getProductId).distinct().toList()).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        Map<Long, List<BinProduct>> productMap = units.stream()
                .collect(Collectors.groupingBy(ProductUnit::getLocationId, LinkedHashMap::new,
                        Collectors.groupingBy(ProductUnit::getProductId, LinkedHashMap::new,
                                Collectors.groupingBy(u -> boxById.containsKey(u.getBoxId()) ? u.getBoxId() : 0L, Collectors.toList()))))
                .entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, entry -> entry.getValue().entrySet().stream()
                        .flatMap(pe -> pe.getValue().entrySet().stream().map(bg -> {
                            List<ProductUnit> group = bg.getValue();
                            Product p = products.get(pe.getKey());
                            boolean bulk = "BULK".equals(group.get(0).getTrackingType());
                            long quantity = bulk
                                    ? group.stream().mapToLong(u -> u.getRemainingQuantity() != null ? u.getRemainingQuantity().longValue() : 0L).sum()
                                    : group.size();
                            List<String> serials = bulk ? List.of() : group.stream()
                                    .map(ProductUnit::getSerialNumber).filter(s -> s != null).toList();
                            Box box = bg.getKey() != 0L ? boxById.get(bg.getKey()) : null;
                            return new BinProduct(pe.getKey(),
                                    p != null ? p.getName() : null,
                                    p != null ? p.getSku() : null,
                                    group.get(0).getTrackingType(),
                                    quantity, serials,
                                    box != null ? box.getId() : null,
                                    box != null ? box.getBoxCode() : null,
                                    box != null && box.getBoxType() != null ? box.getBoxType().name() : null);
                        }))
                        .sorted(Comparator.comparing((BinProduct bp) -> bp.boxCode() == null ? "" : bp.boxCode())
                                .thenComparing(BinProduct::productId))
                        .toList()));

        Map<String, List<Location>> byZone = locations.stream()
            .collect(Collectors.groupingBy(Location::getZoneCode, LinkedHashMap::new, Collectors.toList()));

        List<ZoneData> zones = byZone.entrySet().stream().map(entry -> {
            String zoneCode = entry.getKey();
            Map<String, List<Location>> byShelf = entry.getValue().stream()
                .collect(Collectors.groupingBy(Location::getShelfCode, LinkedHashMap::new, Collectors.toList()));
            List<ShelfData> shelves = byShelf.entrySet().stream().map(shelfEntry -> {
                List<BinData> bins = shelfEntry.getValue().stream().map(loc -> {
                    Long mc = loc.getMaxCapacity() != null ? loc.getMaxCapacity().longValue() : null;
                    List<String> skus = skuMap.getOrDefault(loc.getId(), Collections.emptyList());
                    List<String> boxCodes = boxMap.getOrDefault(loc.getId(), Collections.emptyList()).stream()
                            .map(Box::getBoxCode).toList();
                    List<BinProduct> binProducts = productMap.getOrDefault(loc.getId(), Collections.emptyList());
                    return new BinData(loc.getId(), loc.getBinCode(), loc.getFullCode(), counts.getOrDefault(loc.getId(), BigDecimal.ZERO).longValue(), mc, skus, boxCodes.size(), boxCodes, binProducts);
                }).toList();
                return new ShelfData(shelfEntry.getKey(), bins);
            }).toList();
            return new ZoneData(zoneCode, shelves);
        }).toList();

        return new LocationMapResponse(zones);
    }

    @Transactional(readOnly = true)
    public ResponsePage<LocationResponse> findAll(Pageable pageable) {
        return ResponsePage.of(locationRepository
                .findAll(pageable)
                .map(LocationMappingHelper::map));
    }

    @Transactional(readOnly = true)
    public LocationResponse findOne(Long id) {
        return locationRepository
                .findById(id)
                .map(LocationMappingHelper::map)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.LOCATION_NOT_FOUND));
    }

    @Transactional(readOnly = true)
    public ResponsePage<LocationResponse> search(String keyword, Pageable pageable) {
        return ResponsePage.of(locationRepository
                .findByFullCodeContainingIgnoreCase(keyword, pageable)
                .map(LocationMappingHelper::map));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.CREATE_LOCATION, entity = LogConstant.Entity.LOCATION)
    public LocationResponse create(LocationRequest request) {
        String fullCode = request.zoneCode() + "-" + request.shelfCode() + "-" + request.binCode();
        if (locationRepository.existsByFullCode(fullCode)) {
            throw new ResourceAlreadyExistedException(ErrorCode.LOCATION_CODE_EXISTS);
        }
        Location location = Location.builder()
                .zoneCode(request.zoneCode().trim().toUpperCase())
                .shelfCode(request.shelfCode().trim())
                .binCode(request.binCode().trim().toUpperCase())
                .fullCode(fullCode)
                .description(request.description())
                .maxCapacity(request.maxCapacity())
                .build();
        return LocationMappingHelper.map(locationRepository.save(location));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.UPDATE_LOCATION, entity = LogConstant.Entity.LOCATION, entityClass = Location.class)
    public LocationResponse update(Long id, LocationRequest request) {
        Location location = locationRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.LOCATION_NOT_FOUND));
        if (request.zoneCode() != null) location.setZoneCode(request.zoneCode().trim().toUpperCase());
        if (request.shelfCode() != null) location.setShelfCode(request.shelfCode().trim());
        if (request.binCode() != null) location.setBinCode(request.binCode().trim().toUpperCase());
        location.setFullCode(location.getZoneCode() + "-" + location.getShelfCode() + "-" + location.getBinCode());
        if (request.description() != null) location.setDescription(request.description());
        if (request.maxCapacity() != null) location.setMaxCapacity(request.maxCapacity());
        return LocationMappingHelper.map(locationRepository.save(location));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.TOGGLE_LOCATION, entity = LogConstant.Entity.LOCATION, entityClass = Location.class)
    public LocationResponse toggleActive(Long id) {
        Location location = locationRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.LOCATION_NOT_FOUND));
        location.setIsActive(!Boolean.TRUE.equals(location.getIsActive()));
        return LocationMappingHelper.map(locationRepository.save(location));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.DELETE_LOCATION, entity = LogConstant.Entity.LOCATION, entityClass = Location.class)
    public void delete(Long id) {
        Location location = locationRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.LOCATION_NOT_FOUND));
        long productCount = productUnitRepository.countByLocationId(id);
        if (productCount > 0) {
            throw new InvalidRequestException(ErrorCode.CANNOT_DELETE_LOCATION_WITH_UNITS.format( productCount));
        }
        locationRepository.delete(location);
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.RELOCATE_LOCATION, entity = LogConstant.Entity.LOCATION)
    public void relocate(RelocateRequest request) {
        Long sourceId = request.sourceBinId();
        Long destId = request.destBinId();

        if (sourceId.equals(destId)) {
            throw new InvalidRequestException(ErrorCode.RELOCATE_SAME_BIN);
        }

        Location sourceLocation = locationRepository
                .findById(sourceId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.LOCATION_NOT_FOUND));
        Location destLocation = locationRepository
                .findById(destId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.LOCATION_NOT_FOUND));

        List<ProductUnit> units = productUnitRepository.findByLocationIdInAndStatusWithLock(
                List.of(sourceId), ProductUnitStatus.IN_STOCK);

        if (units.isEmpty()) {
            throw new InvalidRequestException(ErrorCode.SOURCE_BIN_EMPTY);
        }

        int quantity = request.quantity() != null ? request.quantity() : units.size();
        if (quantity <= 0 || quantity > units.size()) {
            throw new InvalidRequestException(ErrorCode.INVALID_QUANTITY.format( quantity));
        }

        List<ProductUnit> toMove = new ArrayList<>(quantity < units.size()
                ? units.subList(0, quantity)
                : units);

        Set<Long> boxIds = toMove.stream().map(ProductUnit::getBoxId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        if (!boxIds.isEmpty()) {
            Set<Long> selectedIds = toMove.stream().map(ProductUnit::getId).collect(Collectors.toSet());
            for (var boxed : productUnitRepository.findByBoxIdInAndStatus(List.copyOf(boxIds), ProductUnitStatus.IN_STOCK)) {
                if (!selectedIds.contains(boxed.getId())) {
                    toMove.add(boxed);
                }
            }
            for (var box : boxRepository.findByIdsForUpdate(List.copyOf(boxIds))) {
                box.setLocationId(destId);
            }
        }

        BigDecimal incoming = toMove.stream()
                .map(unit -> ProductUnitStatus.IN_STOCK.name().equals(unit.getStatus())
                        && "BULK".equals(unit.getTrackingType()) && unit.getRemainingQuantity() != null
                        ? unit.getRemainingQuantity() : BigDecimal.ONE)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        capacityValidator.assertCapacity(destId, incoming);

        long currentUserId = securityPolicy.requireAuthenticated();

        for (ProductUnit unit : toMove) {
            unit.setLocationId(destId);
        }
        productUnitRepository.saveAll(toMove);

        List<ProductUnitStatusLog> logs = toMove.stream().<ProductUnitStatusLog>map(unit ->
            ProductUnitStatusLog.builder()
                    .productUnitId(unit.getId())
                    .fromStatus(ProductUnitStatus.IN_STOCK.name())
                    .toStatus(ProductUnitStatus.IN_STOCK.name())
                    .sourceType(SourceType.RELOCATE.name())
                    .sourceId(destId)
                    .changedBy(currentUserId)
                    .build()
        ).toList();
        productUnitStatusLogRepository.saveAll(logs);

        log.info("Relocated {} units from location {} to location {}", toMove.size(), sourceId, destId);
    }
}
