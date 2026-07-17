package org.dawn.backend.controller.inventory;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.inventory.response.InventoryItemResponse;
import org.dawn.backend.service.inventory.InventoryService;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping("")
    @PreAuthorize(AuthorizationExpressions.ROLE_STOCK_MANAGER_ADMIN)
    public ResponseObject<ResponsePage<InventoryItemResponse>> getAll(
            Pageable pageable,
            @RequestParam(required = false) String search) {
        return ResponseObject.success(inventoryService.getInventory(pageable, search));
    }
}
