package org.dawn.backend.controller.inventory;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.controller.inventory.request.ApproveAdjustmentRequest;
import org.dawn.backend.controller.inventory.request.CreateStockAdjustmentRequest;
import org.dawn.backend.controller.inventory.response.StockAdjustmentResponse;
import org.dawn.backend.service.inventory.StockAdjustmentService;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/stock-adjustment")
@RequiredArgsConstructor
public class StockAdjustmentController {

    private final StockAdjustmentService adjustmentService;

    @GetMapping("/my")
    public ResponseObject<ResponsePage<StockAdjustmentResponse>> getMyAdjustments(
            Pageable pageable,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status) {
        return ResponseObject.success(adjustmentService.findMyAdjustments(pageable, type, status));
    }

    @GetMapping
    public ResponseObject<ResponsePage<StockAdjustmentResponse>> getAll(
            Pageable pageable,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status) {
        return ResponseObject.success(adjustmentService.findAll(pageable, type, status));
    }

    @GetMapping("/{id}")
    public ResponseObject<StockAdjustmentResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(adjustmentService.findOne(id));
    }

    @PostMapping
    public ResponseObject<StockAdjustmentResponse> create(@RequestBody CreateStockAdjustmentRequest request) {
        return ResponseObject.created(adjustmentService.create(request));
    }

    @PutMapping("/{id}/approve")
    public ResponseObject<StockAdjustmentResponse> approve(
            @PathVariable Long id,
            @RequestBody(required = false) ApproveAdjustmentRequest request) {
        return ResponseObject.success(adjustmentService.approve(id, request));
    }

    @PutMapping("/{id}/reject")
    public ResponseObject<StockAdjustmentResponse> reject(
            @PathVariable Long id,
            @RequestBody(required = false) ApproveAdjustmentRequest request) {
        return ResponseObject.success(adjustmentService.reject(id, request));
    }
}
