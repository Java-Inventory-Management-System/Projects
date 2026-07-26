package org.dawn.backend.controller.inventory;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.security.AuthorizationExpressions;
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
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<ResponsePage<StockCheckResponse>> getMyStockChecks(
            Pageable pageable,
            @RequestParam(required = false) String status) {
        return ResponseObject.success(stockCheckService.findMyChecks(pageable, status));
    }

    @GetMapping("/stock-check")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_REPORTS)
    public ResponseObject<ResponsePage<StockCheckResponse>> getAll(
            Pageable pageable,
            @RequestParam(required = false) String status) {
        return ResponseObject.success(stockCheckService.findAll(pageable, status));
    }

    @GetMapping("/stock-check/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<StockCheckResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(stockCheckService.findOne(id));
    }

    @PostMapping("/stock-check")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<StockCheckResponse> create(@RequestBody CreateStockCheckRequest request) {
        return ResponseObject.created(stockCheckService.create(request));
    }

    @PutMapping("/stock-check/{id}/items")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<StockCheckResponse> recordItems(
            @PathVariable Long id,
            @RequestBody StockCheckItemRequest.BatchRequest request) {
        return ResponseObject.success(stockCheckService.recordItems(id, request));
    }

    @PutMapping("/stock-check/{id}/complete")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<StockCheckResponse> complete(@PathVariable Long id) {
        return ResponseObject.success(stockCheckService.complete(id));
    }

    @PutMapping("/stock-check/{id}/approve")
    @PreAuthorize(AuthorizationExpressions.CAN_APPROVE)
    public ResponseObject<StockCheckResponse> approve(
            @PathVariable Long id,
            @RequestBody(required = false) ApproveStockCheckRequest request) {
        return ResponseObject.success(stockCheckService.approve(id, request));
    }

    @PutMapping("/stock-check/{id}/reject")
    @PreAuthorize(AuthorizationExpressions.CAN_APPROVE)
    public ResponseObject<StockCheckResponse> reject(
            @PathVariable Long id,
            @RequestBody(required = false) ApproveStockCheckRequest request) {
        return ResponseObject.success(stockCheckService.reject(id, request));
    }
}
