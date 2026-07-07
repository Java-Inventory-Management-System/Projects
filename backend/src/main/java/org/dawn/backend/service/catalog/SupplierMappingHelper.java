package org.dawn.backend.service.catalog;

import org.dawn.backend.controller.catalog.response.SupplierResponse;
import org.dawn.backend.entity.catalog.Supplier;

public interface SupplierMappingHelper {

    static SupplierResponse map(Supplier s) {
        return SupplierResponse.builder()
                .id(s.getId())
                .name(s.getName())
                .contactPerson(s.getContactPerson())
                .phone(s.getPhone())
                .email(s.getEmail())
                .address(s.getAddress())
                .taxCode(s.getTaxCode())
                .note(s.getNote())
                .isActive(s.getIsActive())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }
}
