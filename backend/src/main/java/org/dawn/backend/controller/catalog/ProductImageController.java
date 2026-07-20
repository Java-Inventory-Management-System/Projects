package org.dawn.backend.controller.catalog;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.catalog.request.ProductImageRequest;
import org.dawn.backend.controller.catalog.response.ProductImageResponse;
import org.dawn.backend.service.catalog.ProductImageService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/product-image")
@RequiredArgsConstructor
public class ProductImageController {

    private final ProductImageService productImageService;

    @GetMapping("/product/{productId}")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER_ADMIN)
    public ResponseObject<List<ProductImageResponse>> getByProductId(@PathVariable Long productId) {
        return ResponseObject.success(productImageService.findByProductId(productId));
    }

    @PostMapping("")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<ProductImageResponse> create(@RequestBody ProductImageRequest request) {
        return ResponseObject.created(productImageService.create(request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<Void> delete(@PathVariable Long id) {
        productImageService.delete(id);
        return ResponseObject.deleted();
    }

    @DeleteMapping("/product/{productId}")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<Void> deleteByProductId(@PathVariable Long productId) {
        productImageService.deleteByProductId(productId);
        return ResponseObject.deleted();
    }
}
