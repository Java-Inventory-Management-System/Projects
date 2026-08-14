package org.dawn.backend.controller.inventory;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.config.web.response.ResponseObject;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.constant.security.AuthorizationExpressions;
import org.dawn.backend.controller.inventory.response.DisposeConfirmResponse;
import org.dawn.backend.controller.inventory.response.QcUnitResponse;
import org.dawn.backend.service.inventory.returns.DisposeConfirmService;
import org.dawn.backend.service.inventory.returns.QcPassService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/qc-processing")
@RequiredArgsConstructor
public class QcProcessingController {

    private final QcPassService qcPassService;
    private final DisposeConfirmService disposeConfirmService;

    @GetMapping("")
    @PreAuthorize(AuthorizationExpressions.CAN_VIEW_QC)
    public ResponseObject<List<QcUnitResponse>> listUnits(
            @RequestParam(required = false) String statuses) {
        List<ProductUnitStatus> statusList = statuses == null || statuses.isBlank()
                ? List.of()
                : Arrays.stream(statuses.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .map(ProductUnitStatus::valueOf)
                        .toList();
        return ResponseObject.success(qcPassService.listQcUnits(statusList));
    }

    @PostMapping("/qc-pass")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<Void> qcPass(@RequestBody QcPassRequest request) {
        qcPassService.confirm(request.unitIds());
        return ResponseObject.success(null);
    }

    @PostMapping("/dispose-confirm")
    @PreAuthorize(AuthorizationExpressions.CAN_OPERATE_STOCK)
    public ResponseObject<DisposeConfirmResponse> disposeConfirm(@RequestBody DisposeConfirmRequest request) {
        DisposeConfirmResponse result = disposeConfirmService.confirm(request.unitIds(), request.action(), request.supplierId());
        return ResponseObject.success(result);
    }

    public record QcPassRequest(List<Long> unitIds) {
    }

    public record DisposeConfirmRequest(List<Long> unitIds, String action, Long supplierId) {
    }
}
