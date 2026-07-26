package org.dawn.backend.service.inventory;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.dawn.backend.config.anno.AuditLog;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.shared.LogConstant;
import org.dawn.backend.constant.shared.Message;
import org.dawn.backend.controller.inventory.request.LocationRequest;
import org.dawn.backend.controller.inventory.response.LocationMapResponse;
import org.dawn.backend.controller.inventory.response.LocationMapResponse.ZoneData;
import org.dawn.backend.controller.inventory.response.LocationMapResponse.ShelfData;
import org.dawn.backend.controller.inventory.response.LocationMapResponse.BinData;
import org.dawn.backend.controller.inventory.response.LocationResponse;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.exception.wrapper.InvalidRequestException;
import org.dawn.backend.exception.wrapper.ResourceAlreadyExistedException;
import org.dawn.backend.exception.wrapper.ResourceNotFoundException;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LocationService {

    private final LocationRepository locationRepository;
    private final ProductUnitRepository productUnitRepository;

    @Transactional(readOnly = true)
    public LocationMapResponse getMap() {
        var locations = locationRepository.findAllByOrderByZoneCodeAscShelfCodeAscBinCodeAsc();
        var counts = productUnitRepository.countByLocation();

        Map<String, List<Location>> byZone = locations.stream()
            .collect(Collectors.groupingBy(Location::getZoneCode, LinkedHashMap::new, Collectors.toList()));

        List<ZoneData> zones = byZone.entrySet().stream().map(entry -> {
            String zoneCode = entry.getKey();
            Map<String, List<Location>> byShelf = entry.getValue().stream()
                .collect(Collectors.groupingBy(Location::getShelfCode, LinkedHashMap::new, Collectors.toList()));
            List<ShelfData> shelves = byShelf.entrySet().stream().map(shelfEntry -> {
                List<BinData> bins = shelfEntry.getValue().stream().map(loc -> {
                    Long mc = loc.getMaxCapacity() != null ? loc.getMaxCapacity().longValue() : null;
                    return new BinData(loc.getId(), loc.getBinCode(), loc.getFullCode(), counts.getOrDefault(loc.getId(), 0L), mc);
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
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.LOCATION_NOT_FOUND));
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
            throw new ResourceAlreadyExistedException(Message.Inventory.LOCATION_CODE_EXISTS);
        }
        Location location = Location.builder()
                .zoneCode(request.zoneCode().trim().toUpperCase())
                .shelfCode(request.shelfCode().trim())
                .binCode(request.binCode().trim().toUpperCase())
                .fullCode(fullCode)
                .description(request.description())
                .build();
        return LocationMappingHelper.map(locationRepository.save(location));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.UPDATE_LOCATION, entity = LogConstant.Entity.LOCATION, entityClass = Location.class)
    public LocationResponse update(Long id, LocationRequest request) {
        Location location = locationRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.LOCATION_NOT_FOUND));
        if (request.zoneCode() != null) location.setZoneCode(request.zoneCode().trim().toUpperCase());
        if (request.shelfCode() != null) location.setShelfCode(request.shelfCode().trim());
        if (request.binCode() != null) location.setBinCode(request.binCode().trim().toUpperCase());
        location.setFullCode(location.getZoneCode() + "-" + location.getShelfCode() + "-" + location.getBinCode());
        if (request.description() != null) location.setDescription(request.description());
        return LocationMappingHelper.map(locationRepository.save(location));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.TOGGLE_LOCATION, entity = LogConstant.Entity.LOCATION, entityClass = Location.class)
    public LocationResponse toggleActive(Long id) {
        Location location = locationRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.LOCATION_NOT_FOUND));
        location.setIsActive(!Boolean.TRUE.equals(location.getIsActive()));
        return LocationMappingHelper.map(locationRepository.save(location));
    }

    @Transactional
    @AuditLog(action = LogConstant.Action.DELETE_LOCATION, entity = LogConstant.Entity.LOCATION, entityClass = Location.class)
    public void delete(Long id) {
        Location location = locationRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Message.Inventory.LOCATION_NOT_FOUND));
        long productCount = productUnitRepository.countByLocationId(id);
        if (productCount > 0) {
            throw new InvalidRequestException(Message.format(Message.Inventory.CANNOT_DELETE_LOCATION_WITH_UNITS, productCount));
        }
        locationRepository.delete(location);
    }
}
