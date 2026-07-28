package org.dawn.backend.service.inventory.warranty;

import org.dawn.backend.controller.inventory.response.WarrantyRequestResponse;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.Customer;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.entity.inventory.WarrantyRequest;

public interface WarrantyRequestMappingHelper {

    static WarrantyRequestResponse map(WarrantyRequest request,
                                       ProductUnit unit,
                                       Product product,
                                       Customer customer,
                                       ProductUnit replacementUnit,
                                       String handledByName) {
        return WarrantyRequestResponse.builder()
                .id(request.getId())
                .requestCode(request.getRequestCode())
                .productUnitId(request.getProductUnitId())
                .serialNumber(unit != null ? unit.getSerialNumber() : null)
                .productId(unit != null ? unit.getProductId() : null)
                .productName(product != null ? product.getName() : null)
                .productSku(product != null ? product.getSku() : null)
                .customerId(request.getCustomerId())
                .customerName(customer != null ? customer.getName() : null)
                .issueDescription(request.getIssueDescription())
                .resolutionType(request.getResolutionType())
                .replacementUnitId(request.getReplacementUnitId())
                .replacementSerialNumber(replacementUnit != null ? replacementUnit.getSerialNumber() : null)
                .rmaNumber(request.getRmaNumber())
                .sentToPartnerAt(request.getSentToPartnerAt())
                .expectedReturnAt(request.getExpectedReturnAt())
                .partnerNote(request.getPartnerNote())
                .status(request.getStatus().name())
                .handledBy(request.getHandledBy())
                .handledByName(handledByName)
                .completedAt(request.getCompletedAt())
                .note(request.getNote())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .build();
    }
}
