package org.dawn.backend.service.inventory;

import org.dawn.backend.controller.inventory.response.CustomerResponse;
import org.dawn.backend.entity.inventory.Customer;

public interface CustomerMappingHelper {

    static CustomerResponse map(Customer customer) {
        return new CustomerResponse(
                customer.getId(),
                customer.getName(),
                customer.getPhone(),
                customer.getEmail(),
                customer.getAddress(),
                customer.getNote(),
                customer.getIsActive(),
                customer.getCreatedAt(),
                customer.getUpdatedAt()
        );
    }
}
