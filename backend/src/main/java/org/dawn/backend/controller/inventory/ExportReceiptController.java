package org.dawn.backend.controller.inventory;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.inventory.request.ExportReceiptRequest;
import org.dawn.backend.controller.inventory.request.FulfillExportRequest;
import org.dawn.backend.controller.inventory.response.ExportReceiptResponse;
import org.dawn.backend.controller.inventory.response.ProductUnitResponse;
import org.dawn.backend.service.inventory.exports.ExportFulfillmentService;
import org.dawn.backend.service.inventory.exports.ExportReceiptService;
import org.dawn.backend.service.inventory.exports.ExportWorkflowService;
import org.dawn.backend.service.inventory.ReceiptPrintService;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class ExportReceiptController {

    private final ExportReceiptService exportReceiptService;
    private final ExportWorkflowService exportWorkflowService;
    private final ExportFulfillmentService exportFulfillmentService;
    private final ReceiptPrintService receiptPrintService;

    @GetMapping(value = "/export-receipt/{id}/print", produces = MediaType.TEXT_HTML_VALUE)
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public String print(@PathVariable Long id, @RequestParam(defaultValue = "vi") String lang) {
        return receiptPrintService.printExport(id, lang);
    }

    @GetMapping("/export-receipt")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<ResponsePage<ExportReceiptResponse>> getAll(Pageable pageable,
                                                                      @RequestParam(required = false) String status,
                                                                      @RequestParam(required = false) Long customerId) {
        return ResponseObject.success(exportReceiptService.findAll(pageable, status, customerId));
    }

    @GetMapping("/export-receipt/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<ExportReceiptResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(exportReceiptService.findOne(id));
    }

    @PostMapping("/export-receipt")
    @PreAuthorize(AuthorizationExpressions.CAN_CREATE_TRANSACTION)
    public ResponseObject<ExportReceiptResponse> create(@RequestBody ExportReceiptRequest request) {
        return ResponseObject.created(exportReceiptService.create(request));
    }

    @PutMapping("/export-receipt/{id}/fulfill")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<ExportReceiptResponse> fulfill(@PathVariable Long id, @RequestBody FulfillExportRequest request) {
        return ResponseObject.success(exportFulfillmentService.fulfill(id, request));
    }

    @PutMapping("/export-receipt/{id}/cancel")
    @PreAuthorize(AuthorizationExpressions.CAN_APPROVE)
    public ResponseObject<ExportReceiptResponse> cancel(@PathVariable Long id) {
        return ResponseObject.success(exportWorkflowService.cancel(id));
    }

    @GetMapping("/export-receipt/{id}/units")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<List<ProductUnitResponse>> getUnits(@PathVariable Long id,
                                                               @RequestParam(required = false) Long productId) {
        return ResponseObject.success(exportReceiptService.getUnitsByReceipt(id, productId));
    }
}
