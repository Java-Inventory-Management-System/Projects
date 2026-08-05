package org.dawn.backend.controller.report;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.report.response.*;
import org.dawn.backend.service.report.ReportService;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/report")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/inventory-summary")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_REPORTS)
    public ResponseObject<InventorySummaryResponse> getInventorySummary() {
        return ResponseObject.success(reportService.getInventorySummary());
    }

    @GetMapping("/inventory-by-category")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_REPORTS)
    public ResponseObject<List<CategoryStockResponse>> getStockByCategory() {
        return ResponseObject.success(reportService.getStockByCategory());
    }

    @GetMapping("/low-stock")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_INVENTORY)
    public ResponseObject<ResponsePage<LowStockResponse>> getLowStock(Pageable pageable) {
        return ResponseObject.success(reportService.getLowStock(pageable));
    }

    @GetMapping("/stock-value")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_REPORTS)
    public ResponseObject<List<StockValueResponse>> getStockValue() {
        return ResponseObject.success(reportService.getStockValue());
    }

    @GetMapping("/activity")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_REPORTS)
    public ResponseObject<List<ActivityResponse>> getActivity(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return ResponseObject.success(reportService.getActivity(from, to));
    }

    @GetMapping("/stock-check-overview")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_REPORTS)
    public ResponseObject<StockCheckOverviewResponse> getStockCheckOverview(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return ResponseObject.success(reportService.getStockCheckOverview(from, to));
    }

    @GetMapping("/dead-stock")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_REPORTS)
    public ResponseObject<ResponsePage<DeadStockResponse>> getDeadStock(
            @RequestParam(defaultValue = "90") int daysThreshold,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) Instant fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) Instant toDate,
            Pageable pageable) {
        return ResponseObject.success(reportService.getDeadStock(daysThreshold, keyword, categoryId, fromDate, toDate, pageable));
    }
}
