package org.dawn.backend.controller.catalog;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.catalog.request.DefectCategoryRequest;
import org.dawn.backend.controller.catalog.response.DefectCategoryResponse;
import org.dawn.backend.service.catalog.DefectCategoryService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/defect-categories")
@RequiredArgsConstructor
public class DefectCategoryController {

    private final DefectCategoryService defectCategoryService;

    @GetMapping("")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<List<DefectCategoryResponse>> getAll() {
        return ResponseObject.success(defectCategoryService.findAll());
    }

    @PostMapping("")
    @PreAuthorize(AuthorizationExpressions.CAN_MANAGE_CATALOG)
    public ResponseObject<DefectCategoryResponse> create(@RequestBody DefectCategoryRequest request) {
        return ResponseObject.created(defectCategoryService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_MANAGE_CATALOG)
    public ResponseObject<DefectCategoryResponse> update(@PathVariable Long id,
                                                         @RequestBody DefectCategoryRequest request) {
        return ResponseObject.success(defectCategoryService.update(id, request));
    }

    @PutMapping("/{id}/toggle-active")
    @PreAuthorize(AuthorizationExpressions.CAN_MANAGE_CATALOG)
    public ResponseObject<DefectCategoryResponse> toggleActive(@PathVariable Long id) {
        return ResponseObject.success(defectCategoryService.toggleActive(id));
    }
}