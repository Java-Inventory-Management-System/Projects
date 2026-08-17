package org.dawn.backend.controller.inventory;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.inventory.request.MoveBoxRequest;
import org.dawn.backend.controller.inventory.request.SealBoxRequest;
import org.dawn.backend.controller.inventory.response.BoxResponse;
import org.dawn.backend.service.inventory.ReceiptPrintService;
import org.dawn.backend.service.inventory.box.BoxService;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class BoxController {

    private final BoxService boxService;
    private final ReceiptPrintService receiptPrintService;

    @GetMapping("/box")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<ResponsePage<BoxResponse>> getAll(
            @RequestParam(required = false) Long locationId,
            @RequestParam(required = false) String status,
            Pageable pageable) {
        return ResponseObject.success(boxService.findAll(locationId, status, pageable));
    }

    @GetMapping("/box/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<BoxResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(boxService.findOne(id));
    }

    @PostMapping("/box/seal")
    @PreAuthorize(AuthorizationExpressions.SEAL_BOX)
    public ResponseObject<BoxResponse> seal(@RequestBody SealBoxRequest request) {
        return ResponseObject.success(boxService.seal(request));
    }

    @PostMapping("/box/{id}/unseal")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<BoxResponse> unseal(@PathVariable Long id) {
        return ResponseObject.success(boxService.unseal(id));
    }

    @PostMapping("/box/{id}/move")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<BoxResponse> move(@PathVariable Long id, @RequestBody MoveBoxRequest request) {
        return ResponseObject.success(boxService.move(id, request));
    }

    @DeleteMapping("/box/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<Void> delete(@PathVariable Long id) {
        boxService.delete(id);
        return ResponseObject.deleted();
    }

    @GetMapping(value = "/box/{id}/print")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseEntity<byte[]> print(@PathVariable Long id,
            @RequestParam(defaultValue = "vi") String lang,
            @RequestParam(defaultValue = "pdf") String format) {
        ReceiptPrintService.PrintFile f = receiptPrintService.printBoxFile(id, lang, format);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(f.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ("excel".equalsIgnoreCase(format) ? "attachment" : "inline") + "; filename=\"" + f.filename() + "\"")
                .body(f.bytes());
    }
}
