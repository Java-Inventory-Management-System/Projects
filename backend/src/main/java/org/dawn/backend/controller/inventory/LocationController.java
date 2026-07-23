package org.dawn.backend.controller.inventory;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.inventory.request.LocationRequest;
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
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER_ADMIN_STOCK)
    public ResponseObject<ResponsePage<LocationResponse>> getAll(Pageable pageable) {
        return ResponseObject.success(locationService.findAll(pageable));
    }

    @GetMapping("/search")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER_ADMIN_STOCK)
    public ResponseObject<ResponsePage<LocationResponse>> search(@RequestParam String keyword, Pageable pageable) {
        return ResponseObject.success(locationService.search(keyword, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER_ADMIN_STOCK)
    public ResponseObject<LocationResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(locationService.findOne(id));
    }

    @PostMapping("")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<LocationResponse> create(@Valid @RequestBody LocationRequest request) {
        return ResponseObject.created(locationService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<LocationResponse> update(@PathVariable Long id, @RequestBody LocationRequest request) {
        return ResponseObject.success(locationService.update(id, request));
    }

    @GetMapping("/map")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER_ADMIN_STOCK)
    public ResponseObject<LocationMapResponse> getMap() {
        return ResponseObject.success(locationService.getMap());
    }

    @PutMapping("/{id}/toggle-active")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<LocationResponse> toggleActive(@PathVariable Long id) {
        return ResponseObject.success(locationService.toggleActive(id));
    }
}
