package org.dawn.backend.controller.inventory;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.inventory.request.CreateStockCheckRequest;
import org.dawn.backend.controller.inventory.request.StockCheckItemRequest;
import org.dawn.backend.controller.inventory.request.StockCheckScheduleRequest;
import org.dawn.backend.controller.inventory.response.StockCheckResponse;
import org.dawn.backend.controller.inventory.response.StockCheckScheduleResponse;
import org.dawn.backend.controller.inventory.response.StockCheckZoneStatusResponse;
import org.dawn.backend.service.inventory.stockcheck.StockCheckService;
import org.dawn.backend.service.inventory.ReceiptPrintService;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class StockCheckController {

    private final StockCheckService stockCheckService;
    private final ReceiptPrintService receiptPrintService;

    @GetMapping(value = "/stock-check/{id}/print", produces = MediaType.TEXT_HTML_VALUE)
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public String print(@PathVariable Long id, @RequestParam(defaultValue = "vi") String lang) {
        return receiptPrintService.printStockCheck(id, lang);
    }

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

    @GetMapping("/stock-check/count")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<Long> count() {
        return ResponseObject.success(stockCheckService.countPendingChecks());
    }

    @GetMapping("/stock-check/zone-status")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<StockCheckZoneStatusResponse> zoneStatus() {
        return ResponseObject.success(stockCheckService.zoneStatus());
    }

    @GetMapping("/stock-check/scope-unit-count")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
public ResponseObject<Integer> countUnitsInScope(
            @RequestParam String scopeType,
            @RequestParam Long scopeId,
            @RequestParam(required = false) String shelfCodes) {
        return ResponseObject.success(stockCheckService.countUnitsInScope(scopeType, scopeId, shelfCodes));
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

    @PutMapping("/stock-check/{id}/start")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<StockCheckResponse> start(@PathVariable Long id) {
        return ResponseObject.success(stockCheckService.start(id));
    }

@PutMapping("/stock-check/{id}/items")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<StockCheckResponse> recordItems(
            @PathVariable Long id,
            @RequestBody StockCheckItemRequest.BatchRequest request) {
        return ResponseObject.success(stockCheckService.recordItems(id, request));
    }

    @PostMapping("/stock-check/{id}/extra-items")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<StockCheckResponse> addExtraItem(
            @PathVariable Long id,
            @RequestBody StockCheckItemRequest.ExtraItemRequest request) {
        return ResponseObject.created(stockCheckService.addExtraItem(id, request));
    }

    @PutMapping("/stock-check/{id}/reopen")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<StockCheckResponse> reopen(@PathVariable Long id) {
        return ResponseObject.success(stockCheckService.reopen(id));
    }

@PutMapping("/stock-check/{id}/complete")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<StockCheckResponse> complete(@PathVariable Long id) {
        return ResponseObject.success(stockCheckService.complete(id));
    }

    @PutMapping("/stock-check/{id}/cancel")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<StockCheckResponse> cancel(@PathVariable Long id) {
        return ResponseObject.success(stockCheckService.cancel(id));
    }

    @GetMapping("/stock-check/schedules")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_REPORTS)
    public ResponseObject<List<StockCheckScheduleResponse>> getSchedules() {
        return ResponseObject.success(stockCheckService.findSchedules());
    }

    @PostMapping("/stock-check/schedules")
    @PreAuthorize(AuthorizationExpressions.CAN_MANAGE_CATALOG)
    public ResponseObject<StockCheckScheduleResponse> createSchedule(@RequestBody StockCheckScheduleRequest request) {
        return ResponseObject.created(stockCheckService.createSchedule(request));
    }

    @PutMapping("/stock-check/schedules/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_MANAGE_CATALOG)
    public ResponseObject<StockCheckScheduleResponse> updateSchedule(
            @PathVariable Long id,
            @RequestBody StockCheckScheduleRequest request) {
        return ResponseObject.success(stockCheckService.updateSchedule(id, request));
    }

    @DeleteMapping("/stock-check/schedules/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_MANAGE_CATALOG)
    public ResponseObject<Void> deleteSchedule(@PathVariable Long id) {
        stockCheckService.deleteSchedule(id);
        return ResponseObject.success(null);
    }
}
