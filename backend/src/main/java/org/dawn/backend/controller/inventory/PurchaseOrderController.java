package org.dawn.backend.controller.inventory;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.inventory.request.CreatePurchaseOrderRequest;
import org.dawn.backend.controller.inventory.request.UpdatePurchaseOrderRequest;
import org.dawn.backend.controller.inventory.response.PurchaseOrderResponse;
import org.dawn.backend.service.inventory.PurchaseOrderService;
import org.dawn.backend.service.inventory.ReceiptPrintService;
import org.dawn.backend.service.inventory.imports.ImportReceiptService;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/purchase-order")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;
    private final ImportReceiptService importReceiptService;
    private final ReceiptPrintService receiptPrintService;

    @GetMapping(value = "/{id}/print")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseEntity<byte[]> print(@PathVariable Long id,
            @RequestParam(defaultValue = "vi") String lang,
            @RequestParam(defaultValue = "pdf") String format) {
        ReceiptPrintService.PrintFile f = receiptPrintService.printPoFile(id, lang, format);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(f.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ("excel".equalsIgnoreCase(format) ? "attachment" : "inline") + "; filename=\"" + f.filename() + "\"")
                .body(f.bytes());
    }

    @GetMapping
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<ResponsePage<PurchaseOrderResponse>> getAll(
            Pageable pageable,
            @RequestParam(required = false) String status) {
        return ResponseObject.success(purchaseOrderService.findAll(pageable, status));
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<PurchaseOrderResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(purchaseOrderService.findOne(id));
    }

    @GetMapping("/{id}/receipts")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<List<org.dawn.backend.controller.inventory.response.ImportReceiptResponse>> getReceipts(@PathVariable Long id) {
        return ResponseObject.success(importReceiptService.findByPurchaseOrderId(id));
    }

    @PostMapping
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<PurchaseOrderResponse> create(@RequestBody CreatePurchaseOrderRequest request) {
        return ResponseObject.created(purchaseOrderService.create(request));
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<PurchaseOrderResponse> cancel(@PathVariable Long id) {
        return ResponseObject.success(purchaseOrderService.cancel(id));
    }

    @PutMapping("/{id}/open")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<PurchaseOrderResponse> open(@PathVariable Long id,
                                                      @RequestParam(required = false) String asnCode) {
        return ResponseObject.success(purchaseOrderService.open(id, asnCode));
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<PurchaseOrderResponse> update(@PathVariable Long id,
                                                        @RequestBody UpdatePurchaseOrderRequest request) {
        return ResponseObject.success(purchaseOrderService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<Void> delete(@PathVariable Long id) {
        purchaseOrderService.delete(id);
        return ResponseObject.deleted();
    }
}
