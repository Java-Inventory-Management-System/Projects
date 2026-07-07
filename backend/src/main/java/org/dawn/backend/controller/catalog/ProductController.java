package org.dawn.backend.controller.catalog;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.controller.catalog.request.ProductRequest;
import org.dawn.backend.controller.catalog.response.ProductResponse;
import org.dawn.backend.service.catalog.ProductService;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/product")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping("")
    public ResponseObject<ResponsePage<ProductResponse>> getAll(Pageable pageable) {
        return ResponseObject.success(productService.findAll(pageable));
    }

    @GetMapping("/{id}")
    public ResponseObject<ProductResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(productService.findOne(id));
    }

    @PostMapping("")
    public ResponseObject<ProductResponse> create(@RequestBody ProductRequest request) {
        return ResponseObject.created(productService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseObject<ProductResponse> update(@PathVariable Long id, @RequestBody ProductRequest request) {
        return ResponseObject.success(productService.update(id, request));
    }

    @PutMapping("/{id}/toggle-active")
    public ResponseObject<ProductResponse> toggleActive(@PathVariable Long id) {
        return ResponseObject.success(productService.toggleActive(id));
    }
}
