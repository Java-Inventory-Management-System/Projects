package org.dawn.backend.controller.inventory;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.controller.inventory.request.ApproveStockCheckRequest;
import org.dawn.backend.controller.inventory.request.CreateStockCheckRequest;
import org.dawn.backend.controller.inventory.request.StockCheckItemRequest;
import org.dawn.backend.controller.inventory.response.StockCheckResponse;
import org.dawn.backend.service.inventory.StockCheckService;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class StockCheckController {

    private final StockCheckService stockCheckService;

    @GetMapping("/stock-check/my")
    @PreAuthorize("hasAnyRole('STOCK', 'MANAGER', 'ADMIN')")
    public ResponseObject<ResponsePage<StockCheckResponse>> getMyStockChecks(Pageable pageable) {
        return ResponseObject.success(stockCheckService.findMyChecks(pageable));
    }

    @GetMapping("/stock-check")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseObject<ResponsePage<StockCheckResponse>> getAll(Pageable pageable) {
        return ResponseObject.success(stockCheckService.findAll(pageable));
    }

    @GetMapping("/stock-check/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN', 'STOCK')")
    public ResponseObject<StockCheckResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(stockCheckService.findOne(id));
    }

    @PostMapping("/stock-check")
    @PreAuthorize("hasAnyRole('MANAGER', 'STOCK')")
    public ResponseObject<StockCheckResponse> create(@RequestBody CreateStockCheckRequest request) {
        return ResponseObject.created(stockCheckService.create(request));
    }

    @PutMapping("/stock-check/{id}/items")
    @PreAuthorize("hasAnyRole('MANAGER', 'STOCK')")
    public ResponseObject<StockCheckResponse> recordItems(
            @PathVariable Long id,
            @RequestBody StockCheckItemRequest.BatchRequest request) {
        return ResponseObject.success(stockCheckService.recordItems(id, request));
    }

    @PutMapping("/stock-check/{id}/complete")
    @PreAuthorize("hasAnyRole('MANAGER', 'STOCK')")
    public ResponseObject<StockCheckResponse> complete(@PathVariable Long id) {
        return ResponseObject.success(stockCheckService.complete(id));
    }

    @PutMapping("/stock-check/{id}/approve")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseObject<StockCheckResponse> approve(
            @PathVariable Long id,
            @RequestBody(required = false) ApproveStockCheckRequest request) {
        return ResponseObject.success(stockCheckService.approve(id, request));
    }

    @PutMapping("/stock-check/{id}/reject")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseObject<StockCheckResponse> reject(
            @PathVariable Long id,
            @RequestBody(required = false) ApproveStockCheckRequest request) {
        return ResponseObject.success(stockCheckService.reject(id, request));
    }
}
