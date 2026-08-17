package org.dawn.backend.controller.inventory;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.inventory.request.ReturnReceiptRequest;
import org.dawn.backend.controller.inventory.response.ReturnReceiptResponse;
import org.dawn.backend.service.inventory.returns.ReturnReceiptService;
import org.dawn.backend.service.inventory.ReceiptPrintService;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/return-receipts")
@RequiredArgsConstructor
public class ReturnReceiptController {

    private final ReturnReceiptService returnReceiptService;
    private final ReceiptPrintService receiptPrintService;

    @GetMapping(value = "/{id}/print")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseEntity<byte[]> print(@PathVariable Long id,
            @RequestParam(defaultValue = "vi") String lang,
            @RequestParam(defaultValue = "pdf") String format) {
        ReceiptPrintService.PrintFile f = receiptPrintService.printReturnFile(id, lang, format);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(f.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ("excel".equalsIgnoreCase(format) ? "attachment" : "inline") + "; filename=\"" + f.filename() + "\"")
                .body(f.bytes());
    }

    @GetMapping("")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<ResponsePage<ReturnReceiptResponse>> findAll(Pageable pageable,
                                                                        @RequestParam(required = false) String status,
                                                                        @RequestParam(required = false) String reason,
                                                                        @RequestParam(required = false) String search,
                                                                        @RequestParam(required = false) Long createdBy) {
        return ResponseObject.success(returnReceiptService.findAll(pageable, status, reason, search, createdBy));
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<ReturnReceiptResponse> findOne(@PathVariable Long id) {
        return ResponseObject.success(returnReceiptService.findOne(id));
    }

    @PostMapping("")
    @PreAuthorize(AuthorizationExpressions.CAN_CREATE_TRANSACTION)
    public ResponseObject<ReturnReceiptResponse> create(@RequestBody ReturnReceiptRequest request) {
        return ResponseObject.success(returnReceiptService.create(request));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize(AuthorizationExpressions.CAN_APPROVE)
    public ResponseObject<ReturnReceiptResponse> approve(@PathVariable Long id) {
        return ResponseObject.success(returnReceiptService.approve(id));
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize(AuthorizationExpressions.CAN_APPROVE)
    public ResponseObject<ReturnReceiptResponse> cancel(@PathVariable Long id) {
        return ResponseObject.success(returnReceiptService.cancel(id));
    }

    @GetMapping("/lookup-unit")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<ReturnReceiptService.ProductUnitLookup> lookupUnit(
            @RequestParam String serial, @RequestParam Long exportReceiptId) {
        return ResponseObject.success(returnReceiptService.lookupUnitBySerial(serial, exportReceiptId));
    }
}
