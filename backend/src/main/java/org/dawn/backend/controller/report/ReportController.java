package org.dawn.backend.controller.report;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.report.response.CategoryStockResponse;
import org.dawn.backend.controller.report.response.InventorySummaryResponse;
import org.dawn.backend.controller.report.response.LowStockResponse;
import org.dawn.backend.service.report.ReportService;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/report")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/inventory-summary")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER_ADMIN)
    public ResponseObject<InventorySummaryResponse> getInventorySummary() {
        return ResponseObject.success(reportService.getInventorySummary());
    }

    @GetMapping("/inventory-by-category")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER_ADMIN)
    public ResponseObject<List<CategoryStockResponse>> getStockByCategory() {
        return ResponseObject.success(reportService.getStockByCategory());
    }

    @GetMapping("/low-stock")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER_ADMIN_STOCK)
    public ResponseObject<ResponsePage<LowStockResponse>> getLowStock(Pageable pageable) {
        return ResponseObject.success(reportService.getLowStock(pageable));
    }
}
