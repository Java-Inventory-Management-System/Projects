package org.dawn.backend.controller.catalog;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.controller.catalog.request.ProductRequest;
import org.dawn.backend.controller.catalog.response.ProductResponse;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.service.catalog.ProductService;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/product")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping("")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<ResponsePage<ProductResponse>> getAll(
            Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long brandId,
            @RequestParam(required = false) Long categoryId) {
        return ResponseObject.success(productService.findAll(pageable, search, brandId, categoryId));
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<ProductResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(productService.findOne(id));
    }

    @PostMapping("")
    @PreAuthorize(AuthorizationExpressions.CAN_MANAGE_CATALOG)
    public ResponseObject<ProductResponse> create(@RequestBody ProductRequest request) {
        return ResponseObject.created(productService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_MANAGE_CATALOG)
    public ResponseObject<ProductResponse> update(@PathVariable Long id, @RequestBody ProductRequest request) {
        return ResponseObject.success(productService.update(id, request));
    }

    @PutMapping("/{id}/toggle-active")
    @PreAuthorize(AuthorizationExpressions.CAN_MANAGE_CATALOG)
    public ResponseObject<ProductResponse> toggleActive(@PathVariable Long id) {
        return ResponseObject.success(productService.toggleActive(id));
    }
}
