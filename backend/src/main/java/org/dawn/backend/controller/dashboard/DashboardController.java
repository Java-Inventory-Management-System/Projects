package org.dawn.backend.controller.dashboard;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.dashboard.response.DashboardResponse;
import org.dawn.backend.service.dashboard.DashboardService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER_ADMIN)
    public ResponseObject<DashboardResponse> getStats() {
        return ResponseObject.success(dashboardService.getStats());
    }
}
