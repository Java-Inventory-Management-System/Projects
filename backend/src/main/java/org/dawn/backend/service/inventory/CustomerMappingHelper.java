package org.dawn.backend.service.inventory;

import org.dawn.backend.controller.inventory.response.CustomerResponse;
import org.dawn.backend.entity.inventory.Customer;

public interface CustomerMappingHelper {

    static CustomerResponse map(Customer customer) {
        return CustomerResponse.builder()
                .id(customer.getId())
                .name(customer.getName())
                .phone(customer.getPhone())
                .email(customer.getEmail())
                .address(customer.getAddress())
                .note(customer.getNote())
                .isActive(customer.getIsActive())
                .createdAt(customer.getCreatedAt())
                .updatedAt(customer.getUpdatedAt())
                .build();
    }
}
