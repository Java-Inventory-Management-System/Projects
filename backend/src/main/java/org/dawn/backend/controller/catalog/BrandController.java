package org.dawn.backend.controller.catalog;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.catalog.request.BrandRequest;
import org.dawn.backend.controller.catalog.response.BrandResponse;
import org.dawn.backend.service.catalog.BrandService;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/brand")
@RequiredArgsConstructor
public class BrandController {

    private final BrandService brandService;

    @GetMapping("")
    @PreAuthorize(AuthorizationExpressions.ROLE_STOCK_MANAGER_ADMIN)
    public ResponseObject<ResponsePage<BrandResponse>> getAll(Pageable pageable) {
        return ResponseObject.success(brandService.findAll(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.ROLE_STOCK_MANAGER_ADMIN)
    public ResponseObject<BrandResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(brandService.findOne(id));
    }

    @PostMapping("")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<BrandResponse> create(@RequestBody BrandRequest request) {
        return ResponseObject.created(brandService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<BrandResponse> update(@PathVariable Long id, @RequestBody BrandRequest request) {
        return ResponseObject.success(brandService.update(id, request));
    }

    @PutMapping("/{id}/toggle-active")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<BrandResponse> toggleActive(@PathVariable Long id) {
        return ResponseObject.success(brandService.toggleActive(id));
    }
}
