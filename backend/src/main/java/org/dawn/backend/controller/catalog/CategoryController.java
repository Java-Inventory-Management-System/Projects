package org.dawn.backend.controller.catalog;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.catalog.request.CategoryRequest;
import org.dawn.backend.controller.catalog.response.CategoryResponse;
import org.dawn.backend.service.catalog.CategoryService;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/category")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping("")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<ResponsePage<CategoryResponse>> getAll(Pageable pageable) {
        return ResponseObject.success(categoryService.findAll(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<CategoryResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(categoryService.findOne(id));
    }

    @PostMapping("")
    @PreAuthorize(AuthorizationExpressions.CAN_MANAGE_CATALOG)
    public ResponseObject<CategoryResponse> create(@Valid @RequestBody CategoryRequest request) {
        return ResponseObject.created(categoryService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_MANAGE_CATALOG)
    public ResponseObject<CategoryResponse> update(@PathVariable Long id, @RequestBody CategoryRequest request) {
        return ResponseObject.success(categoryService.update(id, request));
    }

    @PutMapping("/{id}/toggle-active")
    @PreAuthorize(AuthorizationExpressions.CAN_MANAGE_CATALOG)
    public ResponseObject<CategoryResponse> toggleActive(@PathVariable Long id) {
        return ResponseObject.success(categoryService.toggleActive(id));
    }
}
