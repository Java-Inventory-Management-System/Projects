package org.dawn.backend.controller.inventory;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.inventory.request.CreatePurchaseOrderRequest;
import org.dawn.backend.controller.inventory.response.PurchaseOrderResponse;
import org.dawn.backend.service.inventory.PurchaseOrderService;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/purchase-order")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    @GetMapping
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER_ADMIN)
    public ResponseObject<ResponsePage<PurchaseOrderResponse>> getAll(
            Pageable pageable,
            @RequestParam(required = false) String status) {
        return ResponseObject.success(purchaseOrderService.findAll(pageable, status));
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER_ADMIN)
    public ResponseObject<PurchaseOrderResponse> getOne(@PathVariable Long id) {
        return ResponseObject.success(purchaseOrderService.findOne(id));
    }

    @PostMapping
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER_ADMIN)
    public ResponseObject<PurchaseOrderResponse> create(@RequestBody CreatePurchaseOrderRequest request) {
        return ResponseObject.created(purchaseOrderService.create(request));
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER_ADMIN)
    public ResponseObject<PurchaseOrderResponse> cancel(@PathVariable Long id) {
        return ResponseObject.success(purchaseOrderService.cancel(id));
    }
}
