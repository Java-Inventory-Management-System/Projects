package org.dawn.backend.controller.inventory.request;

public record CreateWarrantyRequest(
        String serialNumber,
        Long customerId,
        String issueDescription,
        String note,
        Boolean allowExpired
) {}
