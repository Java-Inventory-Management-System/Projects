package org.dawn.backend.controller.inventory;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.config.web.response.ResponsePage;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.inventory.request.CancelWarrantyRequest;
import org.dawn.backend.controller.inventory.request.CompleteWarrantyRequest;
import org.dawn.backend.controller.inventory.request.CreateWarrantyRequest;
import org.dawn.backend.controller.inventory.request.ResolveWarrantyRequest;
import org.dawn.backend.controller.inventory.response.WarrantyLookupResponse;
import org.dawn.backend.controller.inventory.response.WarrantyRequestResponse;
import org.dawn.backend.service.inventory.WarrantyRequestService;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/warranty-request")
@RequiredArgsConstructor
public class WarrantyRequestController {

    private final WarrantyRequestService warrantyRequestService;

    @GetMapping("/lookup")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<WarrantyLookupResponse> lookup(@RequestParam String serialNumber) {
        return ResponseObject.success(warrantyRequestService.lookup(serialNumber));
    }

    @GetMapping
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<ResponsePage<WarrantyRequestResponse>> findAll(
            Pageable pageable,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String resolutionType) {
        return ResponseObject.success(warrantyRequestService.findAll(pageable, status, resolutionType));
    }

    @GetMapping("/my-handled")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<ResponsePage<WarrantyRequestResponse>> findMyHandled(Pageable pageable) {
        return ResponseObject.success(warrantyRequestService.findMyHandled(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<WarrantyRequestResponse> findOne(@PathVariable Long id) {
        return ResponseObject.success(warrantyRequestService.findOne(id));
    }

    @PostMapping
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE)
    public ResponseObject<WarrantyRequestResponse> create(@RequestBody CreateWarrantyRequest request) {
        return ResponseObject.created(warrantyRequestService.create(request));
    }

    @PutMapping("/{id}/resolve")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<WarrantyRequestResponse> resolve(
            @PathVariable Long id,
            @RequestBody ResolveWarrantyRequest request) {
        return ResponseObject.success(warrantyRequestService.resolve(id, request));
    }

    @PutMapping("/{id}/complete")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<WarrantyRequestResponse> complete(
            @PathVariable Long id,
            @RequestBody CompleteWarrantyRequest request) {
        return ResponseObject.success(warrantyRequestService.complete(id, request));
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize(AuthorizationExpressions.ROLE_MANAGER)
    public ResponseObject<WarrantyRequestResponse> cancel(
            @PathVariable Long id,
            @RequestBody CancelWarrantyRequest request) {
        return ResponseObject.success(warrantyRequestService.cancel(id, request));
    }
}
