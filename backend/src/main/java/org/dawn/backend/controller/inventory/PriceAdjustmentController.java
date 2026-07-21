package org.dawn.backend.controller.inventory;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.inventory.request.CreatePriceAdjustmentRequest;
import org.dawn.backend.controller.inventory.response.PriceAdjustmentResponse;
import org.dawn.backend.service.inventory.PriceAdjustmentService;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/price-adjustment")
@RequiredArgsConstructor
public class PriceAdjustmentController {

    private final PriceAdjustmentService priceAdjustmentService;

    @GetMapping("/my")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER_STOCK)
    public ResponseObject<ResponsePage<PriceAdjustmentResponse>> getMyAdjustments(
            Pageable pageable,
            @RequestParam(required = false) String status) {
        return ResponseObject.success(priceAdjustmentService.findMyAdjustments(pageable, status));
    }

    @GetMapping
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER_ADMIN_STOCK)
    public ResponseObject<ResponsePage<PriceAdjustmentResponse>> getAll(
            Pageable pageable,
            @RequestParam(required = false) String status) {
        return ResponseObject.success(priceAdjustmentService.findAll(pageable, status));
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER_ADMIN_STOCK)
    public ResponseObject<PriceAdjustmentResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(priceAdjustmentService.findOne(id));
    }

    @PostMapping
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER_STOCK)
    public ResponseObject<PriceAdjustmentResponse> create(@RequestBody CreatePriceAdjustmentRequest request) {
        return ResponseObject.created(priceAdjustmentService.create(request));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER_ADMIN_STOCK)
    public ResponseObject<PriceAdjustmentResponse> approve(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String note = body != null ? body.get("approvalNote") : null;
        return ResponseObject.success(priceAdjustmentService.approve(id, note));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER_ADMIN_STOCK)
    public ResponseObject<PriceAdjustmentResponse> reject(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String note = body != null ? body.get("approvalNote") : null;
        return ResponseObject.success(priceAdjustmentService.reject(id, note));
    }
}
