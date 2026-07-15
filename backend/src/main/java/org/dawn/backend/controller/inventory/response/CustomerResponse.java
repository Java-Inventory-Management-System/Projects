package org.dawn.backend.controller.inventory.response;

import java.time.Instant;

public record CustomerResponse(
        Long id,
        String name,
        String phone,
        String email,
        String address,
        String note,
        Boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {}
