package org.dawn.backend.controller.catalog;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.catalog.response.CategoryZoneResponse;
import org.dawn.backend.service.catalog.CategoryZoneService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/category-zone")
@RequiredArgsConstructor
public class CategoryZoneController {

    private final CategoryZoneService categoryZoneService;

    @GetMapping("")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<List<CategoryZoneResponse>> getAll() {
        return ResponseObject.success(categoryZoneService.getAll());
    }

    @GetMapping("/{categoryId}")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<CategoryZoneResponse> getByCategoryId(@PathVariable Long categoryId) {
        return ResponseObject.success(categoryZoneService.getByCategoryId(categoryId));
    }

    @GetMapping("/map")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<Map<Long, String>> getZoneMap() {
        return ResponseObject.success(categoryZoneService.getZoneMap());
    }
}
