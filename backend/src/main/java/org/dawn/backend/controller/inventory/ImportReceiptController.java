package org.dawn.backend.controller.inventory;

import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.inventory.request.ConfirmImportRequest;
import org.dawn.backend.controller.inventory.request.ImportReceiptRequest;
import org.dawn.backend.controller.inventory.response.ImportReceiptResponse;
import org.dawn.backend.controller.inventory.response.ProductUnitResponse;
import org.dawn.backend.service.inventory.ImportReceiptService;
import org.dawn.backend.service.inventory.ProductUnitService;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class ImportReceiptController {

    private final ImportReceiptService importReceiptService;
    private final ProductUnitService productUnitService;

    @GetMapping("/import-receipt")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<ResponsePage<ImportReceiptResponse>> getAll(Pageable pageable, @RequestParam(required = false) String status) {
        return ResponseObject.success(importReceiptService.findAll(pageable, status));
    }

    @GetMapping("/import-receipt/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<ImportReceiptResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(importReceiptService.findOne(id));
    }

    @PostMapping("/import-receipt")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<ImportReceiptResponse> create(@RequestBody ImportReceiptRequest request) {
        return ResponseObject.created(importReceiptService.create(request));
    }

    @PutMapping("/import-receipt/{id}/confirm")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<ImportReceiptResponse> confirm(@PathVariable Long id, @RequestBody ConfirmImportRequest request) {
        return ResponseObject.success(importReceiptService.confirm(id, request));
    }

    @PutMapping("/import-receipt/{id}/approve")
    @PreAuthorize(AuthorizationExpressions.CAN_APPROVE)
    public ResponseObject<ImportReceiptResponse> approve(@PathVariable Long id) {
        return ResponseObject.success(importReceiptService.approve(id));
    }

    @PutMapping("/import-receipt/{id}/cancel")
    @PreAuthorize(AuthorizationExpressions.CAN_APPROVE)
    public ResponseObject<ImportReceiptResponse> cancel(@PathVariable Long id) {
        return ResponseObject.success(importReceiptService.cancel(id));
    }

    @GetMapping("/import-receipt/{id}/units")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<List<ProductUnitResponse>> getUnits(@PathVariable Long id) {
        return ResponseObject.success(importReceiptService.getUnitsByReceipt(id));
    }

    @GetMapping("/product-unit")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<ResponsePage<ProductUnitResponse>> getProductUnits(Pageable pageable) {
        return ResponseObject.success(productUnitService.findAll(pageable));
    }

    @GetMapping("/product-unit/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<ProductUnitResponse> getProductUnit(@PathVariable Long id) {
        return ResponseObject.success(productUnitService.findOne(id));
    }

    @GetMapping("/product-unit/status/{status}")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<ResponsePage<ProductUnitResponse>> getByStatus(@PathVariable String status, Pageable pageable) {
        return ResponseObject.success(productUnitService.findByStatus(status, pageable));
    }

    @GetMapping("/product-unit/product/{productId}")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<ResponsePage<ProductUnitResponse>> getByProduct(@PathVariable Long productId, Pageable pageable) {
        return ResponseObject.success(productUnitService.findByProduct(productId, pageable));
    }
}
