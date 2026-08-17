package org.dawn.backend.controller.inventory;

import jakarta.validation.Valid;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.inventory.request.LocationRequest;
import org.dawn.backend.controller.inventory.request.RelocateRequest;
import org.dawn.backend.controller.inventory.response.LocationMapResponse;
import org.dawn.backend.controller.inventory.response.LocationResponse;
import org.dawn.backend.service.inventory.LocationService;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/location")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @GetMapping("")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<ResponsePage<LocationResponse>> getAll(Pageable pageable) {
        return ResponseObject.success(locationService.findAll(pageable));
    }

    @GetMapping("/search")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<ResponsePage<LocationResponse>> search(@RequestParam String keyword, Pageable pageable) {
        return ResponseObject.success(locationService.search(keyword, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<LocationResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(locationService.findOne(id));
    }

    @PostMapping("")
    @PreAuthorize(AuthorizationExpressions.MANAGE_LOCATION)
    public ResponseObject<LocationResponse> create(@Valid @RequestBody LocationRequest request) {
        return ResponseObject.created(locationService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.MANAGE_LOCATION)
    public ResponseObject<LocationResponse> update(@PathVariable Long id, @RequestBody LocationRequest request) {
        return ResponseObject.success(locationService.update(id, request));
    }

    @GetMapping("/map")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<LocationMapResponse> getMap() {
        return ResponseObject.success(locationService.getMap());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.MANAGE_LOCATION)
    public ResponseObject<Void> delete(@PathVariable Long id) {
        locationService.delete(id);
        return ResponseObject.success(null);
    }

    @PutMapping("/{id}/toggle-active")
    @PreAuthorize(AuthorizationExpressions.MANAGE_LOCATION)
    public ResponseObject<LocationResponse> toggleActive(@PathVariable Long id) {
        return ResponseObject.success(locationService.toggleActive(id));
    }

    @PostMapping("/relocate")
    @PreAuthorize(AuthorizationExpressions.MANAGE_LOCATION)
    public ResponseObject<Void> relocate(@Valid @RequestBody RelocateRequest request) {
        locationService.relocate(request);
        return ResponseObject.success(null);
    }
}
