package org.dawn.backend.controller.catalog;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.controller.catalog.request.CategoryRequest;
import org.dawn.backend.controller.catalog.response.CategoryResponse;
import org.dawn.backend.service.catalog.CategoryService;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/category")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping("")
    public ResponseObject<ResponsePage<CategoryResponse>> getAll(Pageable pageable) {
        return ResponseObject.success(categoryService.findAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseObject<CategoryResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(categoryService.findOne(id));
    }

    @PostMapping("")
    public ResponseObject<CategoryResponse> create(@RequestBody CategoryRequest request) {
        return ResponseObject.created(categoryService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseObject<CategoryResponse> update(@PathVariable Long id, @RequestBody CategoryRequest request) {
        return ResponseObject.success(categoryService.update(id, request));
    }

    @PutMapping("/{id}/toggle-active")
    public ResponseObject<CategoryResponse> toggleActive(@PathVariable Long id) {
        return ResponseObject.success(categoryService.toggleActive(id));
    }
}
