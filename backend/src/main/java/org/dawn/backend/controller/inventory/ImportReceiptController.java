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
import org.dawn.backend.controller.inventory.response.BoxableImportResponse;
import org.dawn.backend.controller.inventory.response.ImportReceiptResponse;
import org.dawn.backend.controller.inventory.response.ProductUnitHistoryResponse;
import org.dawn.backend.controller.inventory.response.ProductUnitResponse;
import org.dawn.backend.service.inventory.imports.ImportConfirmationService;
import org.dawn.backend.service.inventory.imports.ImportReceiptService;
import org.dawn.backend.service.inventory.imports.ImportWorkflowService;
import org.dawn.backend.service.inventory.ProductUnitService;
import org.dawn.backend.service.inventory.ReceiptPrintService;
import org.springframework.http.MediaType;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class ImportReceiptController {

    private final ImportReceiptService importReceiptService;
    private final ImportConfirmationService importConfirmationService;
    private final ImportWorkflowService importWorkflowService;
    private final ProductUnitService productUnitService;
    private final ReceiptPrintService receiptPrintService;

    @GetMapping(value = "/import-receipt/{id}/print", produces = MediaType.TEXT_HTML_VALUE)
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public String print(@PathVariable Long id, @RequestParam(defaultValue = "vi") String lang) {
        return receiptPrintService.printImport(id, lang);
    }

    @GetMapping("/import-receipt")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<ResponsePage<ImportReceiptResponse>> getAll(Pageable pageable, @RequestParam(required = false) String status, @RequestParam(required = false, defaultValue = "false") boolean unresolved) {
        return ResponseObject.success(importReceiptService.findAll(pageable, status, unresolved));
    }

    @GetMapping("/import-receipt/boxable")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<List<BoxableImportResponse>> getBoxable() {
        return ResponseObject.success(importReceiptService.getBoxableImports());
    }

    @GetMapping("/import-receipt/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<ImportReceiptResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(importReceiptService.findOne(id));
    }

    @PostMapping("/import-receipt")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<ImportReceiptResponse> create(@RequestBody ImportReceiptRequest request) {
        if (request.originalWarrantyExportId() != null) {
            return ResponseObject.created(importConfirmationService.createAndConfirm(request));
        }
        return ResponseObject.created(importReceiptService.create(request));
    }

    @PutMapping("/import-receipt/{id}/confirm")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<ImportReceiptResponse> confirm(@PathVariable Long id, @RequestBody ConfirmImportRequest request) {
        return ResponseObject.success(importConfirmationService.confirm(id, request));
    }

    @PutMapping("/import-receipt/{id}/reject")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<ImportReceiptResponse> reject(@PathVariable Long id,
                                                       @RequestBody org.dawn.backend.controller.inventory.request.RejectImportRequest request) {
        return ResponseObject.success(importWorkflowService.reject(id, request.reason(), request.evidenceImageUrl()));
    }

    @PutMapping("/import-receipt/{id}/resolve")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<ImportReceiptResponse> resolve(@PathVariable Long id,
                                                       @RequestBody org.dawn.backend.controller.inventory.request.ResolveImportRequest request) {
        return ResponseObject.success(importWorkflowService.resolve(id, request.resolution(), request.note()));
    }

    @PutMapping("/import-receipt/{id}/cancel")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<ImportReceiptResponse> cancel(@PathVariable Long id) {
        return ResponseObject.success(importWorkflowService.cancel(id));
    }

    @GetMapping("/import-receipt/{id}/units")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<List<ProductUnitResponse>> getUnits(@PathVariable Long id) {
        return ResponseObject.success(importReceiptService.getUnitsByReceipt(id));
    }

    @GetMapping("/product-unit")
@PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
public ResponseObject<ResponsePage<ProductUnitResponse>> getProductUnits(
        Pageable pageable,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) Long productId) {
return ResponseObject.success(productUnitService.findFiltered(search, status, productId, pageable));
    }

    @GetMapping("/product-unit/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<ProductUnitResponse> getProductUnit(@PathVariable Long id) {
        return ResponseObject.success(productUnitService.findOne(id));
    }

    @GetMapping("/product-unit/{id}/history")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<ProductUnitHistoryResponse> getProductUnitHistory(@PathVariable Long id) {
        return ResponseObject.success(productUnitService.findHistory(id));
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
