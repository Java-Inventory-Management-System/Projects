package org.dawn.backend.controller.inventory;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.controller.inventory.request.ExportReceiptRequest;
import org.dawn.backend.controller.inventory.response.ExportReceiptResponse;
import org.dawn.backend.service.inventory.ExportReceiptService;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class ExportReceiptController {

    private final ExportReceiptService exportReceiptService;

    @GetMapping("/export-receipt")
    public ResponseObject<ResponsePage<ExportReceiptResponse>> getAll(Pageable pageable) {
        return ResponseObject.success(exportReceiptService.findAll(pageable));
    }

    @GetMapping("/export-receipt/{id}")
    public ResponseObject<ExportReceiptResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(exportReceiptService.findOne(id));
    }

    @PostMapping("/export-receipt")
    @PreAuthorize("hasAnyRole('MANAGER', 'STOCK')")
    public ResponseObject<ExportReceiptResponse> create(@RequestBody ExportReceiptRequest request) {
        return ResponseObject.created(exportReceiptService.create(request));
    }

    @PutMapping("/export-receipt/{id}/approve")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseObject<ExportReceiptResponse> approve(@PathVariable Long id) {
        return ResponseObject.success(exportReceiptService.approve(id));
    }

    @PutMapping("/export-receipt/{id}/cancel")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseObject<ExportReceiptResponse> cancel(@PathVariable Long id) {
        return ResponseObject.success(exportReceiptService.cancel(id));
    }
}
