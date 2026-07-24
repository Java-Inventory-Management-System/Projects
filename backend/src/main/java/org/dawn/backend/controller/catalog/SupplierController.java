package org.dawn.backend.controller.catalog;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.catalog.request.SupplierRequest;
import org.dawn.backend.controller.catalog.response.SupplierResponse;
import org.dawn.backend.service.catalog.SupplierService;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/supplier")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    @GetMapping("")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<ResponsePage<SupplierResponse>> getAll(Pageable pageable) {
        return ResponseObject.success(supplierService.findAll(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<SupplierResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(supplierService.findOne(id));
    }

    @PostMapping("")
    @PreAuthorize(AuthorizationExpressions.CAN_MANAGE_CATALOG)
    public ResponseObject<SupplierResponse> create(@Valid @RequestBody SupplierRequest request) {
        return ResponseObject.created(supplierService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_MANAGE_CATALOG)
    public ResponseObject<SupplierResponse> update(@PathVariable Long id, @RequestBody SupplierRequest request) {
        return ResponseObject.success(supplierService.update(id, request));
    }

    @PutMapping("/{id}/toggle-active")
    @PreAuthorize(AuthorizationExpressions.CAN_MANAGE_CATALOG)
    public ResponseObject<SupplierResponse> toggleActive(@PathVariable Long id) {
        return ResponseObject.success(supplierService.toggleActive(id));
    }
}
